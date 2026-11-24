// "Build": validates every script parses, checks index.html references, copies public/ to dist/.
const fs = require("fs"), path = require("path"), vm = require("vm");
const pub = path.join(__dirname, "..", "public"), dist = path.join(__dirname, "..", "dist");
let bad = 0;
for (const f of fs.readdirSync(pub).filter(f => f.endsWith(".js"))) {
  try { new vm.Script(fs.readFileSync(path.join(pub, f), "utf8"), { filename: f }); console.log("ok   ", f) } catch (e) { bad++; console.error("FAIL ", f, e.message) }
}
const html = fs.readFileSync(path.join(pub, "index.html"), "utf8");
for (const m of html.matchAll(/<script src="([^"h][^"]*)"/g)) if (!fs.existsSync(path.join(pub, m[1]))) { bad++; console.error("MISSING", m[1]) }
if (bad) process.exit(1);
fs.rmSync(dist, { recursive: true, force: true }); fs.cpSync(pub, dist, { recursive: true });
console.log("Build OK -> dist/ (serve with: PUBLIC_DIR=dist npm start)");
