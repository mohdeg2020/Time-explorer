/* Tests for the Time Explorer logic. Run with:  node tests/run-tests.js
   Every generated question is re-solved here with separate code, using only the text of the question. */
'use strict';
const assert = require('assert');
const L = require('../script.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.message)); }
}

// ----- independent helpers (do not use the code under test) -----
const parseClock = s => { const m = /(\d{1,2}):(\d\d)/.exec(s); return (parseInt(m[1], 10) % 12) * 60 + parseInt(m[2], 10); };
const clockLabel = x => { x = ((x % 720) + 720) % 720; const h = Math.floor(x / 60); return (h === 0 ? 12 : h) + ':' + String(x % 60).padStart(2, '0'); };
const parseDur = s => {
  const h = /(\d+) hours?/.exec(s), m = /(\d+) minutes?/.exec(s);
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
};
const durLabel = n => {
  const h = Math.floor(n / 60), m = n % 60, out = [];
  if (h) out.push(h + (h === 1 ? ' hour' : ' hours'));
  if (m || !h) out.push(m + (m === 1 ? ' minute' : ' minutes'));
  return out.join(' ');
};
const correctLabel = q => q.options.find(o => o.value === q.correct).label;
const N = 1500;

function sample(section, kind, seed, count) {
  const rnd = L.makeRng(seed), out = [];
  for (let i = 0; i < (count || N); i++) out.push(L.makeQuestion({ section, kind }, rnd));
  return out;
}

console.log('Time arithmetic');
test('3:00 + 30 minutes = 3:30', () => assert.strictEqual(L.fmtC(L.addC(L.c12(3, 0), 30)), '3:30'));
test('7:00 - 15 minutes = 6:45', () => assert.strictEqual(L.fmtC(L.addC(L.c12(7, 0), -15)), '6:45'));
test('11:50 + 20 minutes = 12:10 (rolls over 12)', () => assert.strictEqual(L.fmtC(L.addC(L.c12(11, 50), 20)), '12:10'));
test('12:10 - 20 minutes = 11:50 (rolls back over 12)', () => assert.strictEqual(L.fmtC(L.addC(L.c12(12, 10), -20)), '11:50'));
test('12:45 + 35 minutes = 1:20', () => assert.strictEqual(L.fmtC(L.addC(L.c12(12, 45), 35)), '1:20'));
test('4:50 + 15 minutes = 5:05 (hour changes)', () => assert.strictEqual(L.fmtC(L.addC(L.c12(4, 50), 15)), '5:05'));
test('1:05 - 10 minutes = 12:55', () => assert.strictEqual(L.fmtC(L.addC(L.c12(1, 5), -10)), '12:55'));
test('12:00 is the same time as 0 minutes on the dial', () => assert.strictEqual(L.c12(12, 0), 0));
test('duration 7:00 -> 7:40 = 40 minutes', () => assert.strictEqual(L.durC(L.c12(7, 0), L.c12(7, 40)), 40));
test('duration 7:45 -> 8:20 = 35 minutes', () => assert.strictEqual(L.durC(L.c12(7, 45), L.c12(8, 20)), 35));
test('duration 11:30 -> 1:00 = 90 minutes (across 12)', () => assert.strictEqual(L.durC(L.c12(11, 30), L.c12(1, 0)), 90));
test('duration 12:00 -> 12:30 = 30 minutes', () => assert.strictEqual(L.durC(L.c12(12, 0), L.c12(12, 30)), 30));
test('1 hour 10 minutes = 70 minutes', () => { assert.strictEqual(L.fmtDuration(70), '1 hour 10 minutes'); assert.strictEqual(parseDur('1 hour 10 minutes'), 70); });
test('90 minutes = 1 hour 30 minutes', () => assert.strictEqual(L.fmtDuration(90), '1 hour 30 minutes'));
test('duration wording: 60, 120, 5, 1', () => {
  assert.strictEqual(L.fmtDuration(60), '1 hour'); assert.strictEqual(L.fmtDuration(120), '2 hours');
  assert.strictEqual(L.fmtDuration(5), '5 minutes'); assert.strictEqual(L.fmtDuration(1), '1 minute');
});

console.log('Clock hands');
test('hour hand moves proportionally between numbers', () => {
  const a = L.handAngles(L.c12(3, 0)); assert.deepStrictEqual(a, { hour: 90, minute: 0 });
  const b = L.handAngles(L.c12(7, 25)); assert.deepStrictEqual(b, { hour: 222.5, minute: 150 });
  const c = L.handAngles(L.c12(12, 30)); assert.deepStrictEqual(c, { hour: 15, minute: 180 });
  const d = L.handAngles(L.c12(6, 30)); assert.deepStrictEqual(d, { hour: 195, minute: 180 });
  const e = L.handAngles(L.c12(12, 0)); assert.deepStrictEqual(e, { hour: 0, minute: 0 });
  const f = L.handAngles(L.c12(1, 45)); assert.deepStrictEqual(f, { hour: 52.5, minute: 270 });
});
test('reading the angles gives back the time for all 720 clock times', () => {
  for (let c = 0; c < 720; c++) {
    const a = L.handAngles(c), minute = Math.round(a.minute / 6) % 60;
    const hour = Math.floor((a.hour - minute * 0.5 + 0.0001) / 30 + 0.5) % 12;
    assert.strictEqual((hour * 60 + minute) % 720, c, 'time ' + c);
  }
});
test('time words', () => {
  assert.strictEqual(L.timeWords(L.c12(4, 30)), 'half past 4');
  assert.strictEqual(L.timeWords(L.c12(9, 15)), 'quarter past 9');
  assert.strictEqual(L.timeWords(L.c12(2, 45)), 'quarter to 3');
  assert.strictEqual(L.timeWords(L.c12(12, 45)), 'quarter to 1');
  assert.strictEqual(L.timeWords(L.c12(11, 45)), 'quarter to 12');
  assert.strictEqual(L.timeWords(L.c12(5, 0)), "5 o'clock");
  assert.strictEqual(L.timeWords(L.c12(5, 20)), null);
});

console.log('AM / PM, noon and midnight');
test('midnight and noon', () => {
  assert.strictEqual(L.makeT(12, 0, 'AM'), 0); assert.strictEqual(L.makeT(12, 0, 'PM'), 720);
  assert.strictEqual(L.fmtT(0), '12:00 AM'); assert.strictEqual(L.fmtT(720), '12:00 PM');
  assert.strictEqual(L.fmtT(779), '12:59 PM'); assert.strictEqual(L.fmtT(780), '1:00 PM');
  assert.strictEqual(L.fmtT(1439), '11:59 PM'); assert.strictEqual(L.fmtT(719), '11:59 AM'); assert.strictEqual(L.fmtT(60), '1:00 AM');
});
test('same clock reading can be AM or PM', () => {
  assert.notStrictEqual(L.makeT(7, 0, 'AM'), L.makeT(7, 0, 'PM'));
  assert.strictEqual(L.makeT(7, 0, 'AM') % 720, L.makeT(7, 0, 'PM') % 720);
});
test('parts of the day', () => {
  const d = (h, m, p) => L.dayPart(L.makeT(h, m, p));
  assert.strictEqual(d(5, 0, 'AM'), 'morning'); assert.strictEqual(d(11, 59, 'AM'), 'morning');
  assert.strictEqual(d(12, 0, 'PM'), 'afternoon'); assert.strictEqual(d(4, 59, 'PM'), 'afternoon');
  assert.strictEqual(d(5, 0, 'PM'), 'evening'); assert.strictEqual(d(9, 0, 'PM'), 'evening');
  assert.strictEqual(d(12, 0, 'AM'), 'evening'); assert.strictEqual(d(4, 59, 'AM'), 'evening');
});
test('every activity has a sensible period and only silly wrong times', () => {
  L.ACTS.forEach(a => {
    a.times.forEach(([h, m]) => {
      const part = L.dayPart(L.makeT(h, m, a.period));
      assert.ok(a.period === 'AM' ? part === 'morning' : part !== 'morning', a.id + ' ' + h + ':' + m);
      // never right on a boundary (5:00 PM / 12:00)
      assert.ok(!(h === 5 && m === 0), a.id + ' is on the 5:00 boundary');
    });
    assert.ok(a.wrong.length >= 3, a.id + ' needs 3+ wrong times');
  });
});

console.log('Answer checking');
test('multiple choice accepts only the correct value', () => {
  const q = { type: 'mc', correct: '210' };
  assert.ok(L.checkAnswer(q, '210')); assert.ok(L.checkAnswer(q, 210));
  assert.ok(!L.checkAnswer(q, '211')); assert.ok(!L.checkAnswer(q, null));
});
test('set-the-clock: 12 and 0 hours are the same, wrong minute or hour fails', () => {
  const q = { type: 'setclock', target: L.c12(12, 0) };
  assert.ok(L.checkAnswer(q, 0)); assert.ok(L.checkAnswer(q, 720)); assert.ok(L.checkAnswer(q, { h12: 12, m: 0 }));
  assert.ok(!L.checkAnswer(q, { h12: 12, m: 5 })); assert.ok(!L.checkAnswer(q, { h12: 1, m: 0 }));
  const q2 = { type: 'setclock', target: L.c12(7, 25) };
  assert.ok(L.checkAnswer(q2, { h12: 7, m: 25 })); assert.ok(!L.checkAnswer(q2, { h12: 8, m: 25 })); assert.ok(!L.checkAnswer(q2, { h12: 7, m: 30 }));
});

console.log('Question generators (' + N + ' random questions per kind)');
const allKinds = [];
L.SECTION_IDS.forEach(sec => Object.keys(L.KINDS[sec]).forEach(kind => allKinds.push([sec, kind])));

test('every kind produces valid, bilingual, unambiguous questions', () => {
  allKinds.forEach(([sec, kind], i) => {
    sample(sec, kind, 1000 + i).forEach(q => {
      const errs = L.validateQuestion(q);
      assert.deepStrictEqual(errs, [], sec + '/' + kind + ': ' + errs.join(', ') + ' — ' + q.prompt);
      if (q.type === 'mc') {
        const ok = q.options.filter(o => L.checkAnswer(q, o.value));
        assert.strictEqual(ok.length, 1, sec + '/' + kind + ' has ' + ok.length + ' right options');
      }
    });
  });
});
test('kinds that should offer 4 choices always do (2-choice kinds: AM/PM, same clock, compare, noon/midnight facts)', () => {
  const expected = { 'ampm/ampm': 2, 'ampm/daypart': 3, 'ampm/sameclock': 2, 'hm/compare': 2 };
  allKinds.forEach(([sec, kind], i) => {
    if (kind === 'facts' || kind === 'set' || kind === 'setshift') return;
    sample(sec, kind, 2000 + i, 500).forEach(q => assert.strictEqual(q.options.length, expected[sec + '/' + kind] || 4, sec + '/' + kind + ': ' + q.prompt));
  });
  ['clock', 'ampm', 'hm'].forEach((sec, i) => sample(sec, 'facts', 90 + i, 300).forEach(q => assert.ok(q.options.length === 2 || q.options.length === 4)));
});
test('every topic has at least 5 different kinds of question', () => {
  L.SECTION_IDS.forEach(sec => assert.ok(Object.keys(L.KINDS[sec]).length >= 5, sec));
});
test('every topic can produce well over 5 different questions', () => {
  L.SECTION_IDS.forEach(sec => {
    const keys = new Set();
    Object.keys(L.KINDS[sec]).forEach(kind => sample(sec, kind, 5, 300).forEach(q => keys.add(q.key)));
    assert.ok(keys.size >= 20, sec + ' only ' + keys.size);
  });
});
test('the right answer is not always in the same position', () => {
  allKinds.forEach(([sec, kind], i) => {
    const qs = sample(sec, kind, 77 + i, 400).filter(q => q.type === 'mc' && q.options.length >= 3);
    if (!qs.length) return;
    const positions = new Set(qs.map(q => q.options.findIndex(o => o.value === q.correct)));
    assert.ok(positions.size >= 2, sec + '/' + kind + ' correct answer always at index ' + [...positions]);
  });
});
test('set-the-clock questions never start on the answer', () => {
  ['set'].forEach(() => sample('clock', 'set', 8).forEach(q => assert.notStrictEqual(q.startC, q.target)));
  sample('ba', 'setshift', 9).forEach(q => assert.notStrictEqual(q.startC, q.target));
});

console.log('Semantic checks (re-solving every question)');
test('clock/read: correct option equals the time drawn on the clock', () => {
  sample('clock', 'read', 11).forEach(q => assert.strictEqual(correctLabel(q), clockLabel(q.clocks[0].c)));
});
test('clock/pickclock: the right clock shows the time in the prompt', () => {
  sample('clock', 'pickclock', 12).forEach(q => {
    const right = q.options.find(o => o.value === q.correct);
    assert.strictEqual(clockLabel(right.clockC), q.prompt.match(/shows (\d+:\d\d)\?/)[1]);
    q.options.forEach(o => { if (o !== right) assert.notStrictEqual(clockLabel(o.clockC), clockLabel(right.clockC)); });
  });
});
test('clock/numbermin: minutes = number x 5', () => {
  sample('clock', 'numbermin', 13).forEach(q => {
    const n = parseInt(/points to (\d+)\./.exec(q.prompt)[1], 10);
    assert.strictEqual(parseDur(correctLabel(q)), n * 5);
    assert.strictEqual(L.c12Parts(q.clocks[0].c).m, n * 5);
  });
});
test('clock/words: phrases decode to the right time', () => {
  sample('clock', 'words', 14).forEach(q => {
    const ph = /"(.*)"/.exec(q.prompt)[1];
    let t;
    let m;
    if ((m = /^(\d+) o'clock$/.exec(ph))) t = (+m[1] % 12) * 60;
    else if ((m = /^quarter past (\d+)$/.exec(ph))) t = (+m[1] % 12) * 60 + 15;
    else if ((m = /^half past (\d+)$/.exec(ph))) t = (+m[1] % 12) * 60 + 30;
    else if ((m = /^quarter to (\d+)$/.exec(ph))) t = (+m[1] % 12) * 60 - 15;
    else assert.fail('unknown phrase ' + ph);
    assert.strictEqual(correctLabel(q), clockLabel(t), ph);
  });
});
test('ampm: AM/PM and day-part answers match the activity', () => {
  sample('ampm', 'ampm', 15).forEach(q => {
    const act = L.ACTS.find(a => q.prompt.indexOf(a.phrase + '!') !== -1);
    assert.ok(act, q.prompt); assert.strictEqual(q.correct, act.period);
    assert.strictEqual(parseClock(q.prompt), parseClock(clockLabel(q.clocks[0].c)));
  });
  sample('ampm', 'daypart', 16).forEach(q => {
    const act = L.ACTS.find(a => q.prompt.indexOf(a.phrase + '!') !== -1);
    const m = /(\d+):(\d\d) (AM|PM)/.exec(q.prompt), t = L.makeT(+m[1], +m[2], m[3]);
    assert.strictEqual(m[3], act.period); assert.strictEqual(q.correct, L.dayPart(t));
  });
});
test('ampm/besttime: exactly one option has the right period; the same clock reading with the wrong period is offered', () => {
  let flipped = 0;
  sample('ampm', 'besttime', 17).forEach(q => {
    const act = L.ACTS.find(a => q.prompt.indexOf(a.phrase + '?') !== -1);
    const right = correctLabel(q);
    assert.strictEqual(right.slice(-2), act.period);
    q.options.forEach(o => { if (o.label !== right) assert.strictEqual(o.label.slice(-2), act.period === 'AM' ? 'PM' : 'AM', q.prompt + ' / ' + o.label); });
    if (q.options.some(o => o.label !== right && o.label.slice(0, -2) === right.slice(0, -2))) flipped++;
  });
  assert.ok(flipped > N * 0.9, 'flipped AM/PM option should nearly always be present, got ' + flipped);
});
test('ampm/sameclock and facts', () => {
  sample('ampm', 'sameclock', 18).forEach(q => {
    const m = /Which one happens at (\d+:\d\d) (AM|PM)\?/.exec(q.prompt);
    const act = L.ACTS.find(a => a.id === q.correct);
    assert.strictEqual(act.period, m[2]);
    assert.ok(act.times.some(([h, mm]) => h + ':' + String(mm).padStart(2, '0') === m[1]));
  });
});
test('ba: after/before plain questions', () => {
  ['after', 'before'].forEach((kind, i) => sample('ba', kind, 20 + i).forEach(q => {
    const m = /What time is (\d+) minutes (after|before) (\d+:\d\d)\?/.exec(q.prompt);
    assert.strictEqual(m[2], kind);
    const t = parseClock(m[3]) + (kind === 'after' ? 1 : -1) * +m[1];
    assert.strictEqual(correctLabel(q), clockLabel(t), q.prompt);
  }));
});
test('ba: story, set-the-clock and pick-the-clock questions', () => {
  sample('ba', 'story', 22).forEach(q => {
    const S = /(\d+:\d\d)/.exec(q.prompt)[1], d = +/(\d+) minutes/.exec(q.prompt)[1];
    const before = /before|early/.test(q.prompt);
    assert.strictEqual(correctLabel(q), clockLabel(parseClock(S) + (before ? -d : d)), q.prompt);
  });
  sample('ba', 'setshift', 23).forEach(q => {
    const m = /shows (\d+:\d\d)\. Move the hands to show (\d+) minutes (after|before)/.exec(q.prompt);
    assert.strictEqual(q.target, ((parseClock(m[1]) + (m[3] === 'after' ? 1 : -1) * +m[2]) % 720 + 720) % 720);
    assert.strictEqual(q.startC, parseClock(m[1]));
  });
  sample('ba', 'pickshift', 24).forEach(q => {
    const m = /shows (\d+) minutes (after|before) (\d+:\d\d)\?/.exec(q.prompt);
    const right = q.options.find(o => o.value === q.correct);
    assert.strictEqual(clockLabel(right.clockC), clockLabel(parseClock(m[3]) + (m[2] === 'after' ? 1 : -1) * +m[1]));
  });
});
test('ba: shifts cross the hour and the 12 about half of the time', () => {
  const qs = sample('ba', 'after', 25);
  const crossing = qs.filter(q => { const m = /(\d+) minutes after (\d+):(\d\d)/.exec(q.prompt); return +m[3] + +m[1] >= 60; }).length;
  assert.ok(crossing > N * 0.35 && crossing < N * 0.65, 'crossing ' + crossing);
  const over12 = qs.filter(q => /^12:/.test(correctLabel(q)) && !/ 12:/.test(q.prompt.split(' after ')[1] || '')).length;
  assert.ok(over12 > 0, 'should sometimes land on 12:xx');
  const before = sample('ba', 'before', 26).filter(q => { const m = /(\d+) minutes before (\d+):(\d\d)/.exec(q.prompt); return +m[3] - +m[1] < 0; }).length;
  assert.ok(before > N * 0.35, 'before-crossing ' + before);
});
test('dur: start/end questions', () => {
  ['dursame', 'durcross', 'durhm'].forEach((kind, i) => sample('dur', kind, 30 + i).forEach(q => {
    const m = /starts at (\d+:\d\d) and ends at (\d+:\d\d)/.exec(q.prompt);
    const d = (((parseClock(m[2]) - parseClock(m[1])) % 720) + 720) % 720;
    assert.strictEqual(correctLabel(q), durLabel(d), q.prompt);
    if (kind === 'dursame') assert.ok(d < 60 && L.c12Parts(q.meta.end).m > L.c12Parts(q.meta.start).m);
    if (kind === 'durcross') assert.ok(d < 60 && L.c12Parts(q.meta.end).m < L.c12Parts(q.meta.start).m, 'must cross the hour');
    if (kind === 'durhm') assert.ok(d > 60);
  }));
  sample('dur', 'findend', 33).forEach(q => {
    const m = /starts at (\d+:\d\d) and lasts (.*)\. What time/.exec(q.prompt);
    assert.strictEqual(correctLabel(q), clockLabel(parseClock(m[1]) + parseDur(m[2])), q.prompt);
  });
  sample('dur', 'findstart', 34).forEach(q => {
    const m = /ended at (\d+:\d\d) and lasted (.*)\. What time/.exec(q.prompt);
    assert.strictEqual(correctLabel(q), clockLabel(parseClock(m[1]) - parseDur(m[2])), q.prompt);
  });
});
test('hm: conversions', () => {
  sample('hm', 'hm2min', 40).forEach(q => {
    const m = /^(.*) = ___ minutes$/.exec(q.prompt);
    assert.strictEqual(parseDur(correctLabel(q)), parseDur(m[1]), q.prompt);
  });
  sample('hm', 'min2hm', 41).forEach(q => {
    const n = +/^(\d+) minutes = ___$/.exec(q.prompt)[1];
    assert.strictEqual(correctLabel(q), durLabel(n));
    assert.strictEqual(parseDur(correctLabel(q)), n);
  });
  sample('hm', 'hours2min', 42).forEach(q => {
    const h = +/^(\d+) hours? = ___ minutes$/.exec(q.prompt)[1];
    assert.strictEqual(parseDur(correctLabel(q)), h * 60);
  });
  sample('hm', 'compare', 43).forEach(q => {
    const [a, b] = q.options.map(o => parseDur(o.label));
    assert.notStrictEqual(a, b, 'a tie is not allowed');
    assert.strictEqual(parseDur(correctLabel(q)), Math.max(a, b));
  });
});
test('the "1 hour 10 minutes = 70" and "90 = 1 hour 30" style traps never produce two equal options', () => {
  allKinds.forEach(([sec, kind], i) => {
    sample(sec, kind, 300 + i, 400).forEach(q => {
      if (q.type !== 'mc') return;
      const mins = q.options.map(o => (/hour|minute/.test(o.label) ? parseDur(o.label) : o.label));
      assert.strictEqual(new Set(mins).size, mins.length, q.prompt + ' ' + JSON.stringify(q.options.map(o => o.label)));
    });
  });
});

console.log('Arabic text');
test('Arabic durations read correctly', () => {
  assert.strictEqual(L.fmtDurationAr(35), '35 دقيقة'); assert.strictEqual(L.fmtDurationAr(5), '5 دقائق'); assert.strictEqual(L.fmtDurationAr(10), '10 دقائق');
  assert.strictEqual(L.fmtDurationAr(60), 'ساعة'); assert.strictEqual(L.fmtDurationAr(120), 'ساعتان'); assert.strictEqual(L.fmtDurationAr(180), '3 ساعات');
  assert.strictEqual(L.fmtDurationAr(70), 'ساعة و10 دقائق'); assert.strictEqual(L.fmtDurationAr(90), 'ساعة و30 دقيقة'); assert.strictEqual(L.fmtDurationAr(125), 'ساعتان و5 دقائق');
});
test('no English unit words inside Arabic lines (they scramble the reading order)', () => {
  allKinds.forEach(([sec, kind], i) => {
    sample(sec, kind, 700 + i, 300).forEach(q => {
      const lines = [q.ar, q.explain.ar].concat(q.hints.map(h => h.ar));
      lines.forEach(s => assert.ok(!/\b(minutes?|hours?|min|hr)\b/i.test(s), sec + '/' + kind + ': ' + s));
    });
  });
});

test('Arabic talks to a group (plural), never to one girl, and the page title is set', () => {
  const fs = require('fs'), path = require('path');
  const text = ['script.js', 'index.html'].map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  const singular = ['ابدئي', 'اجمعي', 'أحسنتِ', 'اختاري', 'ارجعي', 'استخدمي', 'اسحبي', 'اصنعي', 'اضبطي', 'اضغطي', 'أضيفي', 'اطرحي', 'أظهري', 'أعيدي',
    'اقتربتِ', 'اقفزي', 'انتبهي', 'انظري', 'أنهيتِ', 'تحقّقي', 'تدرّبي', 'تذكّري', 'تعلّمي', 'جرّبي', 'حاولي', 'حرّكي', 'حصلتِ', 'حللتِ', 'حوّلي', 'خذي',
    'شاهدي', 'عدّي', 'فكّري', 'قارني', 'لترَي', 'لتصبحي', 'مررتِ', 'وارجعي', 'وتقدّمي', 'وشاهدي', 'وعدّي', 'أنتِ', 'تستطيعين', 'إجابتك', 'مثالك',
    'تساعدك', 'يخبرك', 'جاهزة', 'عاملة', 'بيكي', 'كنزي', 'سيّدة', 'Kenzy'];
  const AR = '\\u0621-\\u064A\\u064B-\\u0652\\u0670';
  singular.forEach(w => assert.ok(!new RegExp('(?<![' + AR + '])' + w + '(?![' + AR + '])').test(text), 'still found: ' + w));
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('<title>Time Explorer · مستكشف الوقت</title>'));
  assert.ok(html.includes('أهلًا بيكو يا حلوين!'));
});

console.log('Decks');
test('a section deck starts with different kinds; challenge mixes all five topics twice', () => {
  const rnd = L.makeRng(5);
  L.SECTION_IDS.forEach(sec => {
    const deck = L.buildDeck(sec, rnd);
    assert.strictEqual(new Set(deck.map(d => d.kind)).size, deck.length);
    assert.ok(deck.length >= 5);
  });
  for (let i = 0; i < 50; i++) {
    const deck = L.buildDeck('challenge', rnd);
    assert.strictEqual(deck.length, 10);
    L.SECTION_IDS.forEach(sec => assert.strictEqual(deck.filter(d => d.section === sec).length, 2));
    deck.forEach(d => assert.deepStrictEqual(L.validateQuestion(L.makeQuestion(d, rnd)), []));
  }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
