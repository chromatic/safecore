// Routes this isolated browser's loopback requests to the NEW checkout only.
// Does not alter the user's existing preview server or browser profile.
const {spawnSync} = require('node:child_process');
const path = require('node:path');
process.chdir(path.resolve(__dirname, '..'));
for (const name of ['browser', 'wallets', 'creation', 'recovery_ui', 'scanner_ui', 'send_picker_ui', 'send_max_ui', 'receive_picker_ui', 'activity_ui', 'live_ui', 'reporting_ui', 'delete_wallets', 'cache_ui', 'coins', 'icons', 'reset_ui']) {
  const result = spawnSync(process.execPath, [`whippet/tests/${name}.cjs`], {stdio: 'inherit'});
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
