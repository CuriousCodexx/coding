const test = require('node:test');
const assert = require('node:assert');
const A = require('../analyzer.js');

const JD = 'Senior Product Manager to own product strategy and roadmap. Run A/B testing and SQL. ' +
  'Product strategy matters. Stakeholder management daily. Stakeholder management with Python. Python scripting.';

test('extracts repeated phrases and drops words they cover', () => {
  const kws = A.extractKeywords(JD);
  assert.ok(kws.includes('product strategy'));
  assert.ok(kws.includes('stakeholder management'));
  assert.ok(!kws.includes('stakeholder'));
});

test('matches word variants and reports missing keywords', () => {
  const res = A.analyze({ skills: 'SQL, roadmapping, product strategy', experience: [], education: [] }, JD);
  assert.ok(res.matched.includes('roadmap'));
  assert.ok(res.matched.includes('sql'));
  assert.ok(res.missing.includes('python'));
  assert.ok(res.score > 0 && res.score < 100);
});

test('flags weak and unquantified achievements', () => {
  const res = A.analyze({ summary: 'x', experience: [{ bullets: 'helped the team\nLed launch growing revenue 20%' }], education: [] }, JD);
  assert.ok(res.notes.some((n) => n.startsWith('1 of 2 achievements don')));
  assert.ok(res.notes.some((n) => n.includes('no numbers')));
});

test('empty job description scores zero', () => {
  assert.strictEqual(A.analyze({ experience: [], education: [] }, '').score, 0);
});
