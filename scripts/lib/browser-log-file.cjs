// T-M2.30 (c): preloaded by scripts/e2e-run.sh (NODE_OPTIONS --require) into every Node process of the Playwright run.
// playwright-core opens DEBUG_FILE with "w" when it loads, so each process (the runner, each worker, a restarted worker)
// gets its own file instead of truncating a shared one.
const { join } = require('node:path')
process.env.DEBUG_FILE = join(__dirname, '..', '..', 'e2e', 'browser-logs', `pw-${process.pid}.log`)
