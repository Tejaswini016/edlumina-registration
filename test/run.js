"use strict";
/* Integration tests: the real Express app + real Nodemailer talk to a tiny SMTP server started on localhost.
   No real email is sent and no .env is needed. Usage: npm test */

const net = require("net");
const assert = require("assert");
const { createApp } = require("../server");

// ---------- minimal SMTP server that records what it receives ----------
function startFakeSmtp({ user, pass }) {
  const state = { messages: [], authAttempts: 0, authOk: 0 };
  const server = net.createServer((sock) => {
    let mode = "cmd", data = "", authUser = "", buf = "", from = "", rcpt = [];
    const send = (s) => sock.write(s + "\r\n");
    const finishAuth = (u, p) => { state.authAttempts++; if (u === user && p === pass) { state.authOk++; send("235 2.7.0 Authentication successful"); } else send("535 5.7.8 Authentication failed"); };
    send("220 fake.smtp ESMTP");
    sock.on("data", (chunk) => {
      buf += chunk.toString("latin1");
      for (;;) {
        if (mode === "data") {
          const end = buf.indexOf("\r\n.\r\n");
          if (end === -1) return;
          data = buf.slice(0, end); buf = buf.slice(end + 5);
          state.messages.push({ raw: Buffer.from(data, "latin1").toString("utf8"), from, rcpt });
          mode = "cmd"; send("250 2.0.0 queued"); continue;
        }
        const i = buf.indexOf("\r\n");
        if (i === -1) return;
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (mode === "authplain") { mode = "cmd"; const [, u, p] = Buffer.from(line, "base64").toString().split("\0"); finishAuth(u, p); continue; }
        if (mode === "authuser") { authUser = Buffer.from(line, "base64").toString(); mode = "authpass"; send("334 UGFzc3dvcmQ6"); continue; }
        if (mode === "authpass") { mode = "cmd"; finishAuth(authUser, Buffer.from(line, "base64").toString()); continue; }
        const cmd = line.toUpperCase();
        if (cmd.startsWith("EHLO") || cmd.startsWith("HELO")) send("250-fake.smtp\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME");
        else if (cmd.startsWith("AUTH PLAIN ")) { const [, u, p] = Buffer.from(line.slice(11), "base64").toString().split("\0"); finishAuth(u, p); }
        else if (cmd === "AUTH PLAIN") { mode = "authplain"; send("334 "); }
        else if (cmd.startsWith("AUTH LOGIN")) { mode = "authuser"; send("334 VXNlcm5hbWU6"); }
        else if (cmd.startsWith("MAIL FROM")) { from = line.slice(10); rcpt = []; send("250 OK"); }
        else if (cmd.startsWith("RCPT TO")) { rcpt.push(line.slice(8)); send("250 OK"); }
        else if (cmd === "DATA") { mode = "data"; send("354 go ahead"); }
        else if (cmd === "QUIT") { send("221 bye"); sock.end(); }
        else send("250 OK");
      }
    });
    sock.on("error", () => {});
  });
  return new Promise((res) => server.listen(0, "127.0.0.1", () => res({ server, state, port: server.address().port })));
}

// ---------- helpers ----------
const SMTP_USER = "sender@example.com", SMTP_PASS = "Sup3r-Secret-Pass!";
const decodeWords = (s) => s.replace(/=\?UTF-8\?([BQ])\?([^?]*)\?=/gi, (m, enc, t) =>
  enc.toUpperCase() === "B" ? Buffer.from(t, "base64").toString("utf8")
    : Buffer.from(t.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (x, h) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8"));
function parseMessage(raw) {
  const [head, ...rest] = raw.split("\r\n\r\n");
  const headers = {};
  head.replace(/\r\n[ \t]+/g, " ").replace(/\?=\s+=\?UTF-8\?/gi, "?==?UTF-8?").split("\r\n").forEach((l) => { const k = l.indexOf(":"); headers[l.slice(0, k).toLowerCase()] = decodeWords(l.slice(k + 1).trim()); });
  const body = rest.join("\r\n\r\n");
  const decoded = body.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
  const hi = decoded.search(/Content-Type: text\/html/i);
  const CRLF = String.fromCharCode(13, 10);
  const html = hi === -1 ? "" : decoded.slice(hi).split(CRLF + CRLF).slice(1).join(CRLF + CRLF).split(CRLF + "--")[0];
  return { headers, body: decoded, html };
}

const GOOD = {
  phone: "+91 98765 43210", location: "Kukatpally",
  child: "Test Student", age: "11–12 Years", grade: "Grade 6", school: "Test School",
  interest: ["Robotics"], experience: "Not sure",
  program: "Weekend Program", days: ["Sunday"], start: "Immediately",
  demo: "Yes, I would like to book. Please contact me with details", special: "Very curious",
  confirm: ["I confirm that the information provided above is accurate and is being submitted for registration purposes only."],
  website: "",
};

const results = [];
const t = async (name, fn) => { try { await fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", `${name} -> ${e.message}`]); } };

(async () => {
  const smtp = await startFakeSmtp({ user: SMTP_USER, pass: SMTP_PASS });
  const goodEnv = { SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.port), SMTP_SECURE: "false", SMTP_USER, SMTP_PASS, EDLUMINA_RECEIVER_EMAIL: "inbox@example.com" };

  const logged = [];
  const origErr = console.error, origLog = console.log;
  console.error = (...a) => logged.push(a.join(" "));
  console.log = () => {};

  async function boot(env, opts = {}) {
    const { app, mailer } = createApp({ env, rateLimitMax: 1000, ...opts });
    const srv = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
    const base = `http://127.0.0.1:${srv.address().port}`;
    const post = (body, headers = {}, raw) => fetch(base + "/api/register", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: raw !== undefined ? raw : JSON.stringify(body) })
      .then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
    return { srv, base, post, mailer };
  }

  const a = await boot(goodEnv);

  await t("valid submission -> 200 success", async () => {
    const r = await a.post(GOOD);
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(r.json, { success: true, message: "Registration submitted successfully." });
    assert.strictEqual(smtp.state.messages.length, 1);
  });
  const msg = () => parseMessage(smtp.state.messages[smtp.state.messages.length - 1].raw);
  await t("SMTP login used the .env credentials", () => assert.strictEqual(smtp.state.authOk >= 1, true));
  await t("From is the authenticated SMTP account", () => {
    assert(msg().headers.from.includes("EdLumina Excellence Centre") && msg().headers.from.includes("<sender@example.com>"), msg().headers.from);
    assert(smtp.state.messages[0].from.includes("sender@example.com"));
  });
  await t("To is EDLUMINA_RECEIVER_EMAIL", () => {
    assert.strictEqual(msg().headers.to, "inbox@example.com");
    assert(smtp.state.messages[0].rcpt.join().includes("inbox@example.com"));
  });
  await t("no Reply-To header (no email address is collected any more)", () => assert.strictEqual(msg().headers["reply-to"], undefined));
  await t("subject is 'New EdLumina Excellence Centre Registration – Test Student'", () =>
    assert.strictEqual(msg().headers.subject, "New EdLumina Excellence Centre Registration – Test Student"));
  await t("HTML email has header, all 6 sections, values and timestamp", () => {
    const b = msg().body;
    for (const s of ["EDLUMINA EXCELLENCE CENTRE", "New Registration / Demo Enquiry", "Contact Details", "Child Details", "Learning Interests",
      "Program Preferences", "Demo / Counselling", "Additional Information", "Submission date", "IST", "9876543210", "Test Student", "Grade 6", "Test School", "Weekend Program", "Very curious"])
      assert(b.includes(s), "missing: " + s);
  });
  await t("SMTP password is not in the email", () => {
    assert(!smtp.state.messages[0].raw.includes(SMTP_PASS));
  });
  await t("removed questions are gone from the email and ignored if sent", async () => {
    await a.post({ ...GOOD, parent: "Old Parent", email: "old@example.com", looking: "Old text", time: "Sunday" });
    const b = msg().body;
    for (const s of ["Parent Name", "Parent Requirement", "Preferred Time", "Old Parent", "old@example.com", "Old text"]) assert(!b.includes(s), "still present: " + s);
    assert.strictEqual(msg().headers["reply-to"], undefined);
  });
  await t("Monday–Friday is no longer accepted for Preferred Days", async () => {
    const r = await a.post({ ...GOOD, days: ["Monday–Friday"] });
    assert.strictEqual(r.status, 400); assert(r.json.fields.days);
  });
  await t("HTML in user input is escaped", async () => {
    await a.post({ ...GOOD, child: "<script>alert(1)</script>", special: "<img src=x onerror=alert(1)>" });
    const b = msg().html;
    assert(b.length > 500, "html part not found");
    assert(!b.includes("<script>") && !b.includes("<img"));
    assert(b.includes("&lt;script&gt;"));
  });
  await t("newline in child name cannot inject headers", async () => {
    await a.post({ ...GOOD, child: "Aarav\r\nBcc: evil@x.com" });
    assert.strictEqual(msg().headers.bcc, undefined);
    assert(!/[\r\n]/.test(msg().headers.subject));
  });
  await t("invalid input -> 400 and no email", async () => {
    const before = smtp.state.messages.length;
    for (const b of [{ ...GOOD, phone: "123" }, { ...GOOD, grade: "Grade 99" }, { ...GOOD, confirm: [] }, { ...GOOD, interest: [] }, {}]) {
      const r = await a.post(b);
      assert.strictEqual(r.status, 400); assert.strictEqual(r.json.success, false);
    }
    assert.strictEqual(smtp.state.messages.length, before);
  });
  await t("every required field is enforced", async () => {
    for (const k of ["phone", "location", "child", "age", "grade", "school", "interest", "experience", "program", "days", "start", "demo", "special", "confirm"]) {
      const b = { ...GOOD }; delete b[k];
      const r = await a.post(b);
      assert.strictEqual(r.status, 400, k + " not enforced");
      assert(r.json.fields[k], k + " not flagged");
    }
  });
  await t("malformed JSON -> 400", async () => assert.strictEqual((await a.post(null, {}, "{not json")).status, 400));
  await t("honeypot -> fake success, no email", async () => {
    const before = smtp.state.messages.length;
    const r = await a.post({ ...GOOD, website: "http://spam" });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(smtp.state.messages.length, before);
  });
  await t("foreign Origin -> 403", async () => assert.strictEqual((await a.post(GOOD, { Origin: "https://evil.example" })).status, 403));
  await t("GET /api/register -> 405", async () => assert.strictEqual((await fetch(a.base + "/api/register")).status, 405));
  await t("page and assets are served; server files are not", async () => {
    assert.strictEqual((await fetch(a.base + "/")).status, 200);
    assert.strictEqual((await fetch(a.base + "/styles.css")).status, 200);
    assert.strictEqual((await fetch(a.base + "/assets/edlumina-logo.png")).status, 200);
    for (const p of ["/server.js", "/package.json", "/.env", "/lib/mailer.js"]) assert.strictEqual((await fetch(a.base + p)).status, 404, p);
  });
  await t("rate limit: 6th request from one IP -> 429", async () => {
    const b = await boot(goodEnv, { rateLimitMax: 5 });
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await b.post(GOOD)).status);
    assert.deepStrictEqual(codes, [200, 200, 200, 200, 200, 429]);
    b.srv.close();
  });

  // ---- failure paths: the frontend must get an error, never a fake success ----
  await t("WRONG SMTP password -> 502 generic error, password not leaked", async () => {
    const b = await boot({ ...goodEnv, SMTP_PASS: "wrong-password-123" });
    const before = smtp.state.messages.length;
    logged.length = 0;
    const r = await b.post(GOOD);
    assert.strictEqual(r.status, 502);
    assert.strictEqual(r.json.success, false);
    assert.strictEqual(r.json.message, "Something went wrong while submitting your registration. Please try again.");
    assert.strictEqual(smtp.state.messages.length, before);
    const everything = JSON.stringify(r.json) + logged.join("\n");
    assert(!everything.includes("wrong-password-123"), "password leaked");
    assert(logged.some((l) => l.includes("EAUTH")), "server log should name the auth failure");
    b.srv.close();
  });
  await t("SMTP server unreachable -> 502 generic error", async () => {
    const b = await boot({ ...goodEnv, SMTP_PORT: "1" });
    const r = await b.post(GOOD);
    assert.strictEqual(r.status, 502);
    assert.strictEqual(r.json.success, false);
    b.srv.close();
  });
  await t("verify() reports a bad login without sending", async () => {
    const b = await boot({ ...goodEnv, SMTP_PASS: "wrong-password-123" });
    const v = await b.mailer.verify();
    assert.strictEqual(v.ok, false);
    assert(!v.reason.includes("wrong-password-123"));
    b.srv.close();
  });
  await t("missing .env values -> 500 generic error, nothing sent", async () => {
    const b = await boot({});
    const before = smtp.state.messages.length;
    const r = await b.post(GOOD);
    assert.strictEqual(r.status, 500);
    assert.strictEqual(r.json.success, false);
    assert(!JSON.stringify(r.json).includes("SMTP"));
    assert.strictEqual(smtp.state.messages.length, before);
    b.srv.close();
  });

  console.error = origErr; console.log = origLog;
  a.srv.close(); smtp.server.close();
  let bad = 0;
  for (const [s, n] of results) { console.log(s, n); if (s === "FAIL") bad++; }
  console.log(`\n${results.length - bad}/${results.length} passed`);
  process.exit(bad ? 1 : 0);
})();
