const test = require("node:test"), assert = require("node:assert"), http = require("http"), { spawn } = require("child_process"), path = require("path");
const start = (env) => new Promise(res => { const p = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env: { ...process.env, ANTHROPIC_API_KEY: "", ...env } }); p.stdout.once("data", () => res(p)) });
const post = (port, body) => fetch(`http://localhost:${port}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
test("no key: health says ai=false, chat returns 503, static served, traversal blocked", async () => {
  const p = await start({ PORT: "5291" }); try {
    assert.deepStrictEqual(await (await fetch("http://localhost:5291/api/health")).json(), { ok: true, ai: false });
    assert.strictEqual((await post(5291, { messages: [{ role: "user", content: "hi" }] })).status, 503);
    assert.strictEqual((await post(5291, { messages: [] })).status, 400);
    assert.match(await (await fetch("http://localhost:5291/")).text(), /CVPILOT/);
    const t = await fetch("http://localhost:5291/..%2Fserver.js"); assert.ok([403, 404].includes(t.status)); assert.ok(!(await t.text()).includes("AbortSignal"));
  } finally { p.kill() } });
test("with key: proxies to upstream, key stays server-side, CORS only for allowed origin", async () => {
  let seen; const up = http.createServer((q, s) => { let b = ""; q.on("data", c => b += c); q.on("end", () => { seen = { key: q.headers["x-api-key"], body: JSON.parse(b) }; s.writeHead(200, { "content-type": "application/json" }); s.end(JSON.stringify({ content: [{ type: "text", text: "mock reply" }] })) }) });
  await new Promise(r => up.listen(5292, r));
  const p = await start({ PORT: "5293", ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: "http://localhost:5292", CORS_ORIGIN: "http://localhost:5173" }); try {
    const r = await fetch("http://localhost:5293/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" }, body: JSON.stringify({ messages: [{ role: "user", content: "mera score?" }], context: { score: 40 } }) });
    assert.strictEqual((await r.json()).text, "mock reply"); assert.strictEqual(r.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.strictEqual(seen.key, "test-key"); assert.match(seen.body.system, /Never invent/); assert.match(seen.body.system, /"score":40/);
    const r2 = await fetch("http://localhost:5293/api/health", { headers: { Origin: "http://evil.example" } }); assert.strictEqual(r2.headers.get("access-control-allow-origin"), null);
  } finally { p.kill(); up.close() } });
