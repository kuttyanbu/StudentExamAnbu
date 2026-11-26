/* Exam page: fullscreen, timer, violation detection and policy */
(function () {
  const $ = id => document.getElementById(id);
  const cfg = getConfig();
  let sess = load(KEYS.sess);
  const stu = load(KEYS.stu);
  let active = false, tickId = null, lastV = 0, listenersOn = false, toastId = null, firstLoad = 0;

  const show = id => ['screenReady', 'screenExam', 'screenEnded'].forEach(s => $(s).classList.toggle('hidden', s !== id));
  const studentLabel = s => [s.name, s.roll ? 'Roll ' + s.roll : '', s.email].filter(Boolean).join(' · ');
  const persist = () => save(KEYS.sess, sess);
  const limit = () => cfg.action === 'immediate' ? 1 : cfg.action === 'limit' ? cfg.maxViolations : Infinity;
  const fsOn = () => !!document.fullscreenElement;
  const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastId); toastId = setTimeout(() => t.classList.add('hidden'), 6000); };
  const MSG_TIME = 'Your examination time has ended. The examination interface is now closed. Please note that your Google Form response is saved only if it was successfully submitted.';

  /* ---------- Ready / resume screen ---------- */
  function showReady() {
    show('screenReady');
    $('rName').textContent = cfg.name;
    $('rInstr').textContent = cfg.instructions;
    const s = sess ? sess.student : stu;
    $('rStudent').textContent = studentLabel(s);
    const facts = ['Duration: ' + cfg.duration + ' minutes'];
    facts.push(cfg.action === 'warn' ? 'Violations are recorded; you receive warnings only.' :
      cfg.action === 'limit' ? 'The exam ends after ' + cfg.maxViolations + ' violations.' : 'The exam ends immediately on the first violation.');
    if (cfg.fullscreen) facts.push('Fullscreen is required. Leaving it counts as a violation.');
    if (cfg.tabDetect) facts.push('Switching tabs or windows counts as a violation.');
    if (cfg.graceSeconds > 0) facts.push('If you leave the exam screen you must return within ' + cfg.graceSeconds + ' seconds or the exam is closed.');
    if (cfg.autoFinish) facts.push('The exam closes automatically once you submit the form.');
    $('rFacts').innerHTML = '';
    facts.forEach(f => { const li = document.createElement('li'); li.textContent = f; $('rFacts').appendChild(li); });
    if (sess) {
      $('rResume').style.display = 'block';
      $('rResume').textContent = 'Your examination is in progress. The timer kept running while you were away. Violations so far: ' + sess.violations + '.';
      $('startBtn').textContent = 'Resume Examination';
      $('backLink').classList.add('hidden');
    }
  }

  /* ---------- Start / resume ---------- */
  async function start() {
    $('rErr').textContent = '';
    if (!sess) {
      const we = windowError(cfg, Date.now());
      if (we) { $('rErr').textContent = we; return; }
    }
    if (cfg.fullscreen) {
      try {
        if (!document.documentElement.requestFullscreen) throw new Error('unsupported');
        await document.documentElement.requestFullscreen();
      } catch (e) {
        $('rErr').textContent = 'Fullscreen could not be started. Allow fullscreen for this site and try again. The exam has not started.';
        return;
      }
      if (!fsOn()) { $('rErr').textContent = 'Fullscreen was not entered. The exam has not started.'; return; }
    }
    if (sess && sess.awaySince) { sess.awaySince = null; persist(); } // resuming counts as returning
    if (!sess) {
      const now = Date.now();
      let deadline = now + cfg.duration * 60000;
      if (cfg.end) deadline = Math.min(deadline, new Date(cfg.end).getTime());
      sess = { student: stu, startTs: now, deadline: deadline, violations: 0, log: [], status: 'active', w5: false, w1: false, awaySince: null };
      persist();
    }
    beginExam();
  }

  function beginExam() {
    show('screenExam');
    $('hName').textContent = cfg.name;
    $('hStudent').textContent = studentLabel(sess.student);
    firstLoad = 0;
    $('examFrame').src = embedUrl(cfg.formUrl);
    active = true;
    renderViol();
    attachListeners();
    clearInterval(tickId);
    tickId = setInterval(tick, 500); // display refresh only; time comes from sess.deadline
    tick();
  }

  /* ---------- Timer ---------- */
  function tick() {
    if (!active) return;
    const left = sess.deadline - Date.now();
    if (left <= 0) { $('timer').textContent = '00:00:00'; endExam('time'); return; }
    if (sess.awaySince && cfg.graceSeconds > 0) {
      const rem = cfg.graceSeconds * 1000 - (Date.now() - sess.awaySince);
      if (rem <= 0) { endExam('away'); return; }
      updateGrace(rem);
    }
    const s = Math.ceil(left / 1000);
    $('timer').textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
    $('timer').className = 'timer' + (left <= 60000 ? ' crit' : left <= 300000 ? ' low' : '');
    if (left <= 60000) {
      $('submitReminder').classList.remove('hidden');
      if (!sess.submitPrompted) {
        sess.submitPrompted = true; sess.w1 = true; sess.w5 = true; persist();
        $('submitOverlay').classList.remove('hidden');
        $('continueSubmitBtn').focus();
      }
    }
    else if (left <= 300000 && !sess.w5) { sess.w5 = true; persist(); toast('Five minutes remaining.'); }
  }

  /* ---------- Violations ---------- */
  function renderViol() {
    const l = limit();
    $('hViol').textContent = 'Violations: ' + sess.violations + (l === Infinity ? '' : ' / ' + l);
  }
  function updateGrace(rem) {
    $('wGrace').textContent = 'Return within ' + Math.ceil(rem / 1000) + ' s or the examination will be closed.';
  }
  function violation(reason, noGrace) {
    if (!active) return;
    if (sess.awaySince && !noGrace) return; // already away: wait for the student to return
    const now = Date.now();
    if (now - lastV < 1500) return; // one user action often fires several events
    lastV = now;
    sess.violations++;
    sess.log.push({ t: now, reason: reason });
    if (!noGrace && cfg.graceSeconds > 0) sess.awaySince = now;
    persist(); renderViol();
    if (sess.violations >= limit()) { endExam('violation', reason); return; }
    showWarning(reason);
  }
  function showWarning(reason) {
    const l = limit();
    $('wMsg').textContent = reason + '.';
    $('wCount').textContent = 'Violation: ' + sess.violations + (l === Infinity ? '' : ' / ' + l);
    $('wHelp').textContent = cfg.fullscreen ? 'Please return to fullscreen.' : 'Please stay on the examination page.';
    $('wErr').textContent = '';
    const g = !!(sess.awaySince && cfg.graceSeconds > 0);
    $('wGrace').classList.toggle('hidden', !g);
    if (g) updateGrace(cfg.graceSeconds * 1000 - (Date.now() - sess.awaySince));
    $('warnOverlay').classList.remove('hidden');
    $('returnBtn').focus();
  }
  async function returnToExam() {
    if (sess.awaySince && cfg.graceSeconds > 0 && Date.now() - sess.awaySince >= cfg.graceSeconds * 1000) { endExam('away'); return; }
    if (cfg.fullscreen && !fsOn()) {
      try { await document.documentElement.requestFullscreen(); }
      catch (e) { $('wErr').textContent = 'Fullscreen was blocked. Click the button again.'; return; }
    }
    if (!active) return;
    sess.awaySince = null; persist();
    $('warnOverlay').classList.add('hidden');
  }

  function attachListeners() {
    if (listenersOn) return; listenersOn = true;
    // Submitting a Google Form navigates the iframe to its confirmation page, which fires a second load event.
    $('examFrame').addEventListener('load', function () {
      if (!active) return;
      const now = Date.now();
      if (!firstLoad) { firstLoad = now; return; }
      if (cfg.autoFinish && now - firstLoad > 3000) endExam('submit');
    });
    document.addEventListener('fullscreenchange', function () {
      if (active && cfg.fullscreen && !fsOn()) violation('You exited the examination screen (fullscreen)');
    });
    document.addEventListener('visibilitychange', function () {
      if (active && cfg.tabDetect && document.hidden) violation('You switched to another tab or window');
    });
    window.addEventListener('blur', function () {
      if (!active || !cfg.tabDetect) return;
      // Clicking inside the Google Form iframe also blurs the window; ignore that case.
      setTimeout(function () {
        if (document.activeElement === $('examFrame') || document.hasFocus() || document.hidden) return;
        violation('The examination window lost focus');
      }, 200);
    });
    window.addEventListener('focus', function () {
      if (active && !$('warnOverlay').classList.contains('hidden')) $('returnBtn').focus();
    });
    document.addEventListener('keydown', function (e) {
      // Informational only: the browser handles ESC itself and fullscreenchange does the counting.
      if (active && e.key === 'Escape') toast('Leaving fullscreen is recorded as a violation.');
      if (!active) return;
      const key = e.key.toLowerCase();
      const devToolsShortcut = e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key));
      const blockedShortcut = (e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 'p', 's', 'u'].includes(key);
      if (devToolsShortcut) {
        e.preventDefault();
        e.stopPropagation();
        toast('Developer tools are disabled during the examination. Please return to the exam.');
      } else if (blockedShortcut) {
        e.preventDefault();
        toast('Copying and browser shortcuts are disabled during the examination.');
      }
    }, true);
    document.addEventListener('copy', e => { if (active) e.preventDefault(); });
    document.addEventListener('cut', e => { if (active) e.preventDefault(); });
    document.addEventListener('contextmenu', e => {
      if (!active) return;
      e.preventDefault();
      toast('Right-click is disabled during the examination.');
    }, true);
    document.addEventListener('dragstart', e => { if (active) e.preventDefault(); });
  }

  /* ---------- End ---------- */
  function endExam(why, reason) {
    if (!active && sess.status === 'ended') return;
    active = false; clearInterval(tickId);
    sess.status = 'ended'; sess.endTs = Date.now(); sess.awaySince = null;
    sess.endReason = why === 'time' ? 'Time expired' : why === 'submit' ? 'Submitted' :
      why === 'away' ? 'Terminated: You did not return to the examination within ' + cfg.graceSeconds + ' seconds' : 'Terminated: ' + reason;
    const done = load(KEYS.done) || [];
    if (done.indexOf(sess.student.email.toLowerCase()) === -1) done.push(sess.student.email.toLowerCase());
    save(KEYS.done, done);
    persist();
    $('examFrame').src = 'about:blank'; // closes the form view; does NOT submit Google Forms
    $('warnOverlay').classList.add('hidden'); $('submitOverlay').classList.add('hidden');
    if (fsOn() && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    showEnded();
  }
  function showEnded() {
    show('screenEnded');
    const r = sess.endReason, timeUp = r === 'Time expired', sub = r === 'Submitted';
    $('eTitle').textContent = sub ? 'Form submitted' : timeUp ? 'Examination ended' : 'Examination terminated';
    $('eMsg').textContent = sub ? 'Google Forms moved to its confirmation page, which indicates your response was sent. The examination is now closed. Your examiner can confirm receipt in Google Forms.' :
      timeUp ? MSG_TIME :
      r + '. The examination interface is now closed. Please note that your Google Form response is saved only if it was successfully submitted.';
    $('eStudent').textContent = studentLabel(sess.student);
    $('eExam').textContent = cfg.name;
    $('eTime').textContent = fmtDate(sess.endTs);
    $('eViol').textContent = String(sess.violations);
  }

  /* ---------- Init ---------- */
  $('startBtn').addEventListener('click', start);
  $('returnBtn').addEventListener('click', returnToExam);
  $('continueSubmitBtn').addEventListener('click', function () {
    $('submitOverlay').classList.add('hidden');
    $('examFrame').focus();
  });

  if (!sess && !stu) { location.replace('index.html'); return; }
  if (sess && sess.status === 'ended') { showEnded(); return; }
  if (sess && Date.now() >= sess.deadline) { active = true; endExam('time'); return; }
  if (sess && sess.awaySince && cfg.graceSeconds > 0 && Date.now() - sess.awaySince >= cfg.graceSeconds * 1000) { active = true; endExam('away'); return; }
  if (sess) {
    // Page was reloaded or reopened mid-exam: count it, keep the original deadline.
    active = true; violation('The examination page was reloaded or reopened', true);
    if (sess.status === 'ended') return;
    active = false;
  }
  showReady();
})();
