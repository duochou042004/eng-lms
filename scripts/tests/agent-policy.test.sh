#!/usr/bin/env bash
# scripts/hooks/agent-policy.sh: each rule allows a compliant call and denies a violating one (L-01), on a throwaway ledger.
source "$(dirname "$0")/lib.sh"
set -uo pipefail
HOOK="$ROOT/scripts/hooks/agent-policy.sh"
export ENGLMS_AGENT_POLICY_DIR; ENGLMS_AGENT_POLICY_DIR=$(mktemp -d)
trap 'rm -rf "${ENGLMS_AGENT_POLICY_DIR:?}"' EXIT
echo "agent-policy:"

# hook <json>: runs the hook; LAST_OUTPUT holds its stdout.
hook() { LAST_OUTPUT=$(printf '%s' "$1" | bash "$HOOK" 2>&1); }
agent() { printf '{"hook_event_name":"PreToolUse","session_id":"%s","tool_name":"Agent","tool_input":{"subagent_type":"%s","description":"%s","prompt":"%s"}}' "$1" "$2" "$3" "$4"; }
start() { printf '{"hook_event_name":"SubagentStart","session_id":"s1","agent_id":"%s","agent_type":"%s"}' "$1" "$2"; }
stop() { printf '{"hook_event_name":"SubagentStop","session_id":"s1","agent_id":"%s","agent_type":"%s"}' "$1" "$2"; }
allowed() { expect_output_not_contains '"deny"' "$1"; }
denied() { expect_output_contains "$2" "$1"; }

hook "$(agent s1 backend-implementer 'T-M2.7 BE' 'implement')"; allowed "a first implementer is allowed"
hook "$(start a1 backend-implementer)"
hook "$(agent s1 frontend-implementer 'T-M2.7 FE' 'implement')"; denied "R1: a second checkout-using agent while one runs is denied" "R1:"
hook "$(agent s1 frontend-implementer 'T-M2.7 FE' 'BUDGET-OVERRIDE: the PO asked for it right now')"; denied "R1 has no override" "R1:"
hook "$(agent s1 docs-reviewer 'T-M2.7 G0' 'review')"; allowed "a read-only reviewer may run beside it"
hook "$(stop a1 backend-implementer)"
hook "$(agent s1 frontend-implementer 'T-M2.7 FE' 'implement')"; allowed "after SubagentStop the next implementer is allowed"
hook "$(agent s1 docs-reviewer 'T-M2.7 G0 again' 'review')"; denied "R4: a second fresh reviewer of the same role and task is denied" "R4:"
hook "$(agent s2 docs-reviewer 'T-M2.7 G0 again' 'BUDGET-OVERRIDE: the first reviewer cannot be resumed (new device)')"; allowed "R4 override is allowed and logged"
expect_exit 0 "the override is in the ledger" -- grep -q $'\toverride\t' "$ENGLMS_AGENT_POLICY_DIR/ledger.tsv"
for i in 1 2 3; do hook "$(agent s1 Explore "look $i" 'search')"; done; allowed "spawns up to the session cap are allowed"
hook "$(agent s1 Explore 'look 4' 'search')"; denied "R3: a spawn over the session cap is denied" "R3:"
for i in 1 2 3 4 5; do hook "$(start "r$i" Explore)"; done
hook "$(agent s3 Explore 'look' 'BUDGET-OVERRIDE: five agents are running, testing R2 alone')"; allowed "an override passes R2"
hook "$(agent s3 Explore 'look' 'search')"; denied "R2: a spawn with 5 running is denied" "R2:"
wf() { jq -n --arg s "$1" '{hook_event_name:"PreToolUse",session_id:"s4",tool_name:"Workflow",tool_input:{script:$s}}'; }
hook "$(wf 'export const meta = {name: "x"}')"; denied "R5: a Workflow without '// agents: N' is denied" "R5:"
hook "$(wf $'// agents: 9\nexport const meta = {}')"; denied "R5: a Workflow over the cap is denied" "R5: 9"
hook "$(wf $'// agents: 3\nexport const meta = {}')"; allowed "a Workflow with 3 declared agents is allowed"
hook '{"hook_event_name":"SessionStart","session_id":"s1"}'; expect_output_contains 'additionalContext' "SessionStart injects the policy"
hook 'not json'; expect_exit 0 "malformed input fails open" -- true
finish
