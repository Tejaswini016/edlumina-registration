# EdLumina registration (runs locally)

Landing page and multi-step registration form for EdLumina Excellence Centre. Each submission is emailed to the
centre through SMTP. The form collects the child's details, the contact number and location, interests, program, Sunday preference and start date.

```
Browser form (public/)  ->  POST /api/register (server.js, Express)  ->  Nodemailer  ->  SMTP server  ->  EdLumina inbox
```

- `public/`: the static site (HTML, CSS, JS, logo). No secrets live here.
- `server.js`: Express server. Serves `public/` and handles `POST /api/register` (validation, honeypot, rate limit).
- `lib/mailer.js`: Nodemailer + SMTP setup, reading settings from `.env`.
- `lib/registration.js`: validation rules and the HTML email template.
- `test/run.js`: automated tests (`npm test`).

The success screen is shown only after the SMTP server has accepted the email.

## Settings (`.env`)

| Variable | Meaning |
|---|---|
| `SMTP_HOST` | SMTP server, e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `465` (SSL) or `587` (STARTTLS) |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `SMTP_USER` | the mailbox that sends the email (also the "From" address) |
| `SMTP_PASS` | its password. For Gmail / Google Workspace use an **App Password**, not the normal password |
| `EDLUMINA_RECEIVER_EMAIL` | where registrations are delivered. Comma-separate for several inboxes |

`.env` is git-ignored. Never commit it. `.env.example` has placeholders only.

## Test it on your computer

1. **Create `.env`:** copy `.env.example` to `.env` (Windows: `copy .env.example .env`).
2. **Add the SMTP settings** to `.env` (Gmail: host `smtp.gmail.com`, port `465`, secure `true`, user = the Gmail
   address, pass = a 16-character App Password from Google Account > Security > 2-Step Verification > App passwords).
3. `npm install`
4. `npm test` (24 checks; uses a local fake SMTP server, no real email, no `.env` needed)
5. `npm start` (or `npm run dev` to restart automatically on code changes)
6. Watch the terminal. It prints the SMTP target and `SMTP login check: OK` (or the reason it failed).
7. Open http://localhost:3000 in the browser.
8. Fill in the form and click **Register Your Interest**.
9. The terminal prints `Registration emailed for <child name>`. A failure prints the reason (never the password).
10. Check the receiver inbox (and spam) for "New EdLumina Excellence Centre Registration – <child>".
11. The form no longer collects an email address, so the email has no Reply-To. Call or WhatsApp the number shown in the email.
12. **Test bad credentials:** change `SMTP_PASS` in `.env`, restart, submit the form.
13. The page must show "Something went wrong while submitting your registration. Please try again." and **not** the
    success screen. The terminal shows `EAUTH`. Put the right password back and restart.

## Change the receiver email later

Edit `EDLUMINA_RECEIVER_EMAIL` in `.env` and restart the server (`Ctrl+C`, then `npm start`).

## Notes

- The rate limit (5 submissions per 10 minutes per IP) is kept in memory and resets when the server restarts.
- Submissions are only emailed. They are not stored anywhere else.
- The server must be running for the form to work. Opening `public/index.html` directly will not submit.
