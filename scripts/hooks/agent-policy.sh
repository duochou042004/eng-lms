#!/usr/bin/env bash
# Agent orchestration policy hook (coding-agent-rules §11, DEC-205). One script for four Claude Code hook events:
#   SessionStart        → injects the policy summary and this session's counts as context
#   SubagentStart/Stop  → keeps the ledger (every subagent, from the Agent tool or a Workflow)
#   PreToolUse Agent    → denies a spawn that breaks a rule (R1..R4)
#   PreToolUse Workflow → denies a script without a declared agent count, or one over the cap (R5)
# Override for R2..R5: a line `BUDGET-OVERRIDE: <reason, ≥ 20 characters>` in the prompt or script; it is logged. R1 has no override
# (DEC-094: one checkout). Fails open on a hook error (a broken hook must never stop the LC), but says so on stderr.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/require-bash.sh"
set -uo pipefail

DIR="${ENGLMS_AGENT_POLICY_DIR:-${CLAUDE_PROJECT_DIR:-.}/.claude/scratch/agent-policy}"
MAX_CONCURRENT=5    # all running subagents
MAX_SESSION=6       # distinct subagents per session (a full task: BE, FE, SEC, QA, docs + 1 spare)
MAX_WORKFLOW=5      # declared agents per Workflow script
STALE_MIN=720       # a running entry older than this (12 h) is treated as ended (a crash without SubagentStop)
PENDING_MIN=10      # an allowed spawn that never started (refused prompt, error) frees its reservation after this
# Subagent types that build, run the app or write the tree: one at a time in the single checkout (DEC-094).
CHECKOUT_TYPES=' backend-implementer frontend-implementer qa-evaluator ux-reviewer security-reviewer general-purpose claude fork  '
REVIEWER_TYPES=' docs-reviewer qa-evaluator security-reviewer ux-reviewer '

input=$(cat) || exit 0
mkdir -p "$DIR/running" 2>/dev/null || { echo "agent-policy: cannot create $DIR (hook skipped)" >&2; exit 0; }
# One hook at a time: parallel Agent calls in one message run their PreToolUse hooks concurrently.
exec 9>"$DIR/lock" && flock -w 5 9 || echo "agent-policy: no lock (continuing)" >&2
LEDGER="$DIR/ledger.tsv"   # time  session  event  agent_id  type  task  note
j() { jq -r "$1 // empty" <<<"$input" 2>/dev/null; }
event=$(j .hook_event_name); session=$(j .session_id); now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
log() { printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$now" "$session" "$1" "$2" "$3" "$4" "$5" >>"$LEDGER"; }
deny() {
  log deny - "$1" "$2" "$3"
  jq -n --arg r "agent-policy (coding-agent-rules §11): $3" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}
find "$DIR/running" -type f -name 'pending-*' -mmin +"$PENDING_MIN" -delete 2>/dev/null
find "$DIR/running" -type f -mmin +"$STALE_MIN" -delete 2>/dev/null
running_count() { find "$DIR/running" -type f | wc -l; }
running_checkout() { cat "$DIR/running"/* 2>/dev/null | awk -v t="$CHECKOUT_TYPES" '{ if (index(t, " " $2 " ")) n++ } END { print n + 0 }'; }
# Fresh spawns this session: Agent calls plus the agents a Workflow declared (SendMessage resumes are free).
session_count() { awk -F'\t' -v s="$session" '$2 == s && $3 == "spawn" { n++ } $2 == s && $3 == "workflow" && $5 == "declared" { n += $6 } END { print n + 0 }' "$LEDGER" 2>/dev/null || echo 0; }
override() { grep -qE 'BUDGET-OVERRIDE: .{20,}' <<<"$1"; }
task_of() { grep -oE 'T-M[0-9]+\.[0-9]+' <<<"$1" | head -1; }

case "$event" in
  SessionStart)
    msg="Agent policy (coding-agent-rules §11, enforced by scripts/hooks/agent-policy.sh): do the work inline unless a subagent is clearly"
    msg+=" cheaper or required (independent review, a role the packet names); one checkout-using subagent at a time (DEC-094); at most"
    msg+=" $MAX_CONCURRENT running, $MAX_SESSION per session, $MAX_WORKFLOW per Workflow (declare '// agents: N'); resume a reviewer with"
    msg+=" SendMessage instead of a fresh one; re-verify only what changed. This session so far: $(session_count) subagents."
    jq -n --arg m "$msg" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$m}}'
    ;;
  SubagentStart)
    id=$(j .agent_id); type=$(j .agent_type)
    # The reservation its PreToolUse made becomes the running entry (the oldest of that type; Workflow agents have none).
    pending=$(grep -l " ${type:-unknown}\$" "$DIR/running"/pending-* 2>/dev/null | head -1)
    [[ -n "$pending" ]] && rm -f "$pending"
    [[ -n "$id" ]] && printf '%s %s\n' "$id" "${type:-unknown}" >"$DIR/running/$id"
    log start "$id" "${type:-unknown}" - -
    ;;
  SubagentStop)
    id=$(j .agent_id)
    [[ -n "$id" ]] && rm -f "$DIR/running/$id"
    log stop "$id" "$(j .agent_type)" - -
    ;;
  PreToolUse)
    tool=$(j .tool_name)
    if [[ "$tool" == Agent || "$tool" == Task ]]; then
      type=$(j .tool_input.subagent_type); type=${type:-general-purpose}
      text="$(j .tool_input.description) $(j .tool_input.prompt)"
      task=$(task_of "$text")
      # R1: one checkout-using subagent at a time (no override).
      if [[ "$CHECKOUT_TYPES" == *" $type "* ]] && (( $(running_checkout) > 0 )); then
        deny "$type" "$task" "R1: a checkout-using subagent is still running (DEC-094 one checkout): wait for it or resume it with SendMessage."
      fi
      if ! override "$text"; then
        (( $(running_count) >= MAX_CONCURRENT )) && deny "$type" "$task" "R2: $MAX_CONCURRENT subagents already running."
        (( $(session_count) >= MAX_SESSION )) && deny "$type" "$task" "R3: $MAX_SESSION subagents this session; do it inline, resume one, or add a BUDGET-OVERRIDE line."
        # R4: a second fresh reviewer of the same role for the same task (any session): resume the first one.
        if [[ -n "$task" && "$REVIEWER_TYPES" == *" $type "* ]] &&
          awk -F'\t' -v ty="$type" -v t="$task" '$3 == "spawn" && $5 == ty && $6 == t { f = 1 } END { exit !f }' "$LEDGER" 2>/dev/null; then
          deny "$type" "$task" "R4: a $type already reviewed $task; resume it with SendMessage (delta re-check), or add a BUDGET-OVERRIDE line if it cannot be resumed."
        fi
      else
        log override - "$type" "$task" "$(grep -oE 'BUDGET-OVERRIDE: .*' <<<"$text" | head -1 | cut -c1-200)"
      fi
      log spawn - "$type" "$task" "$(j .tool_input.description | cut -c1-80)"
      # Reserve the slot now, so a parallel call in the same message sees it before SubagentStart (R1, R2).
      printf 'pending %s\n' "$type" >"$DIR/running/pending-$(j .tool_use_id | tr -c 'A-Za-z0-9_-' _)$$"
    elif [[ "$tool" == Workflow ]]; then
      script=$(j .tool_input.script); path=$(j .tool_input.scriptPath)
      [[ -z "$script" && -n "$path" && -r "$path" ]] && script=$(cat "$path")
      # A saved Workflow by name: its script is not visible here (coding-agent-rules §11.8); logged only.
      [[ -z "$script" ]] && { log workflow - named - "$(j .tool_input.name)"; exit 0; }
      n=$(grep -oE '//[[:space:]]*agents:[[:space:]]*[0-9]+' <<<"$script" | grep -oE '[0-9]+$' | head -1)
      [[ -z "$n" ]] && deny workflow - "R5: declare the planned agent count in the script ('// agents: N', N ≤ $MAX_WORKFLOW)."
      if (( n > MAX_WORKFLOW )) && ! override "$script"; then
        deny workflow - "R5: $n agents declared; the cap is $MAX_WORKFLOW without a BUDGET-OVERRIDE line."
      fi
      log workflow - declared "$n" -
    fi
    ;;
esac
exit 0
