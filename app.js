/* EdLumina registration form.
   Field definitions mirror the Google Form (entry IDs and option strings are exact, because
   Google rejects radio/checkbox values that don't match an option). */
(function () {
  "use strict";

  var GOOGLE_FORM_ACTION =
    "https://docs.google.com/forms/d/e/1FAIpQLSfPTaBer7fr1RsqartwBx4HNs1OWoX29X5MWq6ww-psYIf-YQ/formResponse";
  var PROGRAMS_URL = "https://edluminaexcellencecenter.com/#programs";
  var SUBMIT_TIMEOUT_MS = 20000;

  var text = function (name, entry, label, o) { return Object.assign({ type: "text", name: name, entry: entry, label: label, required: true }, o); };
  var opts = function (a) { return a.map(function (v) { return typeof v === "string" ? { value: v } : v; }); };

  var STEPS = [
    {
      title: "Parent / Guardian",
      sub: "Who should our team contact?",
      fields: [
        text("parent", "581631669", "Parent / Guardian Name", { autocomplete: "name", placeholder: "e.g. Lakshmi Reddy", min: 2 }),
        text("phone", "341443992", "WhatsApp / Mobile Number", { kind: "tel", autocomplete: "tel", placeholder: "10-digit mobile number", hint: "We'll use this to share batch and fee details." }),
        text("email", "711577352", "Email Address", { kind: "email", required: false, autocomplete: "email", placeholder: "name@example.com" }),
        text("location", "826228673", "Your Location / Area", { autocomplete: "address-level2", placeholder: "e.g. Kukatpally, KPHB, Miyapur", min: 2 }),
      ],
    },
    {
      title: "Child Details",
      sub: "A little about your child.",
      fields: [
        text("child", "197040805", "Child's Name", { placeholder: "Your child's full name", min: 2 }),
        { type: "radio", name: "age", entry: "88786527", label: "Child's Age", required: true, cols: 2,
          options: opts(["7–8 Years", "9–10 Years", "11–12 Years", "13–14 Years", "15–16 Years", "17–18 Years"]) },
        { type: "radio", name: "grade", entry: "1100014072", label: "Current Grade", required: true, cols: 3,
          options: opts(["Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]) },
        text("school", "636183633", "School Name", { placeholder: "Your child's school", min: 2 }),
      ],
    },
    {
      title: "Learning Interest",
      sub: "What would excite your child?",
      fields: [
        { type: "tiles", name: "interest", entry: "1738520879", label: "What would your child be most interested in learning?", required: true,
          hint: "Choose all that apply.",
          options: [
            { value: "Artificial Intelligence (AI)", tag: "AI", title: "Artificial Intelligence" },
            { value: "Robotics", tag: "ROBOTICS", title: "Build & Explore Robots" },
            { value: "Coding & Programming", tag: "CODING", title: "Coding & Programming" },
            { value: "STEM & Innovation", tag: "STEM", title: "STEM & Innovation" },
            { value: "Building Real Projects", tag: "PROJECTS", title: "Building Real Projects" },
            { value: "Not sure — Need Guidance", tag: "GUIDANCE", title: "Not sure — Need Guidance" },
          ] },
        { type: "radio", name: "experience", entry: "742791358", label: "Has your child participated in Coding, Robotics or AI programs before?", required: true,
          options: opts(["Yes, regularly", "Yes, a few times", "No, this would be their first experience", "Not sure"]) },
        { type: "textarea", name: "looking", entry: "796026228", label: "What are you mainly looking for for your child?", required: true, min: 3, max: 1000,
          placeholder: "e.g. building confidence, hands-on skills, preparing for future careers…" },
      ],
    },
    {
      title: "Program & Schedule",
      sub: "Choose what fits your family.",
      fields: [
        { type: "radio", name: "program", entry: "1612402667", label: "Which program would you prefer?", required: true,
          options: opts(["After-School Program", "Weekend Program", "Either — Based on Availability", "Not Sure — Please Suggest"]) },
        { type: "checkbox", name: "days", entry: "86517794", label: "Preferred Days", required: true, cols: 2, hint: "Choose all that apply.",
          options: opts(["Monday–Friday", "Sunday"]) },
        { type: "radio", name: "time", entry: "310165235", label: "Preferred Time", required: true,
          hint: "Weekday batches run after school; the Sunday option is for weekend batches.",
          options: opts(["After School – 4 PM to 6 PM", "Evening – 6 PM to 8 PM", "Sunday"]) },
        { type: "radio", name: "start", entry: "1575758133", label: "When are you planning to start?", required: true,
          options: opts(["Immediately", "Within 1–2 weeks", "Just exploring for now"]) },
      ],
    },
    {
      title: "Demo & Confirmation",
      sub: "Last step — almost done.",
      fields: [
        { type: "radio", name: "demo", entry: "1510953061", label: "Would you like to book a FREE Demo / Counselling Session?", required: true, cta: true,
          options: opts(["Yes, I would like to book. Please contact me with details", "I would like more information first"]) },
        { type: "textarea", name: "special", entry: "1159529347", label: "What makes your child special among a group of students?", required: true, min: 3, max: 1000,
          placeholder: "Their curiosity, a hobby, something they love building or asking about…" },
        { type: "checkbox", name: "confirm", entry: "1484795398", label: "Confirmation", required: true, confirm: true, srLabel: true,
          requiredMessage: "Please tick the box to confirm your details.",
          options: opts(["I confirm that the information provided above is accurate and is being submitted for registration purposes only."]) },
      ],
    },
  ];

  var ALL_FIELDS = STEPS.reduce(function (a, s) { return a.concat(s.fields); }, []);

  // ---------- validation ----------
  var cleanPhone = function (v) { return v.replace(/[\s\-().]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, ""); };
  function validate(f, v) {
    var isEmpty = Array.isArray(v) ? v.length === 0 : !String(v || "").trim();
    if (isEmpty) {
      if (!f.required) return "";
      if (f.requiredMessage) return f.requiredMessage;
      if (f.type === "radio" || f.type === "tiles" || f.type === "checkbox") return "Please choose an option.";
      return "This field is required.";
    }
    if (f.type === "text" || f.type === "textarea") {
      var s = String(v).trim();
      if (f.kind === "tel" && !/^[6-9]\d{9}$/.test(cleanPhone(s))) return "Enter a valid 10-digit mobile number.";
      if (f.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return "Enter a valid email address, e.g. name@example.com.";
      if (f.min && s.length < f.min) return "Please enter at least " + f.min + " characters.";
    }
    return "";
  }

  // ---------- state ----------
  var state = {};
  ALL_FIELDS.forEach(function (f) { state[f.name] = f.type === "checkbox" || f.type === "tiles" ? [] : ""; });
  var current = 0;
  var submitting = false;

  var $ = function (id) { return document.getElementById(id); };
  var form = $("form"), stepsEl = $("steps"), progressEl = $("progress");
  var errId = function (f) { return "err-" + f.name; };

  // ---------- rendering ----------
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var reqMark = function (f) { return f.required ? '<span class="req" aria-hidden="true">*</span>' : '<span class="opt">(optional)</span>'; };

  function renderChoice(f) {
    var multi = f.type !== "radio";
    var inputType = multi ? "checkbox" : "radio";
    var cls = "opts" + (f.type === "tiles" ? " tiles" : f.cols ? " opts--" + f.cols : "");
    var html = f.options.map(function (o, i) {
      var id = f.name + "-" + i;
      var inner = f.type === "tiles"
        ? '<span class="tag">' + esc(o.tag) + '</span><span class="opt-card__text">' + esc(o.title) + '</span><span class="mark mark--check">' + CHECK + '</span>'
        : '<span class="mark mark--' + (multi ? "check" : "radio") + '">' + CHECK + '</span><span class="opt-card__text">' + esc(o.value) + '</span>';
      return '<label class="opt-card' + (f.type === "tiles" ? " tile" : "") + '" for="' + id + '">' +
        '<input type="' + inputType + '" id="' + id + '" name="' + f.name + '" value="' + esc(o.value) + '">' +
        '<span class="opt-card__box">' + inner + '</span></label>';
    }).join("");
    var hint = f.hint ? '<p class="hint" id="hint-' + f.name + '">' + esc(f.hint) + "</p>" : "";
    return '<fieldset class="field' + (f.confirm ? " confirm" : "") + '" id="field-' + f.name + '" aria-describedby="' + (f.hint ? "hint-" + f.name + " " : "") + errId(f) + '">' +
      '<legend' + (f.srLabel ? ' class="sr"' : "") + '>' + (f.srLabel ? "" : esc(f.label) + " ") + reqMark(f) + "</legend>" + hint +
      '<div class="' + cls + '">' + html + "</div>" +
      '<p class="error" id="' + errId(f) + '" hidden></p></fieldset>';
  }

  function renderInput(f) {
    var id = "f-" + f.name;
    var common = ' id="' + id + '" name="' + f.name + '" aria-describedby="' + (f.hint ? "hint-" + f.name + " " : "") + errId(f) + '"' +
      (f.required ? ' aria-required="true"' : "") + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "");
    var control = f.type === "textarea"
      ? '<textarea class="textarea"' + common + ' rows="4" maxlength="' + (f.max || 1000) + '"></textarea>'
      : '<input class="input" type="' + (f.kind || "text") + '"' + common + (f.kind === "tel" ? ' inputmode="numeric"' : "") +
        (f.autocomplete ? ' autocomplete="' + f.autocomplete + '"' : "") + ' maxlength="120">';
    return '<div class="field" id="field-' + f.name + '"><label for="' + id + '">' + esc(f.label) + " " + reqMark(f) + "</label>" +
      (f.hint ? '<p class="hint" id="hint-' + f.name + '">' + esc(f.hint) + "</p>" : "") + control +
      '<p class="error" id="' + errId(f) + '" hidden></p></div>';
  }

  function renderStep(step, i) {
    var body = step.fields.map(function (f) {
      var h = f.type === "text" || f.type === "textarea" ? renderInput(f) : renderChoice(f);
      return f.cta ? '<div class="cta-box">' + h + "</div>" : h;
    }).join("");
    var twoUp = i === 0 || i === 1;
    return '<section class="step" id="step-' + i + '" data-step="' + i + '" hidden aria-labelledby="st-' + i + '">' +
      '<h3 class="step__title" id="st-' + i + '" tabindex="-1">' + esc(step.title) + "</h3>" +
      '<p class="step__sub">' + esc(step.sub) + "</p>" + body + "</section>";
  }

  function renderProgress() {
    var segs = STEPS.map(function (s, i) {
      return '<li class="' + (i < current ? "is-done" : i === current ? "is-current" : "") + '"></li>';
    }).join("");
    progressEl.innerHTML =
      '<ol class="progress__segs" role="progressbar" aria-valuemin="1" aria-valuemax="' + STEPS.length + '" aria-valuenow="' + (current + 1) + '" aria-valuetext="Step ' + (current + 1) + " of " + STEPS.length + ": " + esc(STEPS[current].title) + '">' + segs + "</ol>" +
      '<div class="progress__meta"><span>Step ' + (current + 1) + " of " + STEPS.length + "</span><b>" + esc(STEPS[current].title) + "</b></div>";
  }

  // ---------- field errors ----------
  function setError(f, msg) {
    var box = $("field-" + f.name), p = $(errId(f));
    box.classList.toggle("has-error", !!msg);
    p.hidden = !msg; p.textContent = msg || "";
    var controls = box.querySelectorAll("input, textarea");
    Array.prototype.forEach.call(controls, function (c) { if (msg) c.setAttribute("aria-invalid", "true"); else c.removeAttribute("aria-invalid"); });
  }
  function readValue(f) {
    if (f.type === "text" || f.type === "textarea") return $("f-" + f.name).value;
    var checked = Array.prototype.filter.call(form.querySelectorAll('input[name="' + f.name + '"]'), function (i) { return i.checked; })
      .map(function (i) { return i.value; });
    return f.type === "radio" ? checked[0] || "" : checked;
  }
  function sync(f) { state[f.name] = readValue(f); }

  function validateStep(i, focus) {
    var firstBad = null;
    STEPS[i].fields.forEach(function (f) {
      sync(f);
      var msg = validate(f, state[f.name]);
      setError(f, msg);
      if (msg && !firstBad) firstBad = f;
    });
    if (firstBad && focus) {
      var el = form.querySelector('#field-' + firstBad.name + " input, #field-" + firstBad.name + " textarea");
      if (el) { el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    }
    return !firstBad;
  }

  // ---------- navigation ----------
  function show(i, moveFocus) {
    current = i;
    Array.prototype.forEach.call(stepsEl.children, function (s, idx) { s.hidden = idx !== i; });
    $("back").hidden = i === 0;
    var last = i === STEPS.length - 1;
    $("nextLabel").textContent = last ? "Register Your Interest" : "Continue";
    renderProgress();
    if (moveFocus) {
      $("register").scrollIntoView({ behavior: "smooth", block: "start" });
      $("st-" + i).focus({ preventScroll: true });
    }
  }

  // ---------- submit ----------
  function banner(msg) { var b = $("banner"); b.hidden = !msg; b.textContent = msg || ""; }

  function buildPayload() {
    var fd = new FormData();
    ALL_FIELDS.forEach(function (f) {
      var v = state[f.name];
      var list = Array.isArray(v) ? v : [v];
      list.forEach(function (item) {
        if (item === "" || item == null) return;
        fd.append("entry." + f.entry, f.kind === "tel" ? cleanPhone(item) : String(item).trim());
      });
    });
    return fd;
  }

  /* Google Forms sends no CORS headers, so from the browser the response is opaque: we cannot read
     the HTTP status. Because every required field and option is validated against the form's exact
     values first, an accepted request means Google received it; a network/timeout error rejects, and
     we show an error instead of success. */
  function send() {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, SUBMIT_TIMEOUT_MS);
    return fetch(GOOGLE_FORM_ACTION, { method: "POST", mode: "no-cors", body: buildPayload(), signal: ctl.signal })
      .finally(function () { clearTimeout(t); });
  }

  function setSubmitting(on) {
    submitting = on;
    var btn = $("next");
    btn.disabled = on; $("back").disabled = on;
    btn.innerHTML = on ? '<span class="spin" aria-hidden="true"></span><span>Sending…</span>' : '<span id="nextLabel">Register Your Interest</span>';
  }

  function onSuccess() {
    $("flow").hidden = true;
    var s = $("success"); s.hidden = false;
    $("register").scrollIntoView({ behavior: "smooth", block: "start" });
    s.focus({ preventScroll: true });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitting) return;
    banner("");
    if (!validateStep(current, true)) return;
    if (current < STEPS.length - 1) { show(current + 1, true); return; }
    // final step: re-check everything so no earlier step can slip through
    for (var i = 0; i < STEPS.length - 1; i++) {
      if (!validateStep(i, false)) { show(i, true); banner("Please fix the highlighted fields to continue."); validateStep(i, true); return; }
    }
    setSubmitting(true);
    send().then(onSuccess, function () {
      setSubmitting(false);
      banner("We couldn't send your details. Please check your connection and try again, or call us on 8712443601.");
    });
  });

  $("back").addEventListener("click", function () { banner(""); if (current > 0) show(current - 1, true); });

  // live feedback: clear/validate as the user fixes a field
  form.addEventListener("input", function (e) { fieldEvent(e.target, false); });
  form.addEventListener("change", function (e) { fieldEvent(e.target, true); });
  form.addEventListener("focusout", function (e) { fieldEvent(e.target, true, true); });
  function fieldEvent(el, show, blurOnly) {
    if (!el.name) return;
    var f = ALL_FIELDS.filter(function (x) { return x.name === el.name; })[0];
    if (!f) return;
    if (blurOnly && f.type !== "text" && f.type !== "textarea") return;
    sync(f);
    var had = $("field-" + f.name).classList.contains("has-error");
    if (show || had) {
      if (blurOnly && !state[f.name] && !had) return; // don't nag on an untouched field
      setError(f, validate(f, state[f.name]));
    }
  }

  // ---------- init ----------
  stepsEl.innerHTML = STEPS.map(renderStep).join("");
  show(0, false);
})();
