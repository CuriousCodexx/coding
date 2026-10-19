/* Pontis analyzer: compares a resume against a job description.
   Pure functions, usable in the browser (window.PontisAnalyzer) and in Node. */
(function (root) {
  'use strict';

  var STOPWORDS = new Set((
    'a about above across after again against all also am an and any are as at be because been before being below ' +
    'between both but by can could did do does doing down during each either etc ever every few for from further ' +
    'get gets had has have having he her here hers him his how i if in into is it its itself just least less like ' +
    'll made make makes many may me might more most much must my need needs no nor not now of off on once one only ' +
    'or other our ours out over own per please plus re same shall she should so some such than that the their them ' +
    'then there these they this those through to too under until up upon us use used using very via was we well ' +
    'were what when where whether which while who whom why will with within without would yet you your yours ' +
    // job-posting filler
    'ability able apply applicant applicants benefits candidate candidates company competitive culture day days ' +
    'description employer environment equal etc excellent experience experienced familiarity good great help ' +
    'highly ideal including job join knowledge looking opportunity orientation plus position preferred qualifications ' +
    'related required requirements responsibilities role salary seeking strong team teams understanding work ' +
    'working world year years new based across ensure provide including include includes within key run skills ' +
    'tools partner love passion passionate fast paced wide range various'
  ).split(/\s+/));

  var ACTION_VERBS = new Set((
    'achieved built created delivered designed developed drove grew improved increased launched led managed ' +
    'mentored optimized owned reduced redesigned scaled shipped spearheaded streamlined automated architected ' +
    'coordinated established implemented negotiated organized produced saved won wrote analyzed accelerated ' +
    'transformed founded directed oversaw initiated resolved trained cut boosted generated secured'
  ).split(/\s+/));

  function tokenize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9+#./\- ]+/g, ' ')
      .split(/\s+/)
      .map(function (t) { return t.replace(/^[.\-/]+|[.\-/]+$/g, ''); })
      .filter(function (t) { return t.length > 1 && !/^\d+$/.test(t); });
  }

  /* Ranked keywords (single words and two-word phrases) from a job description. */
  function extractKeywords(text, limit) {
    limit = limit || 25;
    var tokens = tokenize(text);
    var counts = new Map();
    function bump(k, w) { counts.set(k, (counts.get(k) || 0) + w); }

    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (STOPWORDS.has(t)) continue;
      bump(t, 1);
      var n = tokens[i + 1];
      if (n && !STOPWORDS.has(n)) bump(t + ' ' + n, 1.5);
    }

    // a phrase must repeat to count; drop single words fully covered by a stronger phrase
    var entries = Array.from(counts.entries()).filter(function (e) {
      return e[0].indexOf(' ') === -1 || e[1] >= 3;
    });
    entries.sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });

    var out = [];
    for (var j = 0; j < entries.length && out.length < limit; j++) out.push(entries[j][0]);
    // drop single words already covered by a chosen phrase ("data" when "data analysis" is in)
    var phrases = out.filter(function (k) { return k.indexOf(' ') !== -1; });
    out = out.filter(function (k) {
      return k.indexOf(' ') !== -1 || !phrases.some(function (p) { return p.split(' ').indexOf(k) !== -1; });
    });
    return out;
  }

  function resumeText(r) {
    var parts = [r.title, r.summary, r.skills, r.pledge];
    (r.experience || []).forEach(function (e) { parts.push(e.role, e.company, e.bullets); });
    (r.education || []).forEach(function (e) { parts.push(e.degree, e.school, e.notes); });
    return parts.filter(Boolean).join(' \n ');
  }

  function stem(w) { return w.replace(/(ing|ed|es|s)$/, ''); }

  // "roadmap" matches "roadmaps"/"roadmapping"; short words must match exactly
  function sameWord(resumeWord, keywordWord) {
    if (resumeWord === keywordWord || stem(resumeWord) === stem(keywordWord)) return true;
    return keywordWord.length >= 4 && resumeWord.indexOf(keywordWord) === 0 && resumeWord.length - keywordWord.length <= 4;
  }

  function contains(haystackTokens, keyword) {
    var kw = keyword.split(' ');
    outer: for (var i = 0; i <= haystackTokens.length - kw.length; i++) {
      for (var j = 0; j < kw.length; j++) if (!sameWord(haystackTokens[i + j], kw[j])) continue outer;
      return true;
    }
    return false;
  }

  function bulletNotes(r) {
    var notes = [];
    var bullets = [];
    (r.experience || []).forEach(function (e) {
      (e.bullets || '').split('\n').map(function (b) { return b.trim(); }).filter(Boolean)
        .forEach(function (b) { bullets.push(b); });
    });
    if (!bullets.length) {
      notes.push('Add achievements under each position — they are the planks of your bridge.');
      return notes;
    }
    var weak = bullets.filter(function (b) {
      var first = tokenize(b)[0] || '';
      return !ACTION_VERBS.has(first);
    }).length;
    var unquantified = bullets.filter(function (b) { return !/\d/.test(b); }).length;
    if (weak) notes.push(weak + ' of ' + bullets.length + ' achievements don\'t open with a strong verb (led, built, grew…).');
    if (unquantified) notes.push(unquantified + ' of ' + bullets.length + ' achievements have no numbers — add %, $, time saved or scale.');
    var long = bullets.filter(function (b) { return b.length > 180; }).length;
    if (long) notes.push(long + ' achievement(s) run past 180 characters — trim to one line or two.');
    return notes;
  }

  function analyze(resume, jobText) {
    var keywords = extractKeywords(jobText);
    var tokens = tokenize(resumeText(resume));
    var matched = [], missing = [];
    keywords.forEach(function (k) { (contains(tokens, k) ? matched : missing).push(k); });
    var score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;

    var notes = bulletNotes(resume);
    if (!(resume.summary || '').trim()) notes.unshift('Write a summary — it is the first stone a recruiter steps on.');
    if (missing.length) notes.push('Weave the missing keywords you genuinely have into your summary and achievements, not only your skills list.');
    if (score >= 75) notes.push('Strong span. Tailor your headline to the exact job title to finish the arch.');

    return { keywords: keywords, matched: matched, missing: missing, score: score, notes: notes };
  }

  var api = { tokenize: tokenize, extractKeywords: extractKeywords, analyze: analyze, resumeText: resumeText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PontisAnalyzer = api;
})(this);
