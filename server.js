"use strict";
/* EdLumina registration server (local): serves ./public and exposes POST /api/register.
   The form data is validated again here, then emailed through SMTP with Nodemailer.
   Settings are read from .env (see .env.example). Start with `npm start`. */

const path = require("path");
const express = require("express");
const { validate } = require("./lib/registration");
const { createMailer } = require("./lib/mailer");

const GENERIC = "Something went wrong while submitting your registration. Please try again.";
const OK = { success: true, message: "Registration submitted successfully." };

function createApp({ env = process.env, rateLimitMax = 5 } = {}) {
  const app = express();
  const mailer = createMailer(env);
  app.disable("x-powered-by");

  // Rate limit: 5 submissions per 10 minutes per IP (in memory, fine for a single local process).
  const hits = new Map();
  const rateLimited = (ip) => {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter((t) => now - t < 600000);
    list.push(now);
    hits.set(ip, list);
    if (hits.size > 2000) for (const [k, v] of hits) if (!v.some((t) => now - t < 600000)) hits.delete(k);
    return list.length > rateLimitMax;
  };

  const fail = (res, status, message, extra) => res.status(status).json({ success: false, message, ...extra });

  app.use((req, res, next) => {
    res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "DENY" });
    next();
  });

  app.post("/api/register", express.json({ limit: "20kb" }), async (req, res) => {
    res.set("Cache-Control", "no-store");

    // Only accept requests that come from our own site.
    const origin = req.get("origin");
    if (origin) {
      let same = false;
      try { same = new URL(origin).host === req.get("host"); } catch (e) { /* malformed origin */ }
      if (!same) return fail(res, 403, "Request not allowed.");
    }

    if (rateLimited(req.ip)) return fail(res, 429, "Too many submissions. Please try again in a few minutes.");

    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail(res, 400, "Invalid request.");

    // Honeypot: real visitors never fill this hidden field. Answer "success" so bots don't retry.
    if (body.website) return res.status(200).json(OK);

    const result = validate(body);
    if (result.errors) return fail(res, 400, "Please check the highlighted fields.", { fields: result.errors });

    if (!mailer.configured) {
      console.error("Email is not configured. Missing in .env: " + mailer.config.missing.join(", "));
      return fail(res, 500, GENERIC);
    }

    try {
      await mailer.sendRegistration(result.data);
      console.log(`Registration emailed for ${result.data.child}`);
      return res.status(200).json(OK);
    } catch (err) {
      console.error("Email sending failed: " + mailer.redact((err && err.code ? err.code + ": " : "") + (err && err.message)));
      return fail(res, 502, GENERIC);
    }
  });

  app.all("/api/register", (req, res) => { res.set("Allow", "POST"); fail(res, 405, "Method not allowed."); });

  // Malformed JSON and oversized bodies
  app.use((err, req, res, next) => {
    if (err && (err.type === "entity.parse.failed" || err.type === "entity.too.large")) return fail(res, 400, "Invalid request.");
    console.error("Unexpected error: " + mailer.redact(err && err.message));
    return fail(res, 500, GENERIC);
  });

  app.use(express.static(path.join(__dirname, "public")));
  app.use((req, res) => res.status(404).send("Not found"));

  return { app, mailer };
}

module.exports = { createApp };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const { app, mailer } = createApp();
  app.listen(port, () => {
    console.log(`EdLumina registration is running at http://localhost:${port}`);
    if (!mailer.configured) {
      console.warn("Email is NOT configured. Missing in .env: " + mailer.config.missing.join(", "));
      return;
    }
    const c = mailer.config;
    console.log(`SMTP: ${c.host}:${c.port} (secure=${c.secure}) as ${c.user} -> ${c.to.join(", ")}`);
    mailer.verify().then((r) => console.log(r.ok ? "SMTP login check: OK" : "SMTP login check FAILED: " + r.reason));
  });
}
