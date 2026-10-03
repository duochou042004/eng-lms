#!/bin/sh
# Part of `pnpm lint` (T-M1.16 item 5): no eslint-disable / oxlint-disable directive outside src/lib/api. oxlint honours
# both forms, and its only candidate rule (no-warning-comments) is silenced by the very comment it reports (a file-wide
# block directive), so this is a grep. Anchored on the directive forms: the directive right after a comment opener
# (line, block or JSX comment), or at the start of a block-comment line; the word "disable" in prose does not match.
hits=$(grep -rnE \
  --include='*.ts' --include='*.tsx' --include='*.mts' --include='*.cts' \
  --include='*.js' --include='*.jsx' --include='*.mjs' --include='*.cjs' \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage \
  '(^|//|/\*)[[:space:]*]*(eslint|oxlint)-disable' . | grep -v '^\./src/lib/api/')
if [ -n "$hits" ]; then
  printf '%s\n' "$hits"
  echo "no-lint-directives: lint-disable directives are not allowed outside src/lib/api; fix the code instead" >&2
  exit 1
fi
