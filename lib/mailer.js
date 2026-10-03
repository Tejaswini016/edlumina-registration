"use strict";
/* SMTP mailer built on Nodemailer. All settings come from environment variables (.env), never from the browser:
     SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EDLUMINA_RECEIVER_EMAIL */

const nodemailer = require("nodemailer");
const { renderEmail } = require("./registration");

const REQUIRED = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EDLUMINA_RECEIVER_EMAIL"];

function readConfig(env) {
  const port = Number(env.SMTP_PORT) || 465;
  const secure = env.SMTP_SECURE == null || env.SMTP_SECURE === "" ? port === 465 : /^(true|1|yes)$/i.test(String(env.SMTP_SECURE).trim());
  return {
    missing: REQUIRED.filter((k) => !String(env[k] || "").trim()),
    host: String(env.SMTP_HOST || "").trim(),
    port,
    secure,
    user: String(env.SMTP_USER || "").trim(),
    pass: String(env.SMTP_PASS || ""),
    to: String(env.EDLUMINA_RECEIVER_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

function createMailer(env = process.env) {
  const config = readConfig(env);

  // Never let the SMTP password reach logs or responses, even if a library echoes it back.
  const redact = (m) => {
    let s = String(m == null ? "" : m);
    if (config.pass) {
      for (const secret of [config.pass, Buffer.from(config.pass).toString("base64")]) s = s.split(secret).join("[redacted]");
    }
    return s;
  };

  let transporter = null;
  const getTransporter = () => {
    transporter = transporter || nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    return transporter;
  };

  return {
    config,
    redact,
    configured: config.missing.length === 0,

    /** Checks the SMTP login without sending anything. Resolves { ok, reason }. */
    async verify() {
      if (config.missing.length) return { ok: false, reason: "Missing in .env: " + config.missing.join(", ") };
      try {
        await getTransporter().verify();
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: redact((err && err.code ? err.code + ": " : "") + (err && err.message)) };
      }
    },

    /** Emails one registration. Throws if the SMTP server does not accept it. */
    async sendRegistration(d) {
      const { html, text } = renderEmail(d);
      const mail = {
        from: { name: "EdLumina Excellence Centre", address: config.user }, // the authenticated SMTP account
        to: config.to,
        subject: `New EdLumina Excellence Centre Registration – ${d.child}`.replace(/[\r\n]+/g, " "),
        text,
        html,
      };
      if (d.email) mail.replyTo = d.email;
      const info = await getTransporter().sendMail(mail);
      if (!info.accepted || info.accepted.length === 0) throw new Error("SMTP server accepted no recipients");
      return info;
    },
  };
}

module.exports = { createMailer, readConfig };
