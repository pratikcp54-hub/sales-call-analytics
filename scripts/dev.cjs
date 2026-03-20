/**
 * Runs `next dev` with a clean env so npm/node-gyp's `npm_config_devdir` does not
 * trigger: npm warn Unknown env config "devdir".
 * Forwards extra args: npm run dev -- -p 3005
 */
const { spawnSync } = require("child_process");
const path = require("path");

const env = { ...process.env };
delete env.npm_config_devdir;
delete env.NPM_CONFIG_DEVDIR;

const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const extra = process.argv.slice(2);
const r = spawnSync(process.execPath, [nextBin, "dev", ...extra], {
  env,
  stdio: "inherit",
  windowsHide: true,
});

process.exit(r.status === null ? 1 : r.status);
