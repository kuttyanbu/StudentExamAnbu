/* Admin page: load, validate and save settings */
(function () {
  const $ = id => document.getElementById(id);
  const cfg = getConfig();
  ['name', 'instructions', 'formUrl', 'duration', 'password', 'start', 'end', 'maxViolations', 'action', 'graceSeconds'].forEach(k => $(k).value = cfg[k]);
  $('fullscreen').checked = !!cfg.fullscreen;
  $('tabDetect').checked = !!cfg.tabDetect;
  $('autoFinish').checked = !!cfg.autoFinish;
  const studentLink = () => new URL('index.html', location.href).href;
  $('open').href = studentLink();

  $('cfgForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('ok').textContent = '';
    const out = {
      name: $('name').value.trim(), instructions: $('instructions').value.trim(), formUrl: $('formUrl').value.trim(),
      password: $('password').value,
      duration: parseInt($('duration').value, 10), start: $('start').value, end: $('end').value,
      fullscreen: $('fullscreen').checked, tabDetect: $('tabDetect').checked, autoFinish: $('autoFinish').checked,
      maxViolations: parseInt($('maxViolations').value, 10), action: $('action').value,
      graceSeconds: parseInt($('graceSeconds').value, 10)
    };
    let err = '';
    if (!out.name) err = 'Enter an examination name.';
    else if (!isGoogleFormUrl(out.formUrl)) err = 'Enter a valid https://docs.google.com/forms/… URL.';
    else if (!out.password) err = 'Set the shared examination password for students.';
    else if (!(out.duration >= 1)) err = 'Duration must be at least 1 minute.';
    else if (!(out.maxViolations >= 1)) err = 'Maximum violations must be at least 1.';
    else if (!(out.graceSeconds >= 0)) err = 'Grace period must be 0 or more seconds.';
    else if (out.start && out.end && new Date(out.end) <= new Date(out.start)) err = 'End time must be after start time.';
    $('err').textContent = err;
    if (err) return;
    out.formUrl = embedUrl(out.formUrl);
    $('formUrl').value = out.formUrl;
    save(KEYS.cfg, out);
    $('ok').textContent = 'Settings saved in this browser.';
  });
  const say = (okMsg, failMsg, p) => p.then(() => $('ok').textContent = okMsg, () => $('ok').textContent = failMsg);
  $('copy').addEventListener('click', function () {
    const t = studentLink();
    say('Copied: ' + t, 'Student link: ' + t, navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject());
  });
  $('export').addEventListener('click', function () {
    const txt = 'const DEFAULTS = ' + JSON.stringify(getConfig(), null, 2) + ';';
    say('Copied. Replace the DEFAULTS object in script.js with it.', 'Copy failed. Open the browser console and run: copy(JSON.stringify(JSON.parse(localStorage.smartexam_config)))', navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject());
  });
  $('reset').addEventListener('click', function () {
    if (!confirm('Delete saved student, timer, violation and completed-exam data in this browser?')) return;
    [KEYS.sess, KEYS.stu, KEYS.done].forEach(k => localStorage.removeItem(k));
    $('ok').textContent = 'Exam session and completion records cleared.';
  });
})();
