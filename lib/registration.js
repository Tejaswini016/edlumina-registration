"use strict";
/* Validation and email rendering for the EdLumina registration form.
   Field names match the form in app.js exactly. Option strings are the Google Form's wording. */

const OPT = {
  age: ["7–8 Years", "9–10 Years", "11–12 Years", "13–14 Years", "15–16 Years", "17–18 Years"],
  grade: ["Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
  interest: ["Artificial Intelligence (AI)", "Robotics", "Coding & Programming", "STEM & Innovation", "Building Real Projects", "Not sure — Need Guidance"],
  experience: ["Yes, regularly", "Yes, a few times", "No, this would be their first experience", "Not sure"],
  program: ["After-School Program", "Weekend Program", "Either — Based on Availability", "Not Sure — Please Suggest"],
  days: ["Sunday"],
  start: ["Immediately", "Within 1–2 weeks", "Just exploring for now"],
  demo: ["Yes, I would like to book. Please contact me with details", "I would like more information first"],
  confirm: ["I confirm that the information provided above is accurate and is being submitted for registration purposes only."],
};

const FIELDS = [
  { name: "phone", type: "text", required: true, kind: "tel" },
  { name: "location", type: "text", required: true, min: 2, max: 120 },
  { name: "child", type: "text", required: true, min: 2, max: 120 },
  { name: "age", type: "single" },
  { name: "grade", type: "single" },
  { name: "school", type: "text", required: true, min: 2, max: 160 },
  { name: "interest", type: "multi" },
  { name: "experience", type: "single" },
  { name: "program", type: "single" },
  { name: "days", type: "multi" },
  { name: "start", type: "single" },
  { name: "demo", type: "single" },
  { name: "special", type: "text", required: false, min: 3, max: 1000 },
  { name: "confirm", type: "multi" },
];

const cleanPhone = (v) => v.replace(/[\s\-().]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, "");
const str = (v, max) =>
  String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

/** Returns { data } or { errors: { field: reason } }. */
function validate(body) {
  const data = {};
  const errors = {};
  for (const f of FIELDS) {
    const v = body[f.name];
    if (f.type === "text") {
      let s = str(v, f.max || 200);
      if (!s) {
        if (f.required) errors[f.name] = "required";
        data[f.name] = "";
        continue;
      }
      if (f.kind === "tel") {
        s = cleanPhone(s);
        if (!/^[6-9]\d{9}$/.test(s)) errors[f.name] = "invalid";
      } else if (f.kind === "email") {
        if (!/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/.test(s)) errors[f.name] = "invalid";
      } else if (f.min && s.length < f.min) errors[f.name] = "too short";
      data[f.name] = s;
    } else if (f.type === "single") {
      const s = str(v, 200);
      if (!OPT[f.name].includes(s)) errors[f.name] = "invalid";
      data[f.name] = s;
    } else {
      const arr = Array.isArray(v) ? v.map((x) => str(x, 200)) : [];
      const uniq = [...new Set(arr)];
      if (!uniq.length || !uniq.every((x) => OPT[f.name].includes(x))) errors[f.name] = "invalid";
      data[f.name] = uniq;
    }
  }
  return Object.keys(errors).length ? { errors } : { data };
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const val = (v) => (Array.isArray(v) ? v.join(", ") : v) || "—";

const SECTIONS = [
  ["Contact Details", [["Mobile", "phone"], ["Location", "location"]]],
  ["Child Details", [["Child Name", "child"], ["Age", "age"], ["Grade", "grade"], ["School", "school"]]],
  ["Learning Interests", [["Learning Interest", "interest"], ["Previous Experience", "experience"]]],
  ["Program Preferences", [["Preferred Program", "program"], ["Preferred Days", "days"], ["Expected Start", "start"]]],
  ["Demo / Counselling", [["Demo / Counselling Preference", "demo"]]],
  ["Additional Information", [["What makes the child special", "special"]]],
];

const submittedAt = (d = new Date()) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";

function renderEmail(d, when = submittedAt()) {
  const NAVY = "#071c3f", AMBER = "#e8a020", CREAM = "#f7f4ec", MUTED = "#5b6b82";
  const section = ([title, rows]) =>
    `<tr><td style="padding:22px 28px 6px"><div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9a5600;border-bottom:2px solid ${AMBER};padding-bottom:6px">${esc(title)}</div></td></tr>` +
    `<tr><td style="padding:4px 28px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    rows.map(([label, key]) =>
      `<tr><td style="padding:7px 12px 7px 0;width:38%;vertical-align:top;font-size:14px;font-weight:700;color:${NAVY}">${esc(label)}</td>` +
      `<td style="padding:7px 0;vertical-align:top;font-size:14px;color:${NAVY};white-space:pre-wrap">${esc(val(d[key]))}</td></tr>`).join("") +
    `</table></td></tr>`;
  const html =
    `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px"><tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border-radius:12px;overflow:hidden">` +
    `<tr><td style="background:${NAVY};padding:22px 28px"><div style="color:${AMBER};font-size:13px;font-weight:700;letter-spacing:.16em">EDLUMINA EXCELLENCE CENTRE</div>` +
    `<div style="color:#fff;font-size:22px;font-weight:700;margin-top:6px">New Registration / Demo Enquiry</div></td></tr>` +
    SECTIONS.map(section).join("") +
    `<tr><td style="padding:22px 28px 26px"><div style="background:${CREAM};border-radius:8px;padding:12px 14px;font-size:13px;color:${MUTED}">` +
    `Submission date &amp; time: <b style="color:${NAVY}">${esc(when)}</b><br>Parent confirmed that the information is accurate.</div></td></tr>` +
    `</table></td></tr></table></body></html>`;
  const text =
    "EDLUMINA EXCELLENCE CENTRE\nNew Registration / Demo Enquiry\n\n" +
    SECTIONS.map(([t, rows]) => `${t.toUpperCase()}\n` + rows.map(([l, k]) => `${l}: ${val(d[k])}`).join("\n")).join("\n\n") +
    `\n\nSubmission date & time: ${when}`;
  return { html, text };
}

module.exports = { validate, renderEmail, submittedAt, OPT };
