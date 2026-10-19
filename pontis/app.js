/* Pontis — resume builder, job bridge and oath. State lives in localStorage. */
(function () {
  'use strict';

  var STORAGE_KEY = 'pontis.resume.v1';

  var EMPTY = {
    name: '', title: '', email: '', phone: '', location: '', website: '',
    summary: '', skills: '', pledge: '',
    experience: [], education: [],
    template: 'forum',
    oath: { signed: false, by: '', date: '' }
  };

  var SAMPLE = {
    name: 'Livia Drusilla',
    title: 'Senior Product Manager',
    email: 'livia@example.com',
    phone: '+39 06 555 0142',
    location: 'Rome, Italy',
    website: 'linkedin.com/in/livia',
    summary: 'Product manager with 8 years building B2B SaaS. I turn messy customer problems into roadmaps engineers love and metrics executives trust.',
    skills: 'Product strategy, roadmapping, user research, SQL, A/B testing, Agile, stakeholder management, Figma',
    pledge: 'Within 90 days I will ship one measurable improvement to your activation funnel.',
    experience: [
      { role: 'Senior Product Manager', company: 'Aqua Systems', start: '2021', end: 'Present',
        bullets: 'Led a team of 9 to launch a self-serve onboarding flow, lifting activation 34%\nGrew enterprise ARR from $2.1M to $5.8M by reprioritising the roadmap around retention\nIntroduced weekly A/B testing cadence, running 40+ experiments in a year' },
      { role: 'Product Manager', company: 'Via Appia Logistics', start: '2017', end: '2021',
        bullets: 'Built route-planning features used by 1,200 drivers daily\nReduced support tickets 22% through in-app guidance' }
    ],
    education: [
      { degree: 'MSc Management Engineering', school: 'Sapienza University of Rome', year: '2017', notes: 'Cum laude' }
    ],
    template: 'forum',
    oath: { signed: false, by: '', date: '' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(clone(EMPTY), JSON.parse(raw));
    } catch (e) { /* storage unavailable — start fresh */ }
    return clone(EMPTY);
  }

  var state = load();
  var saveTimer;

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    var badge = document.getElementById('saved');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); badge.textContent = 'Saved'; }
    catch (e) { badge.textContent = 'Not saved (storage blocked)'; }
  }

  function save() {
    clearTimeout(saveTimer);
    document.getElementById('saved').textContent = 'Saving…';
    saveTimer = setTimeout(flush, 300);
  }
  window.addEventListener('pagehide', function () { if (saveTimer) flush(); });

  function changed() { render(); save(); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Tabs ---------- */
  document.querySelectorAll('[role=tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[role=tab]').forEach(function (b) { b.setAttribute('aria-selected', b === btn); });
      document.querySelectorAll('.tab-pane').forEach(function (p) { p.hidden = p.id !== 'tab-' + btn.dataset.tab; });
    });
  });

  /* ---------- Simple fields ---------- */
  function bindFields() {
    document.querySelectorAll('[data-field]').forEach(function (el) {
      el.value = state[el.dataset.field] || '';
      el.oninput = function () { state[el.dataset.field] = el.value; changed(); };
    });
    document.querySelectorAll('input[name=template]').forEach(function (r) {
      r.checked = r.value === state.template;
      r.onchange = function () { state.template = r.value; changed(); };
    });
  }

  /* ---------- Repeating lists ---------- */
  function renderList(kind) {
    var host = document.getElementById(kind + '-list');
    var tpl = document.getElementById('tpl-' + kind);
    host.innerHTML = '';
    state[kind].forEach(function (item, idx) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelectorAll('[data-k]').forEach(function (el) {
        el.value = item[el.dataset.k] || '';
        el.oninput = function () { item[el.dataset.k] = el.value; changed(); };
      });
      node.querySelector('[data-remove]').onclick = function () {
        state[kind].splice(idx, 1); renderList(kind); changed();
      };
      node.querySelectorAll('[data-move]').forEach(function (b) {
        b.onclick = function () {
          var to = idx + Number(b.dataset.move);
          if (to < 0 || to >= state[kind].length) return;
          var list = state[kind];
          list.splice(to, 0, list.splice(idx, 1)[0]);
          renderList(kind); changed();
        };
      });
      host.appendChild(node);
    });
  }

  document.querySelectorAll('[data-add]').forEach(function (btn) {
    btn.onclick = function () {
      var kind = btn.dataset.add;
      state[kind].push({});
      renderList(kind); changed();
      var inputs = document.querySelectorAll('#' + kind + '-list .entry:last-child input');
      if (inputs[0]) inputs[0].focus();
    };
  });

  function hydrate() {
    bindFields();
    renderList('experience');
    renderList('education');
    syncOath();
    render();
  }

  /* ---------- Resume preview ---------- */
  function skillList() {
    return (state.skills || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function render() {
    var r = state;
    var contacts = [r.email, r.phone, r.location, r.website].filter(Boolean).map(function (c) { return '<span>' + esc(c) + '</span>'; });
    var exp = r.experience.filter(function (e) { return e.role || e.company; }).map(function (e) {
      var bullets = (e.bullets || '').split('\n').map(function (b) { return b.trim(); }).filter(Boolean);
      var dates = [e.start, e.end].filter(Boolean).map(esc).join(' – ');
      return '<div class="r-item"><div class="r-item-head"><strong>' + esc(e.role) + '</strong>' +
        (e.company ? '<span class="r-org">' + esc(e.company) + '</span>' : '') +
        '<span class="r-dates">' + dates + '</span></div>' +
        (bullets.length ? '<ul>' + bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') +
        '</div>';
    }).join('');
    var edu = r.education.filter(function (e) { return e.degree || e.school; }).map(function (e) {
      return '<div class="r-item"><div class="r-item-head"><strong>' + esc(e.degree) + '</strong>' +
        (e.school ? '<span class="r-org">' + esc(e.school) + '</span>' : '') +
        '<span class="r-dates">' + esc(e.year) + '</span></div>' +
        (e.notes ? '<p class="r-note">' + esc(e.notes) + '</p>' : '') + '</div>';
    }).join('');
    var skills = skillList().map(function (s) { return '<span class="r-skill">' + esc(s) + '</span>'; }).join('');

    var sections = [];
    if (r.summary) sections.push(section('Profile', '<p>' + esc(r.summary) + '</p>'));
    if (exp) sections.push(section('Experience', exp));
    if (edu) sections.push(section('Education', edu));
    if (skills) sections.push(section('Skills', '<div class="r-skills">' + skills + '</div>'));
    if (r.pledge) sections.push(section('My pledge', '<p class="r-pledge">' + esc(r.pledge) + '</p>'));

    var seal = r.oath.signed
      ? '<footer class="r-seal"><svg viewBox="0 0 64 40" aria-hidden="true"><path d="M2 38h60M6 38V22M58 38V22M2 22h60M10 22a22 22 0 0 1 44 0" fill="none" stroke="currentColor" stroke-width="3"/></svg>' +
        '<span>Sworn true under the Bridge Oath by <em>' + esc(r.oath.by) + '</em> · ' + esc(r.oath.date) + '</span></footer>'
      : '';

    var empty = !r.name && !sections.length;
    var el = document.getElementById('resume');
    el.className = 'resume t-' + r.template;
    el.innerHTML = empty
      ? '<div class="r-empty"><svg viewBox="0 0 64 40" aria-hidden="true"><path d="M2 38h60M6 38V22M58 38V22M2 22h60M10 22a22 22 0 0 1 44 0" fill="none" stroke="currentColor" stroke-width="2"/></svg><p>Your bridge is unbuilt.<br>Start typing in <strong>Forge</strong>, or load the example.</p></div>'
      : '<header class="r-head"><h2>' + esc(r.name || 'Your Name') + '</h2>' +
        (r.title ? '<p class="r-title">' + esc(r.title) + '</p>' : '') +
        (contacts.length ? '<p class="r-contact">' + contacts.join('<span class="dot">·</span>') + '</p>' : '') +
        '</header><div class="r-body">' + sections.join('') + '</div>' + seal;
  }

  function section(title, html) {
    return '<section class="r-section"><h3>' + title + '</h3>' + html + '</section>';
  }

  /* ---------- Bridge (job match) ---------- */
  var jd = document.getElementById('jd');
  try { jd.value = localStorage.getItem(STORAGE_KEY + '.jd') || ''; } catch (e) { /* ignore */ }
  jd.addEventListener('input', function () {
    try { localStorage.setItem(STORAGE_KEY + '.jd', jd.value); } catch (e) { /* ignore */ }
  });

  function runAnalysis() {
    if (!jd.value.trim()) { jd.focus(); return; }
    var res = window.PontisAnalyzer.analyze(state, jd.value);
    document.getElementById('bridge-result').hidden = false;
    document.getElementById('score').textContent = res.score;
    document.getElementById('score-label').textContent =
      res.score >= 75 ? 'the bridge holds' : res.score >= 45 ? 'half-built — keep laying stones' : 'a long way across';
    var fill = document.getElementById('arch-fill');
    var len = fill.getTotalLength();
    fill.style.strokeDasharray = len;
    fill.style.strokeDashoffset = len * (1 - res.score / 100);

    document.getElementById('matched').innerHTML = res.matched.length
      ? res.matched.map(function (k) { return '<span class="chip ok">' + esc(k) + '</span>'; }).join('')
      : '<span class="hint">None yet.</span>';

    var missing = document.getElementById('missing');
    missing.innerHTML = res.missing.length
      ? res.missing.map(function (k) { return '<button class="chip miss" data-kw="' + esc(k) + '">+ ' + esc(k) + '</button>'; }).join('')
      : '<span class="hint">Nothing missing — a complete span.</span>';
    missing.querySelectorAll('[data-kw]').forEach(function (b) {
      b.onclick = function () {
        var list = skillList(); list.push(b.dataset.kw);
        state.skills = list.join(', ');
        document.querySelector('[data-field=skills]').value = state.skills;
        changed(); runAnalysis();
      };
    });

    document.getElementById('notes').innerHTML = res.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
  }
  document.getElementById('analyze').onclick = runAnalysis;

  /* ---------- Oath ---------- */
  var oathCheck = document.getElementById('oath-check');
  var oathSign = document.getElementById('oath-sign');
  var sealBtn = document.getElementById('seal');
  var sealedMsg = document.getElementById('sealed-msg');

  function syncOath() {
    oathCheck.checked = state.oath.signed;
    oathSign.value = state.oath.by || state.name || '';
    updateSealButton();
    sealedMsg.hidden = !state.oath.signed;
    sealedMsg.textContent = state.oath.signed ? 'Sealed by ' + state.oath.by + ' on ' + state.oath.date + '. The seal now appears on your resume.' : '';
    sealBtn.textContent = state.oath.signed ? 'Break the seal' : 'Seal the oath';
  }
  function updateSealButton() {
    sealBtn.disabled = !state.oath.signed && !(oathCheck.checked && oathSign.value.trim());
  }
  oathCheck.onchange = updateSealButton;
  oathSign.oninput = updateSealButton;
  sealBtn.onclick = function () {
    if (state.oath.signed) state.oath = { signed: false, by: '', date: '' };
    else state.oath = { signed: true, by: oathSign.value.trim(), date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) };
    syncOath(); changed();
  };
  document.getElementById('print').onclick = function () { window.print(); };

  /* ---------- File actions ---------- */
  document.getElementById('load-sample').onclick = function () {
    if (hasContent() && !confirm('Replace your current resume with the example?')) return;
    state = clone(SAMPLE); hydrate(); save();
  };
  document.getElementById('reset').onclick = function () {
    if (!confirm('Clear everything? This cannot be undone.')) return;
    state = clone(EMPTY); hydrate(); save();
  };
  document.getElementById('export-json').onclick = function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pontis.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };
  document.getElementById('import-json').onchange = function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    file.text().then(function (txt) {
      try { state = Object.assign(clone(EMPTY), JSON.parse(txt)); hydrate(); save(); }
      catch (e) { alert('That file is not a valid Pontis resume.'); }
      ev.target.value = '';
    });
  };

  function hasContent() {
    return Boolean(state.name || state.summary || state.experience.length || state.education.length);
  }

  hydrate();
})();
