/* Time Explorer
   Part 1: time logic + question generators (pure, no DOM — tested by tests/run-tests.js)
   Part 2: clock widget, lessons, practice, rewards (browser only)
   Plain JavaScript, no dependencies. Works when index.html is opened directly. */
(function () {
  'use strict';

  /* =====================================================================
     PART 1 — TIME LOGIC
     ===================================================================== */

  const DAY = 1440;   // minutes in a day
  const HALF = 720;   // minutes on a 12-hour dial
  const mod = (n, m) => ((n % m) + m) % m;
  const pad2 = n => String(n).padStart(2, '0');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  // Clock time "c": minutes after 12:00 on a 12-hour dial (0..719). 12:00 -> 0, 3:30 -> 210.
  const c12 = (h12, m) => mod((h12 % 12) * 60 + m, HALF);
  function c12Parts(c) {
    c = mod(c, HALF);
    const h = Math.floor(c / 60);
    return { h12: h === 0 ? 12 : h, m: c % 60 };
  }
  const fmtC = c => { const p = c12Parts(c); return p.h12 + ':' + pad2(p.m); };
  const addC = (c, d) => mod(c + d, HALF);
  const durC = (a, b) => mod(b - a, HALF);

  // Day time "t": minutes after midnight (0..1439). 12:00 AM -> 0, 12:00 PM -> 720.
  const makeT = (h12, m, period) => mod((h12 % 12) * 60 + m + (period === 'PM' ? HALF : 0), DAY);
  function tParts(t) {
    t = mod(t, DAY);
    const h24 = Math.floor(t / 60);
    return { h24, h12: h24 % 12 === 0 ? 12 : h24 % 12, m: t % 60, period: h24 < 12 ? 'AM' : 'PM' };
  }
  const fmtT = t => { const p = tParts(t); return p.h12 + ':' + pad2(p.m) + ' ' + p.period; };
  // morning: 5:00 AM-11:59 AM, afternoon: 12:00 PM-4:59 PM, evening (and night): 5:00 PM-4:59 AM
  function dayPart(t) {
    const h = tParts(t).h24;
    return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : 'evening';
  }

  // Hand angles (degrees clockwise from 12). The hour hand moves 0.5 degrees per minute.
  function handAngles(c) {
    c = mod(c, HALF);
    return { hour: c * 0.5, minute: (c % 60) * 6 };
  }

  function fmtDuration(mins) {
    const h = Math.floor(mins / 60), m = mins % 60, out = [];
    if (h) out.push(plural(h, 'hour'));
    if (m || !h) out.push(plural(m, 'minute'));
    return out.join(' ');
  }

  // Arabic wording for a duration, so Arabic lines never contain English words (they break the reading order).
  function fmtDurationAr(mins) {
    const h = Math.floor(mins / 60), m = mins % 60, out = [];
    if (h) out.push(h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : h + (h <= 10 ? ' ساعات' : ' ساعة'));
    if (m || !h) out.push(m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتان' : m + (m <= 10 ? ' دقائق' : ' دقيقة'));
    return out.join(' و');
  }

  function timeWords(c) {
    const p = c12Parts(c);
    if (p.m === 0) return p.h12 + " o'clock";
    if (p.m === 15) return 'quarter past ' + p.h12;
    if (p.m === 30) return 'half past ' + p.h12;
    if (p.m === 45) return 'quarter to ' + ((p.h12 % 12) + 1);
    return null;
  }

  // ---------- random helpers (rnd is a function returning [0,1)) ----------
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
  function shuffle(rnd, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- answer options ----------
  // Every option is { value, label, pr? }. `value` is the canonical string used for checking;
  // two options with the same value can never appear together.
  const timeOpt = (c, pr) => ({ value: String(mod(c, HALF)), label: fmtC(c), pr: !!pr, clockC: mod(c, HALF) });
  const minOpt = (n, pr) => (n > 0 ? { value: String(n), label: plural(n, 'minute'), pr: !!pr } : null);
  const durOpt = (n, pr) => (n > 0 ? { value: String(n), label: fmtDuration(n), pr: !!pr } : null);
  const dayOpt = (t, pr) => ({ value: String(mod(t, DAY)), label: fmtT(t), pr: !!pr });
  const txtOpt = (label, pr) => ({ value: label, label, pr: !!pr });

  function buildOptions(rnd, correct, cands, n) {
    const seen = new Set([correct.value]);
    const hi = [], lo = [];
    cands.forEach(o => {
      if (!o || seen.has(o.value)) return;
      seen.add(o.value);
      (o.pr ? hi : lo).push(o);
    });
    const picked = shuffle(rnd, hi).concat(shuffle(rnd, lo)).slice(0, n - 1);
    return shuffle(rnd, [correct].concat(picked)).map(o => { const c = Object.assign({}, o); delete c.pr; return c; });
  }
  const mc = (base, options, correct) => Object.assign({ type: 'mc', options, correct: correct.value }, base);
  const T = (en, ar) => ({ en, ar });

  // ---------- fact banks (fixed-answer concept questions) ----------
  const CLOCK_FACTS = [
    { key: 'hour-hand', en: 'Which hand shows the HOURS?', ar: 'أي عقرب يُظهر الساعات؟',
      opts: ['The short hand', 'The long hand'], correct: 0,
      h1: T('One hand is short and one is long. Which one moves slowly?', 'هناك عقرب قصير وعقرب طويل. أيّهما يتحرك ببطء؟'),
      h2: T('The hour hand is the short one.', 'عقرب الساعات هو العقرب القصير.'),
      explain: T('The short hand is the hour hand. It moves slowly.', 'العقرب القصير هو عقرب الساعات، ويتحرك ببطء.') },
    { key: 'minute-hand', en: 'Which hand shows the MINUTES?', ar: 'أي عقرب يُظهر الدقائق؟',
      opts: ['The short hand', 'The long hand'], correct: 1,
      h1: T('One hand is short and one is long. Which one moves fast?', 'هناك عقرب قصير وعقرب طويل. أيّهما يتحرك بسرعة؟'),
      h2: T('The minute hand is the long one.', 'عقرب الدقائق هو العقرب الطويل.'),
      explain: T('The long hand is the minute hand. It moves faster.', 'العقرب الطويل هو عقرب الدقائق، ويتحرك أسرع.') },
    { key: 'full-turn', en: 'How long does the long hand take to go all the way around the clock?', ar: 'كم يستغرق العقرب الطويل ليدور دورة كاملة؟',
      opts: ['12 minutes', '30 minutes', '60 minutes', '100 minutes'], correct: 2,
      h1: T('A full turn of the long hand is one whole hour.', 'دورة كاملة للعقرب الطويل = ساعة كاملة.'),
      h2: T('1 hour = 60 minutes.', 'الساعة = 60 دقيقة.'),
      explain: T('One full turn of the long hand is 60 minutes. That is 1 hour.', 'دورة كاملة للعقرب الطويل = 60 دقيقة = ساعة واحدة.') },
    { key: 'next-number', en: 'The long hand moves from one number to the next number. How many minutes pass?', ar: 'العقرب الطويل ينتقل من رقم إلى الرقم التالي. كم دقيقة تمرّ؟',
      opts: ['1 minute', '5 minutes', '10 minutes', '12 minutes'], correct: 1,
      h1: T('Count by 5s around the clock: 5, 10, 15 ...', 'عدّوا بالخمسات حول الساعة: 5، 10، 15 ...'),
      h2: T('Each number on the clock is 5 minutes.', 'كل رقم على الساعة = 5 دقائق.'),
      explain: T('Each step from one number to the next is 5 minutes.', 'كل انتقال من رقم إلى الذي يليه = 5 دقائق.') },
    { key: 'one-turn', en: 'The long hand goes around the clock one time. How much time has passed?', ar: 'العقرب الطويل دار دورة واحدة. كم من الوقت مرّ؟',
      opts: ['5 minutes', '1 hour', '1 day', '1 minute'], correct: 1,
      h1: T('One full turn is 60 minutes.', 'دورة كاملة = 60 دقيقة.'),
      h2: T('60 minutes is the same as 1 hour.', '60 دقيقة = ساعة واحدة.'),
      explain: T('One turn of the long hand = 60 minutes = 1 hour.', 'دورة واحدة للعقرب الطويل = 60 دقيقة = ساعة.') }
  ];

  const AMPM_FACTS = [
    { key: 'noon', en: 'What do we call 12:00 in the middle of the day (12:00 PM)?', ar: 'ماذا نسمّي الساعة 12 في منتصف النهار؟',
      opts: ['Noon', 'Midnight'], correct: 0,
      h1: T('The sun is high in the sky at this time.', 'الشمس في أعلى السماء في هذا الوقت.'),
      h2: T('Noon is the middle of the day.', 'Noon = منتصف النهار.'),
      explain: T('12:00 PM is noon — the middle of the day.', '12:00 PM هو الظهر (noon) — منتصف النهار.') },
    { key: 'midnight', en: 'What do we call 12:00 in the middle of the night (12:00 AM)?', ar: 'ماذا نسمّي الساعة 12 في منتصف الليل؟',
      opts: ['Noon', 'Midnight'], correct: 1,
      h1: T('Everyone is asleep at this time.', 'الجميع نائمون في هذا الوقت.'),
      h2: T('Midnight is the middle of the night.', 'Midnight = منتصف الليل.'),
      explain: T('12:00 AM is midnight — the middle of the night.', '12:00 AM هو منتصف الليل (midnight).') },
    { key: 'day24', en: 'How many hours are there in one whole day?', ar: 'كم ساعة في اليوم الكامل؟',
      opts: ['12 hours', '24 hours', '60 hours', '100 hours'], correct: 1,
      h1: T('A day has a morning half and an evening half.', 'اليوم له نصف صباحي ونصف مسائي.'),
      h2: T('12 hours + 12 hours = ?', '12 ساعة + 12 ساعة = ؟'),
      explain: T('One day has 24 hours: 12 hours AM and 12 hours PM.', 'اليوم 24 ساعة: 12 ساعة AM و12 ساعة PM.') },
    { key: 'am', en: 'AM means the time is ...', ar: 'ماذا تعني AM؟',
      opts: ['before noon', 'after noon'], correct: 0,
      h1: T('AM is for the morning part of the day.', 'AM للجزء الصباحي من اليوم.'),
      h2: T('Think: A for "ahead of noon".', 'فكّروا: AM = قبل الظهر.'),
      explain: T('AM is for times before noon (12:00 in the middle of the day).', 'AM للأوقات قبل الظهر.') },
    { key: 'pm', en: 'PM means the time is ...', ar: 'ماذا تعني PM؟',
      opts: ['before noon', 'after noon'], correct: 1,
      h1: T('PM is for the afternoon and the night.', 'PM لما بعد الظهر وللمساء والليل.'),
      h2: T('PM comes after the middle of the day.', 'PM تأتي بعد منتصف النهار.'),
      explain: T('PM is for times after noon.', 'PM للأوقات بعد الظهر.') },
    { key: 'two-turns', en: 'In one whole day, the short hand goes around the clock ...', ar: 'في اليوم الكامل، العقرب القصير يدور حول الساعة ...',
      opts: ['1 time', '2 times', '3 times', '4 times'], correct: 1,
      h1: T('The clock face has 12 hours, but a day has 24 hours.', 'وجه الساعة فيه 12 ساعة، واليوم فيه 24 ساعة.'),
      h2: T('24 ÷ 12 = 2', '24 ÷ 12 = 2'),
      explain: T('The short hand goes around 2 times in 24 hours.', 'العقرب القصير يدور مرتين في 24 ساعة.') }
  ];

  const HM_FACTS = [
    { key: 'hour60', en: 'One hour is ___ minutes.', ar: 'الساعة الواحدة = ___ دقيقة.',
      opts: ['30 minutes', '60 minutes', '100 minutes', '12 minutes'], correct: 1,
      h1: T('This is the most important rule of time!', 'هذه أهم قاعدة في الوقت!'),
      h2: T('One full turn of the long hand is 1 hour.', 'دورة كاملة للعقرب الطويل = ساعة.'),
      explain: T('1 hour = 60 minutes.', 'الساعة = 60 دقيقة.') },
    { key: 'half', en: 'Half an hour is ___ minutes.', ar: 'نصف ساعة = ___ دقيقة.',
      opts: ['15 minutes', '30 minutes', '45 minutes', '60 minutes'], correct: 1,
      h1: T('Half of 60 is ...', 'نصف 60 هو ...'),
      h2: T('60 ÷ 2 = 30', '60 ÷ 2 = 30'),
      explain: T('Half of 60 minutes is 30 minutes.', 'نصف الـ60 دقيقة = 30 دقيقة.') },
    { key: 'quarter', en: 'A quarter of an hour is ___ minutes.', ar: 'ربع ساعة = ___ دقيقة.',
      opts: ['10 minutes', '15 minutes', '25 minutes', '30 minutes'], correct: 1,
      h1: T('A quarter means 1 out of 4 equal parts.', 'الربع = جزء واحد من أربعة أجزاء متساوية.'),
      h2: T('60 ÷ 4 = 15', '60 ÷ 4 = 15'),
      explain: T('A quarter of 60 minutes is 15 minutes.', 'ربع الـ60 دقيقة = 15 دقيقة.') },
    { key: 'three-quarters', en: 'Three quarters of an hour is ___ minutes.', ar: 'ثلاثة أرباع الساعة = ___ دقيقة.',
      opts: ['30 minutes', '35 minutes', '45 minutes', '75 minutes'], correct: 2,
      h1: T('One quarter is 15 minutes. Take 3 of them.', 'الربع = 15 دقيقة. خذوا 3 أرباع.'),
      h2: T('15 + 15 + 15 = ?', '15 + 15 + 15 = ؟'),
      explain: T('3 × 15 = 45 minutes.', '3 × 15 = 45 دقيقة.') },
    { key: 'hour-half', en: '1 hour and a half is ___ minutes.', ar: 'ساعة ونصف = ___ دقيقة.',
      opts: ['75 minutes', '90 minutes', '130 minutes', '150 minutes'], correct: 1,
      h1: T('1 hour is 60 minutes. A half hour is 30 minutes.', 'الساعة = 60 دقيقة، ونصف الساعة = 30 دقيقة.'),
      h2: T('60 + 30 = ?', '60 + 30 = ؟'),
      explain: T('60 + 30 = 90 minutes.', '60 + 30 = 90 دقيقة.') }
  ];

  function factQuestion(rnd, bank) {
    const f = pick(rnd, bank);
    const options = shuffle(rnd, f.opts.map(txtOpt)).map(o => ({ value: o.value, label: o.label }));
    return mc({
      key: 'fact:' + f.key, prompt: f.en, ar: f.ar,
      hints: [f.h1, f.h2], explain: f.explain, meta: { fact: f.key }
    }, options, { value: f.opts[f.correct] });
  }

  // ---------- clock section ----------
  const rndC = rnd => c12(ri(rnd, 1, 12), rnd() < 0.5 ? pick(rnd, [0, 15, 30, 45]) : ri(rnd, 0, 11) * 5);

  function readCands(c) {
    const p = c12Parts(c);
    return [
      timeOpt(c12(p.m / 5 || 12, (p.h12 % 12) * 5), 1),      // hands swapped
      timeOpt(c12(p.h12 + 1, p.m), 1), timeOpt(c12(p.h12 - 1, p.m), 1),
      timeOpt(c + 5), timeOpt(c - 5), timeOpt(c + 10), timeOpt(c - 10), timeOpt(c + 30)
    ];
  }

  function genRead(rnd) {
    const c = rndC(rnd), p = c12Parts(c), n = p.m / 5, correct = timeOpt(c);
    return mc({
      key: 'read:' + c, prompt: 'What time does the clock show?', ar: 'ما الوقت الذي تُظهره الساعة؟',
      clocks: [{ c, label: '' }],
      hints: [
        T('The short hand shows the hour. The long hand shows the minutes.', 'العقرب القصير يُظهر الساعات، والطويل يُظهر الدقائق.'),
        p.m === 0 ? T('The long hand points to 12, so it is exactly o\'clock.', 'العقرب الطويل عند 12، إذن الساعة تمامًا.')
          : T('Count by 5s with the long hand. It points to ' + n + ', so that is ' + p.m + ' minutes.', 'عدّوا بالخمسات: العقرب الطويل عند ' + n + '، أي ' + p.m + ' دقيقة.')
      ],
      explain: p.m === 0
        ? T('The long hand points to 12, so it is exactly ' + p.h12 + " o'clock.", 'العقرب الطويل عند 12، فالساعة ' + p.h12 + ' تمامًا.')
        : T('The short hand has passed ' + p.h12 + ', so the hour is ' + p.h12 + '. The long hand points to ' + n + ': ' + n + ' × 5 = ' + p.m + ' minutes. The time is ' + fmtC(c) + '.',
            'العقرب القصير تجاوز ' + p.h12 + '، فالساعة ' + p.h12 + '. والعقرب الطويل عند ' + n + ': ' + n + ' × 5 = ' + p.m + ' دقيقة. الوقت ' + fmtC(c) + '.'),
      meta: { c }
    }, buildOptions(rnd, correct, readCands(c), 4), correct);
  }

  function genSet(rnd) {
    const c = rndC(rnd), p = c12Parts(c), words = timeWords(c);
    const startC = c === 0 ? c12(6, 0) : 0;
    return {
      type: 'setclock', key: 'set:' + c, target: c, startC,
      prompt: 'Set the clock to ' + fmtC(c) + (words ? ' (' + words + ')' : '') + '.',
      ar: 'اضبطوا عقارب الساعة على ' + fmtC(c) + '.',
      hints: [
        T('Move the long hand first. Each number is 5 minutes.', 'حرّكوا العقرب الطويل أولًا. كل رقم = 5 دقائق.'),
        T('The long hand goes on ' + (p.m / 5 || 12) + ' (' + p.m + ' minutes). The short hand goes near ' + p.h12 + '.', 'العقرب الطويل على ' + (p.m / 5 || 12) + ' (' + p.m + ' دقيقة)، والقصير قرب ' + p.h12 + '.')
      ],
      explain: T('Long hand on ' + (p.m / 5 || 12) + ' = ' + p.m + ' minutes. Short hand at ' + p.h12 + '. That makes ' + fmtC(c) + '.',
                 'العقرب الطويل على ' + (p.m / 5 || 12) + ' = ' + p.m + ' دقيقة، والقصير عند ' + p.h12 + '. الوقت ' + fmtC(c) + '.'),
      meta: { c }
    };
  }

  function genNumberMin(rnd) {
    const N = ri(rnd, 1, 11), c = c12(ri(rnd, 1, 12), N * 5), correct = minOpt(N * 5);
    return mc({
      key: 'nummin:' + c, prompt: 'The long hand points to ' + N + '. How many minutes past the hour is it?',
      ar: 'العقرب الطويل عند الرقم ' + N + '. كم دقيقة مرّت بعد الساعة؟',
      clocks: [{ c, label: '' }],
      hints: [
        T('Each number on the clock is 5 minutes.', 'كل رقم على الساعة = 5 دقائق.'),
        T('Count by 5s up to ' + N + ': ' + Array.from({ length: N }, (_, i) => (i + 1) * 5).join(', ') + '.', 'عدّوا بالخمسات حتى ' + N + ': ' + Array.from({ length: N }, (_, i) => (i + 1) * 5).join('، ') + '.')
      ],
      explain: T(N + ' × 5 = ' + (N * 5) + ' minutes.', N + ' × 5 = ' + (N * 5) + ' دقيقة.'),
      meta: { N, c }
    }, buildOptions(rnd, correct, [minOpt(N, 1), minOpt(60 - N * 5, 1), minOpt((N + 1) * 5), minOpt((N - 1) * 5), minOpt(N * 5 + 10), minOpt(N * 5 + 15)], 4), correct);
  }

  function genWords(rnd) {
    const h = ri(rnd, 1, 12), m = pick(rnd, [0, 15, 30, 45]), c = c12(h, m), phrase = timeWords(c);
    const H = m === 45 ? (h % 12) + 1 : h, correct = timeOpt(c);
    const expEn = m === 0 ? '"' + phrase + '" means exactly ' + fmtC(c) + '.'
      : m === 15 ? '"' + phrase + '" means 15 minutes after ' + H + ':00, so ' + fmtC(c) + '.'
      : m === 30 ? '"' + phrase + '" means 30 minutes after ' + H + ':00, so ' + fmtC(c) + '.'
      : '"' + phrase + '" means 15 minutes before ' + H + ':00, so ' + fmtC(c) + '.';
    const expAr = m === 0 ? 'تعني الساعة ' + fmtC(c) + ' تمامًا.'
      : m === 15 ? 'ربع ساعة بعد ' + H + ':00 = ' + fmtC(c) + '.'
      : m === 30 ? 'نصف ساعة بعد ' + H + ':00 = ' + fmtC(c) + '.'
      : 'ربع ساعة قبل ' + H + ':00 = ' + fmtC(c) + '.';
    return mc({
      key: 'words:' + c, prompt: 'Which time is "' + phrase + '"?', ar: 'أيّ وقت يعني "' + phrase + '"؟',
      hints: [
        T('"Past" means after the hour. "To" means before the next hour.', '"past" = بعد الساعة، و"to" = قبل الساعة التالية.'),
        T('A quarter of an hour is 15 minutes. Half an hour is 30 minutes.', 'ربع الساعة = 15 دقيقة، ونصف الساعة = 30 دقيقة.')
      ],
      explain: T(expEn, expAr), meta: { c }
    }, buildOptions(rnd, correct, [
      timeOpt(c12(H, 0), 1), timeOpt(c12(H, 15), 1), timeOpt(c12(H, 30), 1), timeOpt(c12(H, 45), 1),
      timeOpt(c12(H - 1, 30)), timeOpt(c12(H - 1, 15))
    ], 4), correct);
  }

  function genPickClock(rnd) {
    const c = rndC(rnd), correct = timeOpt(c);
    return mc({
      key: 'pickclock:' + c, prompt: 'Which clock shows ' + fmtC(c) + '?', ar: 'أيّ ساعة تُظهر الوقت ' + fmtC(c) + '؟',
      optionStyle: 'clock',
      hints: [
        T('Look at the short hand first. It tells you the hour.', 'انظروا إلى العقرب القصير أولًا؛ يخبركم بالساعة.'),
        T('Now check the long hand. It should show ' + c12Parts(c).m + ' minutes.', 'الآن انظروا إلى العقرب الطويل؛ يجب أن يُظهر ' + c12Parts(c).m + ' دقيقة.')
      ],
      explain: T('The short hand is near ' + c12Parts(c).h12 + ' and the long hand shows ' + c12Parts(c).m + ' minutes: ' + fmtC(c) + '.',
                 'العقرب القصير قرب ' + c12Parts(c).h12 + ' والطويل يُظهر ' + c12Parts(c).m + ' دقيقة: ' + fmtC(c) + '.'),
      meta: { c }
    }, buildOptions(rnd, correct, readCands(c), 4), correct);
  }

  // ---------- Morning or Evening section ----------
  // `times` are on the clock; `period` is when the activity really happens; `wrong` are clearly
  // silly times (in the opposite period) so every question has exactly one sensible answer.
  const ACTS = [
    { id: 'wake', emoji: '⏰', phrase: 'wake up', ar: 'تستيقظ', period: 'AM', times: [[6, 30], [7, 0]], wrong: [[9, 0], [2, 0], [11, 30], [10, 0]] },
    { id: 'breakfast', emoji: '🥣', phrase: 'eat breakfast', ar: 'تتناول الفطور', period: 'AM', times: [[7, 15], [7, 45]], wrong: [[9, 30], [3, 0], [11, 0], [10, 30]] },
    { id: 'school', emoji: '🚌', phrase: 'go to school', ar: 'تذهب إلى المدرسة', period: 'AM', times: [[7, 30], [8, 0]], wrong: [[9, 0], [11, 0], [10, 30], [8, 30]] },
    { id: 'lunch', emoji: '🍽️', phrase: 'have lunch', ar: 'تتناول الغداء', period: 'PM', times: [[12, 30], [1, 0]], wrong: [[3, 0], [5, 30], [4, 0], [2, 30]] },
    { id: 'play', emoji: '⚽', phrase: 'play outside after school', ar: 'تلعب في الخارج بعد المدرسة', period: 'PM', times: [[3, 0], [3, 30]], wrong: [[2, 0], [4, 30], [1, 0], [5, 0]] },
    { id: 'homework', emoji: '📚', phrase: 'do homework after school', ar: 'تحلّ الواجب بعد المدرسة', period: 'PM', times: [[4, 0], [4, 30]], wrong: [[2, 0], [3, 30], [1, 0], [5, 30]] },
    { id: 'dinner', emoji: '🍝', phrase: 'have dinner', ar: 'تتناول العشاء', period: 'PM', times: [[6, 30], [7, 0]], wrong: [[3, 0], [5, 0], [9, 0], [10, 30]] },
    { id: 'tv', emoji: '📺', phrase: 'watch TV after dinner', ar: 'تشاهد التلفاز بعد العشاء', period: 'PM', times: [[7, 30], [8, 0]], wrong: [[2, 0], [4, 30], [10, 0], [11, 30]] },
    { id: 'bed', emoji: '🛏️', phrase: 'go to bed', ar: 'تذهب إلى النوم', period: 'PM', times: [[8, 30], [9, 0]], wrong: [[10, 0], [11, 0], [7, 0], [10, 30]] }
  ];
  const ACT_BY_ID = {};
  ACTS.forEach(a => { ACT_BY_ID[a.id] = a; });
  const PART_LABEL = { morning: 'Morning 🌅', afternoon: 'Afternoon ☀️', evening: 'Evening / Night 🌙' };
  const PART_WORD = { morning: 'morning', afternoon: 'afternoon', evening: 'evening' };
  const clockStr = (h, m) => h + ':' + pad2(m);
  const oppositePeriod = p => (p === 'AM' ? 'PM' : 'AM');

  function genAmPm(rnd) {
    const a = pick(rnd, ACTS), [h, m] = pick(rnd, a.times), t = makeT(h, m, a.period), part = dayPart(t);
    const partWord = a.period === 'AM' ? 'morning' : PART_WORD[part];
    return mc({
      key: 'ampm:' + a.id + ':' + t,
      prompt: 'It is ' + clockStr(h, m) + '. ' + a.emoji + ' Time to ' + a.phrase + '! Is it AM or PM?',
      ar: 'الساعة ' + clockStr(h, m) + ' — هل هي AM (قبل الظهر) أم PM (بعد الظهر)؟',
      clocks: [{ c: c12(h, m), label: '' }],
      hints: [
        T('AM is before noon. PM is after noon.', 'AM قبل الظهر، و PM بعد الظهر.'),
        T('Do you ' + a.phrase + ' in the morning, or in the afternoon/evening?', 'هل ' + a.ar + ' في الصباح أم بعد الظهر؟')
      ],
      explain: T('We ' + a.phrase + ' in the ' + partWord + ', so it is ' + fmtT(t) + '.', 'نفعل ذلك في ' + (a.period === 'AM' ? 'الصباح' : 'ما بعد الظهر') + '، فالوقت ' + fmtT(t) + '.'),
      meta: { act: a.id, t }
    }, [txtOpt('AM (before noon)'), txtOpt('PM (after noon)')].map(o => ({ value: o.value.slice(0, 2), label: o.label })),
      { value: a.period });
  }

  function genDayPart(rnd) {
    const a = pick(rnd, ACTS), [h, m] = pick(rnd, a.times), t = makeT(h, m, a.period), part = dayPart(t);
    const options = ['morning', 'afternoon', 'evening'].map(k => ({ value: k, label: PART_LABEL[k] }));
    return mc({
      key: 'daypart:' + a.id + ':' + t,
      prompt: 'It is ' + fmtT(t) + '. ' + a.emoji + ' Time to ' + a.phrase + '! Which part of the day is it?',
      ar: 'الساعة ' + fmtT(t) + '. في أي جزء من اليوم نحن؟',
      clocks: [{ c: c12(h, m), label: '' }],
      hints: [
        T('Morning is before noon. Afternoon is from noon until about 5 PM. Evening/Night is after that.', 'الصباح قبل الظهر، وبعد الظهر حتى نحو 5 مساءً، ثم المساء/الليل.'),
        T(a.period === 'AM' ? 'This time is AM, so it is before noon.' : 'This time is PM, so it is after noon.', a.period === 'AM' ? 'هذا الوقت AM، أي قبل الظهر.' : 'هذا الوقت PM، أي بعد الظهر.')
      ],
      explain: T(fmtT(t) + ' is in the ' + (part === 'evening' ? 'evening/night' : part) + '.', fmtT(t) + ' يقع في ' + { morning: 'الصباح', afternoon: 'فترة ما بعد الظهر', evening: 'المساء/الليل' }[part] + '.'),
      meta: { act: a.id, t, part }
    }, options, { value: part });
  }

  function genBestTime(rnd) {
    const a = pick(rnd, ACTS), [h, m] = pick(rnd, a.times), t = makeT(h, m, a.period), opp = oppositePeriod(a.period);
    const correct = dayOpt(t);
    const wrongs = shuffle(rnd, a.wrong).map(([wh, wm]) => dayOpt(makeT(wh, wm, opp)));
    return mc({
      key: 'best:' + a.id + ':' + t,
      prompt: 'When do you ' + a.phrase + '? ' + a.emoji, ar: 'متى ' + a.ar + '؟ اختاروا الوقت المناسب.',
      hints: [
        T('Look at AM and PM carefully. The same number can be morning or night!', 'انتبهوا إلى AM و PM. نفس الرقم قد يكون صباحًا أو مساءً!'),
        T('You ' + a.phrase + (a.period === 'AM' ? ' in the morning, so pick AM.' : ' after noon, so pick PM.'), 'هذا يحدث ' + (a.period === 'AM' ? 'في الصباح، اختاروا AM.' : 'بعد الظهر، اختاروا PM.'))
      ],
      explain: T('We ' + a.phrase + ' at ' + fmtT(t) + '.', 'نفعل ذلك عند ' + fmtT(t) + '.'),
      meta: { act: a.id, t }
    }, buildOptions(rnd, correct, [dayOpt(makeT(h, m, opp), 1)].concat(wrongs.map((o, i) => (i < 1 ? Object.assign(o, { pr: true }) : o))), 4), correct);
  }

  const SAME_PAIRS = [[7, 0, 'wake', 'dinner'], [6, 30, 'wake', 'dinner'], [7, 30, 'school', 'tv'], [8, 0, 'school', 'tv']];
  function genSameClock(rnd) {
    const [h, m, amId, pmId] = pick(rnd, SAME_PAIRS), ask = pick(rnd, ['AM', 'PM']);
    const am = ACT_BY_ID[amId], pm = ACT_BY_ID[pmId], right = ask === 'AM' ? am : pm;
    const opts = shuffle(rnd, [am, pm]).map(a => ({ value: a.id, label: a.emoji + ' ' + a.phrase }));
    return mc({
      key: 'same:' + h + ':' + m + ':' + ask + ':' + amId,
      prompt: 'The clock shows ' + clockStr(h, m) + '. Which one happens at ' + clockStr(h, m) + ' ' + ask + '?',
      ar: 'الساعة تُظهر ' + clockStr(h, m) + '. أيّ نشاط يحدث عند ' + clockStr(h, m) + ' ' + ask + '؟',
      clocks: [{ c: c12(h, m), label: '' }],
      hints: [
        T('The same clock reading can be in the morning or in the evening!', 'نفس قراءة الساعة قد تكون صباحًا أو مساءً!'),
        T(ask === 'AM' ? 'AM is the morning. Which activity do we do in the morning?' : 'PM is after noon. Which activity do we do in the evening?', ask === 'AM' ? 'AM هو الصباح. أيّ نشاط نفعله صباحًا؟' : 'PM بعد الظهر. أيّ نشاط نفعله مساءً؟')
      ],
      explain: T(clockStr(h, m) + ' AM: time to ' + am.phrase + '. ' + clockStr(h, m) + ' PM: time to ' + pm.phrase + '. Same clock, different times!', 'نفس الساعة لكن وقتان مختلفان: ' + clockStr(h, m) + ' AM و ' + clockStr(h, m) + ' PM!'),
      meta: { h, m, ask, answer: right.id }
    }, opts, { value: right.id });
  }

  // ---------- After & Before section ----------
  const D_SHIFT = [5, 10, 15, 20, 30, 35];

  function shiftScenario(rnd, dir) {
    const d = pick(rnd, D_SHIFT), cross = rnd() < 0.5;
    let mi;
    if (dir > 0) mi = cross ? ri(rnd, (60 - d) / 5, 11) : ri(rnd, 0, (60 - d) / 5 - 1);
    else mi = cross ? ri(rnd, 0, d / 5 - 1) : ri(rnd, d / 5, 11);
    const start = c12(ri(rnd, 1, 12), mi * 5);
    return { d, dir, start, end: addC(start, dir * d), cross };
  }
  function shiftCands(s) {
    const sp = c12Parts(s.start);
    return [
      timeOpt(addC(s.start, -s.dir * s.d), 1),
      timeOpt(c12(sp.h12, c12Parts(s.end).m), 1),
      timeOpt(s.end + 5), timeOpt(s.end - 5), timeOpt(s.end + 10), timeOpt(s.end - 10), timeOpt(s.end + 60), timeOpt(s.end - 60)
    ];
  }
  function shiftHints(s) {
    const w = s.dir > 0 ? 'forward' : 'backward', steps = s.d / 5;
    return [
      T('Move the long hand ' + w + '. Each number is 5 minutes, so ' + s.d + ' minutes = ' + steps + (steps === 1 ? ' number.' : ' numbers.'),
        'حرّكوا العقرب الطويل ' + (s.dir > 0 ? 'للأمام' : 'للخلف') + '. كل رقم = 5 دقائق، إذن ' + s.d + ' دقيقة = ' + steps + ' (أرقام).'),
      T('Start at ' + fmtC(s.start) + ' and count ' + steps + (steps === 1 ? ' number ' : ' numbers ') + w + '. If you pass 12, the hour changes!',
        'ابدؤوا من ' + fmtC(s.start) + ' وعدّوا ' + steps + ' ' + (s.dir > 0 ? 'للأمام' : 'للخلف') + '. إذا مررتم بالرقم 12 تتغير الساعة!')
    ];
  }
  function shiftExplain(s) {
    const sign = s.dir > 0 ? '+' : '−';
    return T(fmtC(s.start) + ' ' + sign + ' ' + s.d + ' minutes = ' + fmtC(s.end) + '.' + (s.cross ? ' The long hand passed 12, so the hour changed.' : ''),
             fmtC(s.start) + ' ' + sign + ' ' + s.d + ' دقيقة = ' + fmtC(s.end) + '.' + (s.cross ? ' العقرب الطويل مرّ بالرقم 12 فتغيرت الساعة.' : ''));
  }

  const genShiftPlain = dir => rnd => {
    const s = shiftScenario(rnd, dir), w = dir > 0 ? 'after' : 'before', S = fmtC(s.start), correct = timeOpt(s.end);
    return mc({
      key: w + ':' + s.start + ':' + s.d, prompt: 'What time is ' + s.d + ' minutes ' + w + ' ' + S + '?',
      ar: 'ما الوقت ' + (dir > 0 ? 'بعد' : 'قبل') + ' ' + S + ' بـ ' + s.d + ' دقيقة؟',
      clocks: [{ c: s.start, label: S }], hints: shiftHints(s), explain: shiftExplain(s), meta: s
    }, buildOptions(rnd, correct, shiftCands(s), 4), correct);
  };

  const STORY_AFTER = [
    (S, d) => 'Class starts at ' + S + '. Break time is ' + d + ' minutes after that. When is break time?',
    (S, d) => 'The cake goes in the oven at ' + S + '. It is ready ' + d + ' minutes later. When is the cake ready?',
    (S, d) => 'Lina starts reading at ' + S + '. She reads for ' + d + ' minutes. What time does she stop?',
    (S, d) => 'The game begins at ' + S + '. Half-time is ' + d + ' minutes later. What time is half-time?'
  ];
  const STORY_BEFORE = [
    (S, d) => 'School starts at ' + S + '. The bus comes ' + d + ' minutes before school starts. What time does the bus come?',
    (S, d) => 'The show starts at ' + S + '. We want to arrive ' + d + ' minutes early. What time do we arrive?',
    (S, d) => 'Dinner is at ' + S + '. Dad starts cooking ' + d + ' minutes before dinner. When does he start?'
  ];
  function genStory(rnd) {
    const dir = rnd() < 0.5 ? 1 : -1, s = shiftScenario(rnd, dir), S = fmtC(s.start), correct = timeOpt(s.end);
    const tpl = pick(rnd, dir > 0 ? STORY_AFTER : STORY_BEFORE);
    return mc({
      key: 'story:' + dir + ':' + s.start + ':' + s.d + ':' + tpl(S, s.d).length,
      prompt: tpl(S, s.d), ar: (dir > 0 ? 'أضيفوا ' : 'اطرحوا ') + s.d + ' دقيقة ' + (dir > 0 ? 'إلى ' : 'من ') + S + '.',
      clocks: [{ c: s.start, label: S }], hints: shiftHints(s), explain: shiftExplain(s), meta: s
    }, buildOptions(rnd, correct, shiftCands(s), 4), correct);
  }

  function genSetShift(rnd) {
    const dir = rnd() < 0.5 ? 1 : -1, s = shiftScenario(rnd, dir), w = dir > 0 ? 'after' : 'before';
    return {
      type: 'setclock', key: 'setshift:' + dir + ':' + s.start + ':' + s.d, startC: s.start, target: s.end,
      prompt: 'The clock shows ' + fmtC(s.start) + '. Move the hands to show ' + s.d + ' minutes ' + w + ' ' + fmtC(s.start) + '.',
      ar: 'الساعة تُظهر ' + fmtC(s.start) + '. حرّكوا العقارب لتُظهر الوقت ' + (dir > 0 ? 'بعد' : 'قبل') + ' ' + s.d + ' دقيقة.',
      hints: shiftHints(s), explain: shiftExplain(s), meta: s
    };
  }

  function genPickShift(rnd) {
    const dir = rnd() < 0.5 ? 1 : -1, s = shiftScenario(rnd, dir), w = dir > 0 ? 'after' : 'before', S = fmtC(s.start), correct = timeOpt(s.end);
    return mc({
      key: 'pickshift:' + dir + ':' + s.start + ':' + s.d, optionStyle: 'clock',
      prompt: 'Which clock shows ' + s.d + ' minutes ' + w + ' ' + S + '?',
      ar: 'أيّ ساعة تُظهر الوقت ' + (dir > 0 ? 'بعد' : 'قبل') + ' ' + S + ' بـ ' + s.d + ' دقيقة؟',
      clocks: [{ c: s.start, label: S }], hints: shiftHints(s), explain: shiftExplain(s), meta: s
    }, buildOptions(rnd, correct, shiftCands(s), 4), correct);
  }

  // ---------- Duration section ----------
  function minuteDistractors(d, extra) {
    return [minOpt(d + 5, 1), minOpt(d - 5, 1)].concat(extra || [], [minOpt(d + 10), minOpt(d - 10), minOpt(60 - d), minOpt(d + 15)]);
  }
  const SHOWS = ['A TV show', 'A swimming lesson', 'A football game', 'A birthday party', 'A cooking class'];

  function genDurSame(rnd) {
    const m = ri(rnd, 0, 9) * 5, d = ri(rnd, Math.min(2, (55 - m) / 5), (55 - m) / 5) * 5;
    const start = c12(ri(rnd, 1, 12), m), end = addC(start, d), correct = minOpt(d), S = fmtC(start), E = fmtC(end), thing = pick(rnd, SHOWS);
    return mc({
      key: 'dursame:' + start + ':' + d, prompt: thing + ' starts at ' + S + ' and ends at ' + E + '. How long is it?',
      ar: 'يبدأ عند ' + S + ' وينتهي عند ' + E + '. كم تستغرق المدة؟',
      clocks: [{ c: start, label: 'Start ' + S }, { c: end, label: 'End ' + E }],
      hints: [
        T('Duration means how long it takes. Look at how far the long hand moves.', 'المدة = كم يستغرق الشيء. انظروا كم يتحرك العقرب الطويل.'),
        T('Count by 5s from ' + S + ' to ' + E + ': the long hand moves ' + d / 5 + ' numbers.', 'عدّوا بالخمسات من ' + S + ' إلى ' + E + ': العقرب الطويل يتحرك ' + d / 5 + ' (أرقام).')
      ],
      explain: T('From ' + S + ' to ' + E + ' is ' + d / 5 + ' jumps of 5 minutes: ' + d + ' minutes.', 'من ' + S + ' إلى ' + E + ' = ' + d / 5 + ' قفزات × 5 = ' + d + ' دقيقة.'),
      meta: { start, end, d }
    }, buildOptions(rnd, correct, minuteDistractors(d, [minOpt(c12Parts(end).m, 1)]), 4), correct);
  }

  function genDurCross(rnd) {
    const d = ri(rnd, 2, 11) * 5, m = ri(rnd, (65 - d) / 5, 11) * 5;
    const start = c12(ri(rnd, 1, 12), m), end = addC(start, d), correct = minOpt(d), S = fmtC(start), E = fmtC(end), e = c12Parts(end).m;
    const thing = pick(rnd, ['Practice', 'The movie', 'The lesson', 'The party']);
    return mc({
      key: 'durcross:' + start + ':' + d, prompt: thing + ' starts at ' + S + ' and ends at ' + E + '. How many minutes is it?',
      ar: 'يبدأ عند ' + S + ' وينتهي عند ' + E + '. كم دقيقة؟',
      clocks: [{ c: start, label: 'Start ' + S }, { c: end, label: 'End ' + E }],
      hints: [
        T('Jump to the next hour first. Then add the rest.', 'اقفزوا أولًا إلى الساعة التالية، ثم أضيفوا الباقي.'),
        T('From ' + S + ' to the next hour is ' + (60 - m) + ' minutes. Then ' + e + ' more minutes.', 'من ' + S + ' إلى الساعة التالية ' + (60 - m) + ' دقيقة، ثم ' + e + ' دقيقة أخرى.')
      ],
      explain: T((60 - m) + ' minutes to the next hour + ' + e + ' minutes = ' + d + ' minutes.', (60 - m) + ' دقيقة حتى الساعة التالية + ' + e + ' دقيقة = ' + d + ' دقيقة.'),
      meta: { start, end, d }
    }, buildOptions(rnd, correct, minuteDistractors(d, [minOpt(e, 1), minOpt(60 - m, 1)]), 4), correct);
  }

  const LONG_D = [65, 70, 75, 80, 90, 95, 100, 105, 110, 120, 130, 135, 140, 150, 165, 170, 180];
  function genDurHM(rnd) {
    const d = pick(rnd, LONG_D), start = rndC(rnd), end = addC(start, d), correct = durOpt(d), S = fmtC(start), E = fmtC(end);
    const hrs = Math.floor(d / 60), rest = d % 60;
    return mc({
      key: 'durhm:' + start + ':' + d, prompt: 'A movie starts at ' + S + ' and ends at ' + E + '. How long is the movie?',
      ar: 'الفيلم يبدأ عند ' + S + ' وينتهي عند ' + E + '. كم مدته؟',
      clocks: [{ c: start, label: 'Start ' + S }, { c: end, label: 'End ' + E }],
      hints: [
        T('Count the whole hours first. Then count the extra minutes.', 'عدّوا الساعات الكاملة أولًا، ثم الدقائق الزائدة.'),
        T('The short hand moves ' + plural(hrs, 'hour') + '. Then there are ' + (rest ? rest + ' extra minutes.' : 'no extra minutes.'), 'العقرب القصير يتحرك ' + hrs + ' (ساعات)، ثم ' + (rest ? rest + ' دقيقة زائدة.' : 'لا دقائق زائدة.'))
      ],
      explain: T('From ' + S + ' to ' + E + ': ' + fmtDuration(d) + '.', 'من ' + S + ' إلى ' + E + ' = ' + fmtDurationAr(d) + '.'),
      meta: { start, end, d }
    }, buildOptions(rnd, correct, [durOpt(d + 10, 1), durOpt(d - 10, 1), durOpt(d + 60, 1), durOpt(d - 60), durOpt(d + 30), durOpt(d - 30), durOpt(d + 5), durOpt(d - 5)], 4), correct);
  }

  const END_D = [20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120];
  function genFindEnd(rnd) {
    const d = pick(rnd, END_D), start = rndC(rnd), end = addC(start, d), correct = timeOpt(end), S = fmtC(start), E = fmtC(end);
    const thing = pick(rnd, ['A movie', 'A class', 'A swimming lesson', 'A birthday party', 'A football game']);
    return mc({
      key: 'findend:' + start + ':' + d, prompt: thing + ' starts at ' + S + ' and lasts ' + fmtDuration(d) + '. What time does it end?',
      ar: 'يبدأ عند ' + S + ' ويستمر ' + fmtDurationAr(d) + '. متى ينتهي؟',
      clocks: [{ c: start, label: 'Start ' + S }],
      hints: [
        T('The end time is AFTER the start time. Add the duration.', 'وقت النهاية بعد البداية. أضيفوا المدة.'),
        T('Start at ' + S + '. Move forward ' + fmtDuration(d) + '.', 'ابدؤوا من ' + S + ' وتقدّموا ' + fmtDurationAr(d) + '.')
      ],
      explain: T(S + ' + ' + fmtDuration(d) + ' = ' + E + '.', 'نبدأ من ' + S + ' ونُضيف ' + fmtDurationAr(d) + ' فتصبح الساعة ' + E + '.'),
      meta: { start, end, d }
    }, buildOptions(rnd, correct, [
      timeOpt(addC(start, -d), 1), timeOpt(c12(c12Parts(start).h12, c12Parts(end).m), 1),
      timeOpt(end + 5), timeOpt(end - 5), timeOpt(end + 10), timeOpt(end - 10), timeOpt(end + 60)
    ], 4), correct);
  }

  function genFindStart(rnd) {
    const d = pick(rnd, END_D), end = rndC(rnd), start = addC(end, -d), correct = timeOpt(start), S = fmtC(start), E = fmtC(end);
    const thing = pick(rnd, ['Soccer practice', 'The movie', 'Art class', 'The picnic']);
    return mc({
      key: 'findstart:' + end + ':' + d, prompt: thing + ' ended at ' + E + ' and lasted ' + fmtDuration(d) + '. What time did it start?',
      ar: 'انتهى عند ' + E + ' واستمر ' + fmtDurationAr(d) + '. متى بدأ؟',
      clocks: [{ c: end, label: 'End ' + E }],
      hints: [
        T('The start time is BEFORE the end time. Go backward.', 'وقت البداية قبل النهاية. ارجعوا للخلف.'),
        T('Start at ' + E + '. Move backward ' + fmtDuration(d) + '.', 'ابدؤوا من ' + E + ' وارجعوا ' + fmtDurationAr(d) + ' للخلف.')
      ],
      explain: T(E + ' − ' + fmtDuration(d) + ' = ' + S + '.', 'نبدأ من ' + E + ' ونرجع ' + fmtDurationAr(d) + ' فتصبح الساعة ' + S + '.'),
      meta: { start, end, d }
    }, buildOptions(rnd, correct, [
      timeOpt(addC(end, d), 1), timeOpt(c12(c12Parts(end).h12, c12Parts(start).m), 1),
      timeOpt(start + 5), timeOpt(start - 5), timeOpt(start + 10), timeOpt(start - 10), timeOpt(start + 60)
    ], 4), correct);
  }

  // ---------- Hours & Minutes section ----------
  function genHm2Min(rnd) {
    const h = ri(rnd, 1, 3), m = ri(rnd, 1, 11) * 5, total = 60 * h + m, correct = minOpt(total);
    return mc({
      key: 'hm2min:' + total, prompt: fmtDuration(total) + ' = ___ minutes', ar: fmtDurationAr(total) + ' = ___ دقيقة',
      hints: [
        T('1 hour = 60 minutes. Change the hours into minutes first.', 'الساعة = 60 دقيقة. حوّلوا الساعات إلى دقائق أولًا.'),
        T(plural(h, 'hour') + ' = ' + 60 * h + ' minutes. Then add ' + m + ' more minutes.', fmtDurationAr(60 * h) + ' = ' + 60 * h + ' دقيقة. ثم أضيفوا ' + m + ' دقيقة.')
      ],
      explain: T(plural(h, 'hour') + ' = ' + 60 * h + ' minutes, and ' + 60 * h + ' + ' + m + ' = ' + total + ' minutes.', fmtDurationAr(60 * h) + ' = ' + 60 * h + ' دقيقة، و ' + 60 * h + ' + ' + m + ' = ' + total + ' دقيقة.'),
      meta: { h, m, total }
    }, buildOptions(rnd, correct, [minOpt(h * 100 + m, 1), minOpt(60 * h, 1), minOpt(total + 10), minOpt(total - 10), minOpt(total + 20), minOpt(total - 20), minOpt(60 + m)], 4), correct);
  }

  const MIN_TOTALS = [65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 150, 160, 170];
  function genMin2Hm(rnd) {
    const total = pick(rnd, MIN_TOTALS), correct = durOpt(total);
    const dec = total >= 100 && total % 100 < 60 ? Math.floor(total / 100) * 60 + (total % 100) : 0;
    const hrs = Math.floor(total / 60), rest = total % 60;
    return mc({
      key: 'min2hm:' + total, prompt: total + ' minutes = ___', ar: total + ' دقيقة = ___',
      hints: [
        T('How many 60s fit in ' + total + '? Those are the hours.', 'كم مرة يتسع الرقم 60 في ' + total + '؟ هذه هي الساعات.'),
        T('Take away ' + 60 * hrs + ' minutes. What is left?', 'اطرحوا ' + 60 * hrs + ' دقيقة. كم تبقّى؟')
      ],
      explain: T(total + ' = ' + 60 * hrs + ' + ' + rest + ', so ' + total + ' minutes = ' + fmtDuration(total) + '.', total + ' = ' + 60 * hrs + ' + ' + rest + '، إذن ' + total + ' دقيقة = ' + fmtDurationAr(total) + '.'),
      meta: { total }
    }, buildOptions(rnd, correct, [durOpt(dec, 1), durOpt(total + 10, 1), durOpt(total - 10, 1), durOpt(total + 30), durOpt(total - 30), durOpt(total + 60), durOpt(total - 60)], 4), correct);
  }

  function genHours2Min(rnd) {
    const h = ri(rnd, 2, 4), total = 60 * h, correct = minOpt(total);
    return mc({
      key: 'hours2min:' + h, prompt: plural(h, 'hour') + ' = ___ minutes', ar: fmtDurationAr(60 * h) + ' = ___ دقيقة',
      hints: [
        T('1 hour = 60 minutes.', 'الساعة = 60 دقيقة.'),
        T('Add 60 again and again: ' + Array.from({ length: h }, () => 60).join(' + ') + '.', 'اجمعوا 60 مرارًا: ' + Array.from({ length: h }, () => 60).join(' + ') + '.')
      ],
      explain: T(h + ' × 60 = ' + total + ' minutes.', h + ' × 60 = ' + total + ' دقيقة.'),
      meta: { h, total }
    }, buildOptions(rnd, correct, [minOpt(100 * h, 1), minOpt(30 * h, 1), minOpt(60 * (h + 1)), minOpt(60 * (h - 1)), minOpt(total + 30)], 4), correct);
  }

  function genCompare(rnd) {
    const h = ri(rnd, 1, 2), m = ri(rnd, 1, 11) * 5, A = 60 * h + m, B = A + pick(rnd, [5, 10, 15]) * (rnd() < 0.5 ? -1 : 1);
    const a = txtOpt(fmtDuration(A)), b = txtOpt(B + ' minutes');
    const longerIsA = A > B, right = longerIsA ? a : b;
    const options = shuffle(rnd, [a, b]).map(o => ({ value: o.value, label: o.label }));
    return mc({
      key: 'compare:' + A + ':' + B, prompt: 'Which is longer?', ar: 'أيّ المدّتين أطول؟',
      hints: [
        T('Change both to minutes so you can compare them.', 'حوّلوا الاثنين إلى دقائق لتقارنيهما.'),
        T(fmtDuration(A) + ' = ' + A + ' minutes. Now compare ' + A + ' and ' + B + '.', fmtDurationAr(A) + ' = ' + A + ' دقيقة. قارنوا الآن ' + A + ' و ' + B + '.')
      ],
      explain: T(fmtDuration(A) + ' = ' + A + ' minutes. ' + Math.max(A, B) + ' is more than ' + Math.min(A, B) + ', so ' + right.label + ' is longer.',
                 fmtDurationAr(A) + ' = ' + A + ' دقيقة. ' + Math.max(A, B) + ' أكبر من ' + Math.min(A, B) + '، إذن ' + (longerIsA ? fmtDurationAr(A) : B + ' دقيقة') + ' هي الأطول.'),
      meta: { A, B, longer: right.label }
    }, options, { value: right.value });
  }

  // ---------- registry, decks, validation ----------
  const KINDS = {
    clock: { read: genRead, set: genSet, numbermin: genNumberMin, words: genWords, pickclock: genPickClock, facts: rnd => factQuestion(rnd, CLOCK_FACTS) },
    ampm: { ampm: genAmPm, daypart: genDayPart, besttime: genBestTime, sameclock: genSameClock, facts: rnd => factQuestion(rnd, AMPM_FACTS) },
    ba: { after: genShiftPlain(1), before: genShiftPlain(-1), story: genStory, setshift: genSetShift, pickshift: genPickShift },
    dur: { dursame: genDurSame, durcross: genDurCross, durhm: genDurHM, findend: genFindEnd, findstart: genFindStart },
    hm: { hm2min: genHm2Min, min2hm: genMin2Hm, hours2min: genHours2Min, compare: genCompare, facts: rnd => factQuestion(rnd, HM_FACTS) }
  };
  const SECTION_IDS = ['clock', 'ampm', 'ba', 'dur', 'hm'];

  // A deck is a shuffled list of question kinds, so the first questions of a visit are all different kinds.
  function buildDeck(sectionId, rnd) {
    if (sectionId === 'challenge') {
      const out = [];
      for (let pass = 0; pass < 2; pass++) {
        shuffle(rnd, SECTION_IDS).forEach(id => out.push({ section: id, kind: pick(rnd, Object.keys(KINDS[id])) }));
      }
      return out;
    }
    return shuffle(rnd, Object.keys(KINDS[sectionId])).map(kind => ({ section: sectionId, kind }));
  }
  function makeQuestion(entry, rnd) {
    const q = KINDS[entry.section][entry.kind](rnd);
    q.section = entry.section;
    q.kind = entry.kind;
    return q;
  }

  // Check one answer. MC: `resp` is the chosen option value. Set-the-clock: `resp` is a clock
  // time (minutes after 12:00) or { h12, m }.
  function checkAnswer(q, resp) {
    if (q.type === 'setclock') {
      const c = typeof resp === 'number' ? resp : c12(resp.h12, resp.m);
      return mod(c, HALF) === q.target;
    }
    return resp != null && String(resp) === String(q.correct);
  }

  function validateQuestion(q) {
    const errs = [];
    if (!q.prompt) errs.push('missing prompt');
    if (!q.ar) errs.push('missing Arabic line');
    if (!q.explain || !q.explain.en || !q.explain.ar) errs.push('missing explanation');
    if (!q.hints || q.hints.length < 2 || q.hints.some(h => !h.en || !h.ar)) errs.push('need two bilingual hints');
    if (q.type === 'mc') {
      const o = q.options || [];
      if (o.length < 2) errs.push('fewer than 2 options');
      if (new Set(o.map(x => x.value)).size !== o.length) errs.push('duplicate option values');
      if (new Set(o.map(x => x.label)).size !== o.length) errs.push('duplicate option labels');
      if (o.filter(x => x.value === q.correct).length !== 1) errs.push('correct answer must match exactly one option');
    } else if (q.type === 'setclock') {
      if (!Number.isInteger(q.target) || q.target < 0 || q.target >= HALF) errs.push('bad target');
      if (!Number.isInteger(q.startC) || q.startC < 0 || q.startC >= HALF) errs.push('bad start');
      if (q.startC === q.target) errs.push('clock already shows the answer');
    } else errs.push('unknown type ' + q.type);
    return errs;
  }

  const TimeLogic = {
    DAY, HALF, mod, pad2, c12, c12Parts, fmtC, addC, durC, makeT, tParts, fmtT, dayPart, handAngles,
    fmtDuration, fmtDurationAr, timeWords, makeRng, KINDS, SECTION_IDS, ACTS, buildDeck, makeQuestion, checkAnswer, validateQuestion
  };
  if (typeof module === 'object' && module.exports) module.exports = TimeLogic;
  if (typeof document === 'undefined') return;
  window.TimeLogic = TimeLogic;

  /* =====================================================================
     PART 2 — USER INTERFACE
     ===================================================================== */

  const SECTIONS = [
    { id: 'clock', emoji: '🕐', title: 'Learn the Clock', ar: 'تعلّموا الساعة', goal: 5, badge: { emoji: '🕐', name: 'Clock Master' },
      tip: T('Drag the hands and watch the time change!', 'حرّكوا العقارب وشاهدوا الوقت يتغيّر!') },
    { id: 'ampm', emoji: '🌅', title: 'Morning or Evening?', ar: 'صباح أم مساء؟', goal: 5, badge: { emoji: '🌅', name: 'Day Explorer' },
      tip: T('The same clock reading can be morning or evening. The story helps you decide!', 'نفس الساعة قد تكون صباحًا أو مساءً. القصة تساعدكم على القرار!') },
    { id: 'ba', emoji: '➕', title: 'After & Before', ar: 'بعد وقبل', goal: 5, badge: { emoji: '🧭', name: 'Time Traveler' },
      tip: T('Count by 5s on the clock. When you pass 12, the hour changes!', 'عدّوا بالخمسات على الساعة. عند تجاوز 12 تتغيّر الساعة!') },
    { id: 'dur', emoji: '⏳', title: 'Duration', ar: 'المدة الزمنية', goal: 5, badge: { emoji: '🔎', name: 'Duration Detective' },
      tip: T('Duration means how long something takes.', 'المدة = كم من الوقت يستغرق الشيء.') },
    { id: 'hm', emoji: '🔢', title: 'Hours & Minutes', ar: 'الساعات والدقائق', goal: 5, badge: { emoji: '⏱️', name: 'Minute Master' },
      tip: T('1 hour = 60 minutes. Remember this rule!', 'الساعة = 60 دقيقة. تذكّروا هذه القاعدة!') },
    { id: 'challenge', emoji: '🏆', title: 'Practice & Challenge', ar: 'تدريب وتحدّي', goal: 10, badge: { emoji: '🏆', name: 'Time Master' },
      tip: T('10 mixed questions. You can do it!', '10 أسئلة متنوعة. أنتم تستطيعون!') }
  ];
  const SEC = {};
  SECTIONS.forEach(s => { SEC[s.id] = s; });

  /* ---------- DOM helpers ---------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(k => {
        const v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k.slice(0, 2) === '--') el.style.setProperty(k, v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    kids.flat(Infinity).forEach(kid => {
      if (kid == null || kid === false) return;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });
    return el;
  }
  function S(tag, attrs, ...kids) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(k => el.setAttribute(k, attrs[k]));
    kids.forEach(k => k && el.append(k));
    return el;
  }
  const ar = (text, cls) => h('span', { class: 'ar' + (cls ? ' ' + cls : ''), lang: 'ar', dir: 'rtl' }, text);
  const arBlock = (text, cls) => h('p', { class: 'ar-line' + (cls ? ' ' + cls : ''), lang: 'ar', dir: 'rtl' }, text);
  const bi = (en, arText) => [h('span', { class: 'en' }, en), ' ', ar(arText)];

  /* ---------- progress (saved in this browser only) ---------- */
  const STORE_KEY = 'timeExplorer.v1';
  const progress = loadProgress();

  function loadProgress() {
    const base = { stars: 0, sections: {}, muted: false, last: 'clock' };
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Number.isFinite(p.stars) && p.stars >= 0) base.stars = Math.floor(p.stars);
        if (p.sections && typeof p.sections === 'object') {
          SECTIONS.forEach(s => {
            const sp = p.sections[s.id];
            if (sp && Number.isFinite(sp.correct) && sp.correct >= 0) base.sections[s.id] = { correct: Math.floor(sp.correct), badge: !!sp.badge };
          });
        }
        base.muted = !!p.muted;
        if (SEC[p.last]) base.last = p.last;
      }
    } catch (e) { /* storage unavailable: progress simply lasts until the page closes */ }
    return base;
  }
  function saveProgress() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
  }
  const secProgress = id => progress.sections[id] || { correct: 0, badge: false };

  /* ---------- sound (made with the Web Audio API, no files) ---------- */
  // Sounds are built from oscillators and noise, so no audio files are needed.
  //   good  = celebration: brass fanfare + a cheering crowd + applause + sparkles
  //   oops  = loss: a sad "wah-wah-wah-waaah" trombone that slides down
  // One note. v = { f Hz, at s, len s, wave, vol, lp (low-pass Hz), wah (filter opens to Hz), q, slide (end Hz), vib [Hz, depth], att, rel }
  function playVoice(ctx, dest, v, t0) {
    const at = t0 + v.at, end = at + v.len, att = v.att || 0.015;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = v.wave || 'sine';
    osc.frequency.setValueAtTime(v.f, at);
    if (v.slide) osc.frequency.exponentialRampToValueAtTime(v.slide, end);
    let node = osc;
    if (v.lp) {
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass'; flt.Q.value = v.q || 1;
      flt.frequency.setValueAtTime(v.lp, at);
      if (v.wah) {            // the filter opens and closes: the "wah" of a trombone
        flt.frequency.exponentialRampToValueAtTime(v.wah, at + v.len * 0.3);
        flt.frequency.exponentialRampToValueAtTime(v.lp, end);
      }
      osc.connect(flt); node = flt;
    }
    if (v.vib) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = v.vib[0]; depth.gain.value = v.vib[1];
      lfo.connect(depth); depth.connect(osc.frequency);
      lfo.start(at); lfo.stop(end + 0.05);
    }
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v.vol, at + att);
    g.gain.setValueAtTime(v.vol, Math.max(at + att, end - (v.rel || 0.1)));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    node.connect(g); g.connect(dest);
    osc.start(at); osc.stop(end + 0.05);
  }

  // A short burst of filtered noise: one hand clap.
  function clap(ctx, dest, noise, at, len, freq, vol) {
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise;
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(bp); bp.connect(g); g.connect(dest);
    src.start(at, Math.random() * 0.4); src.stop(at + len + 0.02);
  }
  function applause(ctx, dest, noise, start, count, vol) {
    for (let i = 0; i < count; i++) {
      const at = start + i * 0.033 + Math.random() * 0.03, swell = Math.max(0.25, 1 - Math.abs(i - count * 0.38) / (count * 0.65));
      clap(ctx, dest, noise, at, 0.05 + Math.random() * 0.05, 1400 + Math.random() * 2600, vol * swell);
    }
  }

  // A voiced "yaaay!" made from a sawtooth through two vowel filters that slide from "ah" to "ee".
  function cheer(ctx, dest, at, len, vol, mult) {
    const osc = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(230 * mult, at);
    osc.frequency.exponentialRampToValueAtTime(400 * mult, at + len * 0.45);
    osc.frequency.exponentialRampToValueAtTime(340 * mult, at + len);
    lfo.frequency.value = 6; depth.gain.value = 7 * mult;
    lfo.connect(depth); depth.connect(osc.frequency);
    [[700, 450, 9], [1100, 2200, 9], [2900, 3100, 6]].forEach(([f0, f1, q]) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = q;
      bp.frequency.setValueAtTime(f0, at);
      bp.frequency.exponentialRampToValueAtTime(f1, at + len);
      osc.connect(bp); bp.connect(g);
    });
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.07);
    g.gain.setValueAtTime(vol, at + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    g.connect(dest);
    osc.start(at); osc.stop(at + len + 0.05); lfo.start(at); lfo.stop(at + len + 0.05);
  }

  // A trumpet-like note: a bright sawtooth through a low-pass filter plus a triangle one octave lower.
  function brassNote(voice, f, at, len, vol) {
    voice({ f, at, len, wave: 'sawtooth', vol, lp: 2800, q: 1.2, att: 0.012 });
    voice({ f: f / 2, at, len, wave: 'triangle', vol: vol * 0.9, att: 0.012 });
  }

  const RECIPES = {
    start(ctx, dest, noise, t0) {            // "ready, go!" when the welcome button is pressed
      const voice = v => playVoice(ctx, dest, v, t0);
      brassNote(voice, 523.25, 0, 0.14, 0.22); brassNote(voice, 659.25, 0.12, 0.14, 0.22); brassNote(voice, 783.99, 0.24, 0.45, 0.22);
      [[2093, 0.3], [3136, 0.42], [4186, 0.54]].forEach(([f, at]) => voice({ f, at, len: 0.3, vol: 0.08 }));
    },
    good(ctx, dest, noise, t0) {
      const voice = v => playVoice(ctx, dest, v, t0);
      const brass = (f, at, len, vol) => brassNote(voice, f, at, len, vol);
      brass(523.25, 0, 0.15, 0.22); brass(659.25, 0.13, 0.15, 0.22); brass(783.99, 0.26, 0.15, 0.22);
      [523.25, 659.25, 783.99, 1046.5].forEach(f => brass(f, 0.4, 1.0, 0.14));
      [[1, 0.38], [1.26, 0.43], [1.5, 0.48]].forEach(([m, at]) => cheer(ctx, dest, t0 + at, 0.95, 0.9, m));
      applause(ctx, dest, noise, t0 + 0.3, 48, 0.3);
      [[2093, 0.5], [2637, 0.62], [3136, 0.74], [4186, 0.88]].forEach(([f, at]) => voice({ f, at, len: 0.3, vol: 0.08 }));
    },
    oops(ctx, dest, noise, t0) {
      const voice = v => playVoice(ctx, dest, v, t0);
      const wah = (f, at, len, slide, vib) => {
        voice({ f, at, len, wave: 'sawtooth', vol: 0.5, lp: 600, wah: 1800, q: 5, slide, vib, att: 0.02 });
        voice({ f: f / 2, at, len, wave: 'triangle', vol: 0.3, slide: slide && slide / 2, vib: vib && [vib[0], vib[1] / 2], att: 0.02 });
      };
      wah(349.23, 0, 0.27); wah(329.63, 0.3, 0.27); wah(311.13, 0.6, 0.27);
      wah(293.66, 0.9, 0.85, 207.65, [5.5, 6]);
    },
    show(ctx, dest, noise, t0) {
      const voice = v => playVoice(ctx, dest, v, t0);
      voice({ f: 659.25, at: 0, len: 0.5, vol: 0.32 }); voice({ f: 1318.5, at: 0, len: 0.35, vol: 0.1 });
      voice({ f: 987.77, at: 0.17, len: 0.7, vol: 0.3 }); voice({ f: 1975.5, at: 0.17, len: 0.45, vol: 0.09 });
    },
    badge(ctx, dest, noise, t0) {
      const voice = v => playVoice(ctx, dest, v, t0);
      const brass = (f, at, len, vol) => brassNote(voice, f, at, len, vol);
      brass(523.25, 0, 0.17, 0.22); brass(659.25, 0.15, 0.17, 0.22); brass(783.99, 0.3, 0.17, 0.22); brass(1046.5, 0.45, 0.3, 0.22);
      brass(783.99, 0.8, 0.15, 0.2); brass(1046.5, 0.95, 0.15, 0.2);
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(f => brass(f, 1.15, 1.3, 0.13));
      [[1, 0.5], [1.26, 1.15], [1.5, 1.25], [1.12, 1.35]].forEach(([m, at]) => cheer(ctx, dest, t0 + at, 1, 0.9, m));
      applause(ctx, dest, noise, t0 + 0.45, 70, 0.3);
      [[2093, 0.6], [2637, 0.72], [3136, 0.84], [4186, 1.0], [3136, 1.3], [4186, 1.45]].forEach(([f, at]) => voice({ f, at, len: 0.3, vol: 0.08 }));
    },
    tap(ctx, dest, noise, t0) { playVoice(ctx, dest, { f: 660, at: 0, len: 0.08, vol: 0.25 }, t0); }
  };
  const LEVEL = { start: 1, good: 1, oops: 1, show: 1, badge: 1, tap: 1 };   // per-sound loudness trim

  const Sound = {
    ctx: null,
    out: null,
    noise: null,
    // Browsers only allow sound after a touch or click, so this is called on the first one.
    unlock() {
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return false;
          const ctx = new AC();
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2;
          comp.connect(ctx.destination);
          const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate), data = noise.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          this.ctx = ctx; this.out = comp; this.noise = noise;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      } catch (e) { return false; }
    },
    play(kind) {
      if (progress.muted || !RECIPES[kind] || !this.unlock()) return;
      const go = () => {
        try {
          const trim = this.ctx.createGain();
          trim.gain.value = LEVEL[kind];
          trim.connect(this.out);
          RECIPES[kind](this.ctx, trim, this.noise, this.ctx.currentTime + 0.03);
        } catch (e) { /* sound is optional */ }
      };
      if (this.ctx.state === 'running') go();
      else { const p = this.ctx.resume(); if (p && p.then) p.then(go, () => {}); else go(); }
    }
  };
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Sound.unlock(), { once: true, capture: true }));

  /* ---------- clock widget ---------- */
  function createClock(opts) {
    const o = Object.assign({ c: 0, interactive: false, step: 5, minuteLabels: false, numbers: 'all', onChange: null, label: 'Clock', cls: '' }, opts);
    let total = mod(o.c, HALF);       // unwrapped minutes so the hands never spin the long way round
    let dragging = null;

    const svg = S('svg', { viewBox: '0 0 200 200', class: 'clock-svg', role: o.interactive ? 'group' : 'img', 'aria-label': o.label });
    svg.append(S('circle', { cx: 100, cy: 100, r: 98, class: 'clock-face' }));
    const arcEl = S('path', { class: 'clock-arc', d: '' });
    svg.append(arcEl);
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0, a = (i * 6 * Math.PI) / 180, r2 = major ? 84 : 88;
      svg.append(S('line', { x1: 100 + 93 * Math.sin(a), y1: 100 - 93 * Math.cos(a), x2: 100 + r2 * Math.sin(a), y2: 100 - r2 * Math.cos(a), class: major ? 'tick major' : 'tick' }));
    }
    const nums = o.numbers === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [12, 3, 6, 9];
    nums.forEach(n => {
      const a = (n * 30 * Math.PI) / 180;
      svg.append(S('text', { x: 100 + 62 * Math.sin(a), y: 100 - 62 * Math.cos(a), class: 'clock-num' + (o.numbers === 'all' ? '' : ' big') }, null));
      svg.lastChild.textContent = String(n);
    });
    if (o.minuteLabels) {
      for (let k = 0; k < 12; k++) {
        const a = (k * 30 * Math.PI) / 180;
        svg.append(S('text', { x: 100 + 77 * Math.sin(a), y: 100 - 77 * Math.cos(a), class: 'clock-min' }));
        svg.lastChild.textContent = String(k * 5);
      }
    }
    const minuteHand = S('g', { class: 'hand hand-minute' },
      S('line', { x1: 100, y1: 114, x2: 100, y2: 30, class: 'hand-line' }),
      S('circle', { cx: 100, cy: 52, r: 6.5, class: 'grip' }),
      S('line', { x1: 100, y1: 100, x2: 100, y2: 24, class: 'hit' }));
    const hourHand = S('g', { class: 'hand hand-hour' },
      S('line', { x1: 100, y1: 110, x2: 100, y2: 60, class: 'hand-line' }),
      S('circle', { cx: 100, cy: 75, r: 6, class: 'grip' }),
      S('line', { x1: 100, y1: 100, x2: 100, y2: 54, class: 'hit' }));
    svg.append(minuteHand, hourHand, S('circle', { cx: 100, cy: 100, r: 6, class: 'clock-cap' }));

    const wrap = h('div', { class: 'clock ' + (o.cls || '') + (o.interactive ? ' interactive' : '') }, svg);
    if (o.interactive) svg.setAttribute('tabindex', '0');

    function render() {
      hourHand.style.transform = 'rotate(' + total * 0.5 + 'deg)';
      minuteHand.style.transform = 'rotate(' + total * 6 + 'deg)';
      svg.setAttribute('aria-label', o.label + ': ' + fmtC(total));
    }
    function changed() { render(); if (o.onChange) o.onChange(mod(total, HALF)); }
    function jump(fn) {                       // run fn with transitions off (no animation)
      svg.classList.add('no-anim'); fn(); void svg.getBoundingClientRect(); svg.classList.remove('no-anim');
    }
    function setMs(ms) { svg.style.setProperty('--hand-ms', ms + 'ms'); }

    const api = {
      el: wrap,
      getC: () => mod(total, HALF),
      setTime(c, animate = true, ms = 600) {
        setMs(ms);
        let d = mod(c - total, HALF);
        if (d > HALF / 2) d -= HALF;
        if (animate) { total += d; changed(); } else jump(() => { total += d; changed(); });
      },
      shift(delta, animate = true, ms = 450) {
        setMs(ms);
        if (animate) { total += delta; changed(); } else jump(() => { total += delta; changed(); });
      },
      showArc(startMinute, sweepMinutes, r = 70) {
        if (!sweepMinutes) { arcEl.setAttribute('d', ''); return; }
        const pt = a => [100 + r * Math.sin((a * Math.PI) / 180), 100 - r * Math.cos((a * Math.PI) / 180)];
        if (Math.abs(sweepMinutes) >= 60) {
          arcEl.setAttribute('d', 'M100 100 m-' + r + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a' + r + ' ' + r + ' 0 1 0 -' + 2 * r + ' 0');
        } else {
          const a0 = startMinute * 6, a1 = a0 + sweepMinutes * 6, p0 = pt(a0), p1 = pt(a1);
          arcEl.setAttribute('d', 'M100 100 L' + p0[0] + ' ' + p0[1] + ' A' + r + ' ' + r + ' 0 ' + (Math.abs(sweepMinutes) > 30 ? 1 : 0) + ' ' + (sweepMinutes > 0 ? 1 : 0) + ' ' + p1[0] + ' ' + p1[1] + ' Z');
        }
      },
      clearArc() { arcEl.setAttribute('d', ''); }
    };

    if (o.interactive) {
      const pointerAngle = e => {
        const r = svg.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        return { ang: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, dist: Math.hypot(dx, dy) / (r.width / 2) };
      };
      const angGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
      const move = e => {
        const { ang } = pointerAngle(e);
        if (dragging === 'minute') {
          const m = mod(Math.round(ang / 6 / o.step) * o.step, 60), cur = mod(total, 60);
          let diff = m - cur;
          if (diff > 30) diff -= 60; else if (diff < -30) diff += 60;
          if (diff) { total += diff; changed(); }
        } else if (dragging === 'hour') {
          const curC = mod(total, HALF), curH = Math.floor(curC / 60), curM = curC % 60;
          const hh = mod(Math.round(ang / 30 - curM / 60), 12);
          let diff = hh - curH;
          if (diff > 6) diff -= 12; else if (diff < -6) diff += 12;
          if (diff) { total += diff * 60; changed(); }
        }
      };
      svg.addEventListener('pointerdown', e => {
        const { ang, dist } = pointerAngle(e), t = mod(total, HALF);
        if (e.target.closest && e.target.closest('.hand-hour')) dragging = 'hour';
        else if (e.target.closest && e.target.closest('.hand-minute')) dragging = 'minute';
        else dragging = dist < 0.45 && angGap(ang, t * 0.5) < angGap(ang, (t % 60) * 6) ? 'hour' : 'minute';
        e.preventDefault();
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        wrap.classList.add('dragging');
        svg.focus({ preventScroll: true });
        move(e);
      });
      svg.addEventListener('pointermove', e => { if (dragging) move(e); });
      const end = () => { dragging = null; wrap.classList.remove('dragging'); };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);
      svg.addEventListener('keydown', e => {
        const k = e.key;
        const map = { ArrowUp: o.step, ArrowRight: o.step, ArrowDown: -o.step, ArrowLeft: -o.step, PageUp: 60, PageDown: -60 };
        if (map[k] != null) { e.preventDefault(); api.shift(map[k], true, 250); }
      });
    }
    render();
    return api;
  }

  // + / − buttons that move a clock like the real hands would
  function makeSteppers(onShift, step) {
    const btn = (label, aria, delta, en, arText) => h('button', { type: 'button', class: 'btn step-btn', 'aria-label': aria, onclick: () => { Sound.play('tap'); onShift(delta); } },
      h('span', { class: 'step-sign' }, label), h('span', { class: 'step-what' }, en), ar(arText, 'tiny'));
    return h('div', { class: 'steppers', role: 'group', 'aria-label': 'Change the time' },
      btn('−', 'Back one hour', -60, 'hour', 'ساعة'),
      btn('+', 'Forward one hour', 60, 'hour', 'ساعة'),
      btn('−', 'Back ' + step + ' minutes', -step, step + ' min', 'دقائق'),
      btn('+', 'Forward ' + step + ' minutes', step, step + ' min', 'دقائق'));
  }

  function miniClock(c, label) { return createClock({ c, numbers: 'quarters', label: label || 'Clock', cls: 'mini' }).el; }

  /* ---------- timeline (jumps between times) ---------- */
  const jumpText = n => (n < 60 ? n + ' min' : n % 60 === 0 ? n / 60 + ' hr' : Math.floor(n / 60) + ' hr ' + (n % 60) + ' min');
  function renderTimeline(box, pts, dir, startIdx, endTag) {
    const row = h('div', { class: 'timeline', role: 'img', 'aria-label': 'Timeline from ' + fmtC(pts[0]) + ' to ' + fmtC(pts[pts.length - 1]) });
    pts.forEach((v, i) => {
      if (i > 0) row.append(h('div', { class: 'jump' }, h('span', { class: 'jump-label' }, (dir < 0 ? '−' : '+') + jumpText(v - pts[i - 1])), h('span', { class: 'jump-line' }, dir < 0 ? '◀' : '▶')));
      const isStart = i === startIdx, isEnd = i === (startIdx === 0 ? pts.length - 1 : 0);
      row.append(h('div', { class: 'node' + (isStart ? ' is-start' : '') + (isEnd ? ' is-end' : '') },
        h('span', { class: 'node-dot' }), h('span', { class: 'node-time' }, fmtC(v)), h('span', { class: 'node-tag' }, isStart ? 'Start' : isEnd ? (endTag || 'Answer') : '')));
    });
    box.replaceChildren(h('div', { class: 'timeline-scroll' }, row));
  }

  /* ---------- celebration effects ---------- */
  const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function burst(fromEl, emojis) {
    if (reducedMotion()) return;
    const fx = document.getElementById('fx'), r = (fromEl || document.body).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, list = emojis || ['⭐', '✨', '🌟', '🎉'];
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4, dist = 70 + Math.random() * 90;
      const p = h('span', { class: 'fx-piece', '--dx': Math.cos(a) * dist + 'px', '--dy': Math.sin(a) * dist - 40 + 'px', '--rot': (Math.random() * 360 - 180) + 'deg' }, list[i % list.length]);
      p.style.left = cx + 'px'; p.style.top = cy + 'px';
      fx.append(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }
  function pulse(el) {
    if (!el || reducedMotion()) return;
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  }

  /* ---------- dialog ---------- */
  const dialogEl = document.getElementById('dialog');
  function openDialog(opts) {
    const body = h('div', { class: 'dialog-body' },
      h('div', { class: 'dialog-emoji', 'aria-hidden': 'true' }, opts.emoji),
      h('h2', { id: 'dialogTitle' }, opts.title),
      opts.titleAr ? arBlock(opts.titleAr) : null,
      opts.text ? h('p', { class: 'dialog-text' }, opts.text) : null,
      opts.textAr ? arBlock(opts.textAr) : null,
      h('div', { class: 'dialog-actions' }, opts.buttons.map(b => h('button', { type: 'button', class: 'btn ' + (b.primary ? 'btn-primary' : 'btn-soft'), onclick: () => { dialogEl.close(); if (b.onClick) b.onClick(); } }, b.label))));
    dialogEl.replaceChildren(body);
    if (!dialogEl.open) { if (dialogEl.showModal) dialogEl.showModal(); else dialogEl.setAttribute('open', ''); }
    const first = dialogEl.querySelector('.btn-primary') || dialogEl.querySelector('button');
    if (first) first.focus();
  }

  /* ---------- app state ---------- */
  const state = { section: progress.last, tab: 'learn' };
  const practice = {};
  const mainEl = document.getElementById('main');
  const navEl = document.getElementById('sectionNav');

  function updateStarsUI() {
    document.getElementById('starCount').textContent = progress.stars;
    pulse(document.getElementById('starsTotal'));
  }
  function updateSoundUI() {
    const b = document.getElementById('soundBtn');
    b.setAttribute('aria-pressed', progress.muted ? 'true' : 'false');
    b.querySelector('.btn-icon').textContent = progress.muted ? '🔇' : '🔊';
    b.querySelector('.btn-text').textContent = progress.muted ? 'Sound off' : 'Sound on';
  }

  function renderNav() {
    navEl.replaceChildren(...SECTIONS.map((s, i) => {
      const sp = secProgress(s.id), shown = Math.min(sp.correct, s.goal);
      return h('button', {
        type: 'button', class: 'nav-btn sec-' + s.id + (s.id === state.section ? ' active' : ''), 'data-id': s.id,
        'aria-current': s.id === state.section ? 'page' : null,
        onclick: () => showSection(s.id)
      },
        h('span', { class: 'nav-emoji', 'aria-hidden': 'true' }, s.emoji),
        h('span', { class: 'nav-text' }, h('span', { class: 'nav-title' }, (i + 1) + '. ' + s.title), ar(s.ar, 'nav-ar')),
        h('span', { class: 'nav-prog' }, sp.badge ? h('span', { class: 'nav-badge', title: s.badge.name }, '🏅') : null, h('span', null, '⭐ ' + shown + '/' + s.goal)));
    }));
  }

  function progressView(id) {
    const sec = SEC[id], sp = secProgress(id), shown = Math.min(sp.correct, sec.goal);
    const stars = [];
    for (let i = 0; i < sec.goal; i++) stars.push(h('span', { class: 'pstar' + (i < shown ? ' on' : ''), 'aria-hidden': 'true' }, i < shown ? '⭐' : '☆'));
    return h('div', { class: 'progress-wrap', 'data-id': id },
      h('div', { class: 'progress-top' },
        h('span', { class: 'progress-label' }, 'Stars in this section: ', h('strong', null, shown + '/' + sec.goal)),
        sp.badge ? h('span', { class: 'badge-chip' }, sec.badge.emoji + ' ' + sec.badge.name) : null),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': sec.goal, 'aria-valuenow': shown }, h('span', { style: 'width:' + (shown / sec.goal) * 100 + '%' })),
      h('div', { class: 'pstars' }, stars));
  }
  function refreshProgressViews() {
    document.querySelectorAll('.progress-wrap').forEach(el => el.replaceWith(progressView(el.getAttribute('data-id'))));
  }

  function showSection(id, tab) {
    state.section = id;
    state.tab = id === 'challenge' ? 'practice' : (tab || 'learn');
    progress.last = id; saveProgress();
    renderNav();
    renderSection();
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  function renderSection() {
    const sec = SEC[state.section];
    const tabs = sec.id === 'challenge' ? null : h('div', { class: 'tabs', role: 'group', 'aria-label': 'Lesson or practice' },
      h('button', { type: 'button', class: 'tab' + (state.tab === 'learn' ? ' active' : ''), 'aria-pressed': state.tab === 'learn', onclick: () => { state.tab = 'learn'; renderSection(); } }, '📖 Learn ', ar('تعلّموا')),
      h('button', { type: 'button', class: 'tab' + (state.tab === 'practice' ? ' active' : ''), 'aria-pressed': state.tab === 'practice', onclick: () => { state.tab = 'practice'; renderSection(); } }, '✏️ Practice ', ar('تدرّبوا')));
    const body = h('div', { class: 'section-body' });
    const head = h('header', { class: 'section-head' },
      h('div', { class: 'section-title' }, h('span', { class: 'big-emoji', 'aria-hidden': 'true' }, sec.emoji), h('div', null, h('h2', null, sec.title), ar(sec.ar, 'sec-ar'))),
      h('div', { class: 'tick-tip' }, h('span', { class: 'owl', 'aria-hidden': 'true' }, '🦉'), h('div', { class: 'bubble' }, h('p', null, sec.tip.en), arBlock(sec.tip.ar))));
    mainEl.className = 'sec-' + sec.id;
    mainEl.replaceChildren(...[head, tabs, body].filter(Boolean));
    if (state.tab === 'learn') LEARN[sec.id](body); else renderPractice(body, sec.id);
  }

  const goPractice = () => h('div', { class: 'cta' }, h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => { state.tab = 'practice'; renderSection(); window.scrollTo({ top: 0 }); } }, "Let's practice! ➜ ", ar('هيّا نتدرّب!')));

  /* ---------- LESSONS ---------- */
  const card = (title, titleAr, ...kids) => h('section', { class: 'card' }, h('h3', null, title, ' ', ar(titleAr, 'h-ar')), ...kids);
  const chipBtn = (label, onclick, cls) => h('button', { type: 'button', class: 'chip ' + (cls || ''), onclick }, label);

  function learnClock(root) {
    const digital = h('div', { class: 'digital', 'aria-live': 'polite' });
    const reader = h('div', { class: 'reader' });
    const clock = createClock({ c: c12(3, 0), interactive: true, step: 1, minuteLabels: true, label: 'Practice clock', cls: 'big', onChange: update });
    function update(c) {
      const p = c12Parts(c), words = timeWords(c), mm = p.m;
      digital.textContent = fmtC(c);
      reader.replaceChildren(
        h('p', null, h('span', { class: 'dot hour' }), 'The ', h('strong', null, 'short hand'), ' has passed ', h('strong', null, p.h12), ' → the hour is ', h('strong', null, p.h12), '.'),
        h('p', null, h('span', { class: 'dot minute' }), 'The ', h('strong', null, 'long hand'), mm === 0 ? [' points to ', h('strong', null, 12), ' → ', h('strong', null, '0 minutes'), ' (o\'clock).'] : mm % 5 === 0 ? [' points to ', h('strong', null, mm / 5), ' → ', mm / 5, ' × 5 = ', h('strong', null, mm + ' minutes'), '.'] : [' is between ', h('strong', null, Math.floor(mm / 5) || 12), ' and ', h('strong', null, Math.floor(mm / 5) + 1), ' → ', h('strong', null, mm + ' minutes'), '.']),
        h('p', { class: 'result' }, 'Time: ', h('strong', null, fmtC(c)), words ? ' (' + words + ')' : ''));
    }
    update(clock.getC());
    const examples = [[3, 0], [2, 30], [7, 25], [1, 45]].map(([hh, mm]) => chipBtn(hh + ':' + pad2(mm), () => { Sound.play('tap'); clock.setTime(c12(hh, mm), true, 900); }, 'chip-time'));
    const left = h('div', { class: 'col' },
      card('The magic clock', 'الساعة السحرية',
        h('div', { class: 'clock-stage' }, clock.el, digital),
        h('p', { class: 'hint-line' }, '👆 Drag the hands! Or use the buttons.', ' ', ar('اسحبوا العقارب أو استخدموا الأزرار.')),
        makeSteppers(d => clock.shift(d, true, 300), 5),
        h('p', { class: 'mini-title' }, 'Try an example: ', ar('جرّبوا مثالًا:')),
        h('div', { class: 'chips' }, examples)));
    const right = h('div', { class: 'col' },
      card('How to read it', 'كيف نقرأ الساعة', reader),
      card('Two hands', 'عقربان',
        h('ul', { class: 'legend' },
          h('li', null, h('span', { class: 'dot hour' }), h('strong', null, 'Short hand = hours'), ' ', ar('العقرب القصير = الساعات')),
          h('li', null, h('span', { class: 'dot minute' }), h('strong', null, 'Long hand = minutes'), ' ', ar('العقرب الطويل = الدقائق')))),
      card('Every number is 5 minutes', 'كل رقم = 5 دقائق',
        h('p', { class: 'numline' }, '1 → 5 · 2 → 10 · 3 → 15 · 4 → 20 · 5 → 25 · 6 → 30'),
        h('p', { class: 'numline' }, '7 → 35 · 8 → 40 · 9 → 45 · 10 → 50 · 11 → 55 · 12 → 0'),
        arBlock('كل رقم على الساعة يساوي 5 دقائق لعقرب الدقائق.'),
        h('button', { type: 'button', class: 'btn btn-soft', onclick: () => { Sound.play('tap'); clock.shift(60, true, 3200); } }, '▶ Watch one full hour ', ar('شاهدوا ساعة كاملة')),
        h('p', { class: 'note' }, 'A full turn of the long hand = 60 minutes = 1 hour.', ' ', ar('دورة كاملة = 60 دقيقة = ساعة.'))),
      card('Useful words', 'كلمات مفيدة',
        h('div', { class: 'vocab' },
          [["o'clock", 'تمامًا'], ['half past', 'والنصف'], ['quarter past', 'والربع'], ['quarter to', 'إلا ربع'], ['hour', 'ساعة'], ['minute', 'دقيقة']].map(([en, a]) => h('div', { class: 'vocab-item' }, h('strong', null, en), ar(a))))));
    root.append(h('div', { class: 'learn-grid' }, left, right), goPractice());
  }

  function learnAmPm(root) {
    const slider = h('input', { type: 'range', min: 0, max: 47, step: 1, value: 14, 'aria-label': 'Time of day', class: 'slider' });
    const clock = createClock({ c: c12(7, 0), label: 'Clock', cls: 'big' });
    const big = h('div', { class: 'digital big', 'aria-live': 'polite' });
    const chip = h('div', { class: 'part-chip' });
    const mark = h('div', { class: 'daymark', 'aria-hidden': 'true' }, '▼');
    const stage = h('div', { class: 'sky' }, h('div', { class: 'sky-icon', 'aria-hidden': 'true' }), clock.el);
    const PART_INFO = { morning: ['🌅', 'Morning', 'الصباح'], afternoon: ['☀️', 'Afternoon', 'بعد الظهر'], evening: ['🌙', 'Evening / Night', 'المساء / الليل'] };
    function setT(t, animate) {
      t = mod(t, DAY);
      clock.setTime(t % HALF, animate !== false, 700);
      big.textContent = fmtT(t);
      const part = dayPart(t), info = PART_INFO[part];
      chip.replaceChildren(info[0] + ' ', h('strong', null, info[1]), ' ', ar(info[2]));
      chip.className = 'part-chip ' + part;
      stage.className = 'sky ' + part;
      stage.querySelector('.sky-icon').textContent = info[0];
      mark.style.left = (t / DAY) * 100 + '%';
      slider.value = Math.round(t / 30);
    }
    slider.addEventListener('input', () => setT(Number(slider.value) * 30, true));
    const strip = h('div', { class: 'daystrip', 'aria-hidden': 'true' },
      [['night', 'Night 🌙', 5 / 24], ['morning', 'Morning 🌅', 7 / 24], ['afternoon', 'Afternoon ☀️', 5 / 24], ['evening', 'Evening 🌆', 7 / 24]].map(([cls, label, w]) => h('div', { class: 'seg ' + cls, style: 'flex:' + w }, label)),
      mark);
    const stripLabels = h('div', { class: 'strip-labels', 'aria-hidden': 'true' }, h('span', null, '12 AM'), h('span', null, '6 AM'), h('span', null, '12 PM'), h('span', null, '6 PM'), h('span', null, '12 AM'));
    const actChips = ACTS.map(a => chipBtn(a.emoji + ' ' + a.phrase + ' · ' + fmtT(makeT(a.times[0][0], a.times[0][1], a.period)), () => { Sound.play('tap'); setT(makeT(a.times[0][0], a.times[0][1], a.period)); }, 'chip-act ' + a.period.toLowerCase()));
    setT(makeT(7, 0, 'AM'), false);
    const left = h('div', { class: 'col' },
      card('A day on the clock', 'يوم على الساعة', stage, big, chip,
        h('label', { class: 'slider-label' }, '👇 Slide to change the time of day ', ar('حرّكوا المؤشر لتغيير وقت اليوم'), slider),
        strip, stripLabels));
    const right = h('div', { class: 'col' },
      card('AM and PM', 'AM و PM',
        h('ul', { class: 'rules' },
          h('li', null, h('strong', null, 'AM'), ' = before noon ☀️ (morning) ', ar('قبل الظهر')),
          h('li', null, h('strong', null, 'PM'), ' = after noon 🌙 (afternoon, evening, night) ', ar('بعد الظهر')),
          h('li', null, h('strong', null, '12:00 PM'), ' = noon · ', h('strong', null, '12:00 AM'), ' = midnight ', ar('الظهر / منتصف الليل')),
          h('li', null, 'A day has ', h('strong', null, '24 hours'), '. The short hand goes around the clock 2 times. ', ar('اليوم 24 ساعة'))),
        arBlock('نفس الوقت على الساعة قد يكون صباحًا أو مساءً — السياق (ماذا نفعل؟) هو الذي يحدد ذلك.')),
      card('Same clock, two times!', 'نفس الساعة، وقتان!',
        h('div', { class: 'twin' },
          h('figure', null, miniClock(c12(7, 0), '7:00'), h('figcaption', null, h('strong', null, '7:00 AM'), h('br'), '⏰ wake up', h('br'), ar('صباحًا'))),
          h('figure', null, miniClock(c12(7, 0), '7:00'), h('figcaption', null, h('strong', null, '7:00 PM'), h('br'), '🍝 have dinner', h('br'), ar('مساءً')))),
        h('p', { class: 'note' }, 'The clock looks the same. The activity tells us AM or PM.', ' ', ar('الساعة متشابهة. النشاط يخبرنا: AM أم PM.'))),
      card('Daily activities', 'أنشطة اليوم', h('p', { class: 'mini-title' }, 'Tap one to see its time: ', ar('اضغطوا لتروا وقته:')), h('div', { class: 'chips col-chips' }, actChips)));
    root.append(h('div', { class: 'learn-grid' }, left, right), goPractice());
  }

  function learnShift(root) {
    const st = { start: c12(3, 0), d: 30, dir: 1 };
    let timer = null;
    const clock = createClock({ c: st.start, minuteLabels: true, label: 'Demo clock', cls: 'big' });
    const eq = h('div', { class: 'equation', 'aria-live': 'polite' });
    const tl = h('div', { class: 'timeline-wrap' });
    const startShow = h('div', { class: 'digital' });
    const dBtns = D_SHIFT.map(d => h('button', { type: 'button', class: 'chip', onclick: () => { st.d = d; play(); } }, d + ' min'));
    const dirBtns = [[1, 'After ➕', 'بعد'], [-1, 'Before ➖', 'قبل']].map(([dir, label, a]) => h('button', { type: 'button', class: 'chip chip-dir', onclick: () => { st.dir = dir; play(); } }, label + ' ', ar(a)));
    function play() {
      clearTimeout(timer);
      const end = addC(st.start, st.dir * st.d), sign = st.dir > 0 ? '+' : '−', steps = st.d / 5;
      const startMin = st.start % 60, crosses = st.dir > 0 ? startMin + st.d >= 60 : startMin - st.d < 0;
      dBtns.forEach((b, i) => b.classList.toggle('active', D_SHIFT[i] === st.d));
      dirBtns.forEach((b, i) => b.classList.toggle('active', (i === 0) === (st.dir > 0)));
      startShow.textContent = 'Start: ' + fmtC(st.start);
      eq.replaceChildren(h('div', { class: 'eq-main' }, fmtC(st.start), ' ', sign, ' ', st.d, ' minutes = ', h('strong', { class: 'eq-result' }, fmtC(end))),
        h('p', { class: 'eq-note' }, 'Move the long hand ' + (st.dir > 0 ? 'forward' : 'backward') + ' ' + steps + (steps === 1 ? ' number' : ' numbers') + ' (' + steps + ' × 5 = ' + st.d + ' minutes).' + (crosses ? ' It passes 12, so the hour changes!' : '')),
        arBlock('نبدأ من ' + fmtC(st.start) + ' و' + (st.dir > 0 ? 'نُضيف ' : 'نطرح ') + st.d + ' دقيقة = ' + fmtC(end)));
      const pts = [];
      for (let i = 0; i <= steps; i++) pts.push(st.start + st.dir * 5 * i);
      if (st.dir < 0) pts.reverse();
      renderTimeline(tl, pts, st.dir, st.dir > 0 ? 0 : pts.length - 1);
      clock.clearArc();
      clock.setTime(st.start, false);
      timer = setTimeout(() => { clock.showArc(st.start % 60, st.dir * st.d); clock.shift(st.dir * st.d, true, 1300); }, 450);
    }
    const presets = [[c12(3, 0), 30, 1, '3:00 + 30 min'], [c12(7, 0), 15, -1, '7:00 − 15 min'], [c12(4, 45), 20, 1, '4:45 + 20 min'], [c12(12, 10), 20, -1, '12:10 − 20 min']]
      .map(([s, d, dir, label]) => chipBtn(label, () => { Object.assign(st, { start: s, d, dir }); play(); }, 'chip-time'));
    const left = h('div', { class: 'col' },
      card('Watch the long hand jump', 'شاهدوا العقرب يقفز',
        h('div', { class: 'clock-stage' }, clock.el, startShow),
        h('button', { type: 'button', class: 'btn btn-soft', onclick: () => play() }, '↻ Play again ', ar('أعيدوا')),
        h('p', { class: 'mini-title' }, 'Examples: ', ar('أمثلة:')), h('div', { class: 'chips' }, presets)));
    const right = h('div', { class: 'col' },
      card('Add or take away minutes', 'أضيفوا أو اطرحوا دقائق', eq, tl),
      card('Make your own', 'اصنعوا مثالكم',
        h('p', { class: 'mini-title' }, 'Start time: ', ar('وقت البداية:')),
        makeSteppers(d => { st.start = addC(st.start, d); play(); }, 5),
        h('p', { class: 'mini-title' }, 'Minutes: ', ar('الدقائق:')), h('div', { class: 'chips' }, dBtns),
        h('p', { class: 'mini-title' }, 'Direction: ', ar('الاتجاه:')), h('div', { class: 'chips' }, dirBtns)));
    root.append(h('div', { class: 'learn-grid' }, left, right), goPractice());
    play();
  }

  function learnDur(root) {
    const st = { start: c12(7, 0), d: 40 };
    let timer = null;
    const clock = createClock({ c: st.start, minuteLabels: true, label: 'Demo clock', cls: 'big' });
    const eq = h('div', { class: 'equation', 'aria-live': 'polite' });
    const tl = h('div', { class: 'timeline-wrap' });
    const times = h('div', { class: 'digital' });
    function play() {
      clearTimeout(timer);
      const end = addC(st.start, st.d), S1 = fmtC(st.start), E1 = fmtC(end);
      times.textContent = S1 + ' → ' + E1;
      eq.replaceChildren(h('div', { class: 'eq-main' }, 'From ', S1, ' to ', E1, ' = ', h('strong', { class: 'eq-result' }, fmtDuration(st.d))),
        h('p', { class: 'eq-note' }, st.d >= 60 ? 'Count the whole hours first, then the minutes: ' + fmtDuration(st.d) + ' (= ' + st.d + ' minutes).' : 'The long hand moves ' + st.d / 5 + ' numbers: ' + st.d / 5 + ' × 5 = ' + st.d + ' minutes.'),
        arBlock('من ' + S1 + ' إلى ' + E1 + ' = ' + fmtDurationAr(st.d)));
      const pts = [st.start], endV = st.start + st.d;
      let cur = st.start;
      const toHour = (60 - (cur % 60)) % 60;
      if (toHour > 0 && cur + toHour < endV) { cur += toHour; pts.push(cur); }
      while (cur + 60 < endV) { cur += 60; pts.push(cur); }
      pts.push(endV);
      renderTimeline(tl, pts, 1, 0, 'End');
      clock.clearArc();
      clock.setTime(st.start, false);
      timer = setTimeout(() => { if (st.d % 60) clock.showArc(st.start % 60, st.d % 60); else clock.showArc(0, 60); clock.shift(st.d, true, Math.min(4200, 900 + st.d * 18)); }, 450);
    }
    const presets = [[c12(7, 0), 40, '7:00 → 7:40'], [c12(7, 45), 35, '7:45 → 8:20'], [c12(3, 15), 45, '3:15 → 4:00'], [c12(3, 0), 90, '3:00 → 4:30']]
      .map(([s, d, label]) => chipBtn(label, () => { st.start = s; st.d = d; play(); }, 'chip-time'));
    const left = h('div', { class: 'col' },
      card('How long does it take?', 'كم تستغرق؟',
        h('div', { class: 'clock-stage' }, clock.el, times),
        h('button', { type: 'button', class: 'btn btn-soft', onclick: () => play() }, '↻ Play again ', ar('أعيدوا')),
        h('p', { class: 'mini-title' }, 'Examples: ', ar('أمثلة:')), h('div', { class: 'chips' }, presets)));
    const right = h('div', { class: 'col' },
      card('Duration', 'المدة الزمنية', eq, tl,
        arBlock('المدة = الفرق بين وقت النهاية ووقت البداية. نقفز على الخط الزمني من البداية إلى النهاية.')),
      card('Make your own', 'اصنعوا مثالكم',
        h('p', { class: 'mini-title' }, 'Start time: ', ar('وقت البداية:')),
        makeSteppers(d => { st.start = addC(st.start, d); play(); }, 5),
        h('p', { class: 'mini-title' }, 'End time (changes the duration): ', ar('وقت النهاية:')),
        makeSteppers(d => { st.d = Math.max(5, Math.min(180, st.d + d)); play(); }, 5)));
    root.append(h('div', { class: 'learn-grid' }, left, right), goPractice());
    play();
  }

  function learnHm(root) {
    const st = { total: 70 };
    const bars = h('div', { class: 'hbars' });
    const out = h('div', { class: 'equation', 'aria-live': 'polite' });
    const slider = h('input', { type: 'range', min: 5, max: 180, step: 5, value: st.total, class: 'slider', 'aria-label': 'Total minutes' });
    slider.addEventListener('input', () => { st.total = Number(slider.value); update(); });
    function update() {
      const T1 = st.total, full = Math.floor(T1 / 60), rest = T1 % 60;
      slider.value = T1;
      out.replaceChildren(
        h('div', { class: 'eq-main' }, h('strong', null, fmtDuration(T1)), ' = ', h('strong', { class: 'eq-result' }, T1 + ' minutes')),
        h('p', { class: 'eq-note' }, full ? full + ' × 60 = ' + full * 60 + (rest ? ', and ' + full * 60 + ' + ' + rest + ' = ' + T1 + '.' : '.') : rest + ' minutes.'),
        arBlock(fmtDurationAr(T1) + ' = ' + T1 + ' دقيقة'));
      const rows = [];
      for (let i = 0; i < full; i++) rows.push(h('div', { class: 'hbar' }, h('div', { class: 'fill', style: 'width:100%' }, '1 hour = 60 min')));
      if (rest) rows.push(h('div', { class: 'hbar' }, h('div', { class: 'fill part', style: 'width:' + (rest / 60) * 100 + '%' }, rest + ' min')));
      bars.replaceChildren(...rows);
    }
    const presets = [[70, '1 hr 10 min = 70 min'], [90, '90 min = 1 hr 30 min'], [120, '2 hr = 120 min']].map(([t, label]) => chipBtn(label, () => { st.total = t; update(); }, 'chip-time'));
    const left = h('div', { class: 'col' },
      card('The golden rule', 'القاعدة الذهبية',
        h('div', { class: 'rule-big' }, '1 hour = 60 minutes'),
        arBlock('الساعة الواحدة = 60 دقيقة', 'center'),
        h('p', { class: 'note' }, 'Half an hour = 30 minutes · A quarter of an hour = 15 minutes.', ' ', ar('نصف ساعة = 30 دقيقة، وربع ساعة = 15 دقيقة.'))),
      card('Examples', 'أمثلة', h('div', { class: 'chips' }, presets)));
    const right = h('div', { class: 'col' },
      card('Hours ⇄ Minutes', 'ساعات ⇄ دقائق', out, bars,
        h('label', { class: 'slider-label' }, 'Slide the minutes ', ar('حرّكوا الدقائق'), slider),
        h('p', { class: 'mini-title' }, 'Or use the buttons: ', ar('أو استخدموا الأزرار:')),
        makeSteppers(d => { st.total = Math.max(5, Math.min(180, st.total + d)); update(); }, 5)));
    root.append(h('div', { class: 'learn-grid' }, left, right), goPractice());
    update();
  }

  const LEARN = { clock: learnClock, ampm: learnAmPm, ba: learnShift, dur: learnDur, hm: learnHm };

  /* ---------- PRACTICE ---------- */
  const GOOD = ['Great job!', 'Awesome!', 'Well done!', 'You did it!', 'Super!', 'Fantastic!'];
  const GOOD_AR = ['أحسنتم!', 'رائع!', 'عمل ممتاز!', 'برافو!', 'مذهل!'];
  const OOPS = ["Almost! Let's try again.", 'Good try! Have another go.', 'Not quite — you can do it!'];
  const OOPS_AR = ['حاولوا مرة أخرى!', 'محاولة جيدة! جرّبوا ثانية.', 'اقتربتم! أعيدوا المحاولة.'];
  const rnd = () => Math.random();
  const pickOne = arr => arr[Math.floor(rnd() * arr.length)];

  function freshAttempt(keepStar) {
    return { selected: null, wrong: 0, tried: new Set(), solved: false, revealed: false, starAwarded: !!keepStar };
  }
  function nextQuestion(id) {
    const ps = practice[id] || (practice[id] = { deck: [], recent: [], q: null, at: null, ui: null });
    let q = null;
    for (let tries = 0; tries < 12; tries++) {
      if (!ps.deck.length) ps.deck = buildDeck(id, rnd);
      q = makeQuestion(ps.deck.shift(), rnd);
      if (ps.recent.indexOf(q.key) === -1) break;
    }
    ps.recent.push(q.key);
    if (ps.recent.length > 12) ps.recent.shift();
    ps.q = q; ps.at = freshAttempt(false);
    return ps;
  }

  function renderPractice(root, id) {
    const ps = practice[id] && practice[id].q ? practice[id] : nextQuestion(id);
    buildQuestionCard(root, id, ps);
  }

  function buildQuestionCard(root, id, ps) {
    const q = ps.q, at = ps.at, sec = SEC[id];
    const ui = (ps.ui = { optionEls: new Map(), clock: null });
    ui.feedback = h('div', { class: 'feedback info', role: 'status', 'aria-live': 'polite' });
    ui.check = h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => onCheck(id) }, 'Check Answer ✔ ', ar('تحقّقوا'));
    ui.show = h('button', { type: 'button', class: 'btn btn-soft', hidden: true, onclick: () => onShow(id) }, '👀 Show answer ', ar('أظهروا الإجابة'));
    ui.retry = h('button', { type: 'button', class: 'btn btn-soft', onclick: () => onRetry(id) }, '↻ Try again ', ar('أعيدوا السؤال'));
    ui.next = h('button', { type: 'button', class: 'btn btn-soft', onclick: () => onNext(id) }, 'New question ⏭ ', ar('سؤال جديد'));

    const visual = h('div', { class: 'q-visual' });
    (q.clocks || []).forEach(k => visual.append(h('figure', { class: 'q-clock' }, createClock({ c: k.c, label: k.label ? 'Clock ' + k.label : 'Clock', cls: 'medium' }).el, k.label ? h('figcaption', null, k.label) : null)));

    let answers;
    if (q.type === 'setclock') {
      const readout = h('div', { class: 'digital' }, fmtC(q.startC));
      ui.clock = createClock({ c: q.startC, interactive: true, step: 5, label: 'Your clock', cls: 'big', onChange: c => { readout.textContent = fmtC(c); } });
      answers = h('div', { class: 'setclock' }, h('div', { class: 'clock-stage' }, ui.clock.el, readout),
        h('p', { class: 'hint-line' }, '👆 Drag the hands, or use the buttons.', ' ', ar('اسحبوا العقارب أو استخدموا الأزرار.')),
        makeSteppers(d => { if (!at.solved && !at.revealed) ui.clock.shift(d, true, 300); }, 5));
    } else {
      answers = h('div', { class: 'options' + (q.optionStyle === 'clock' ? ' options-clock' : '') + (q.options.length === 2 ? ' two' : ''), role: 'group', 'aria-label': 'Answers' },
        q.options.map((o, i) => {
          const letter = h('span', { class: 'opt-letter', 'aria-hidden': 'true' }, 'ABCD'[i]);
          const btn = h('button', { type: 'button', class: 'opt', 'aria-pressed': 'false', onclick: () => onSelect(id, o.value) },
            q.optionStyle === 'clock' ? [letter, miniClock(o.clockC, 'Option ' + 'ABCD'[i]), h('span', { class: 'sr-only' }, 'Option ' + 'ABCD'[i] + ': ' + o.label)] : [letter, h('span', { class: 'opt-label' }, o.label)]);
          ui.optionEls.set(o.value, btn);
          return btn;
        }));
    }

    const qcard = h('article', { class: 'qcard' },
      h('h3', { class: 'q-prompt' }, q.prompt), arBlock(q.ar, 'q-ar'), visual, answers, ui.feedback,
      h('div', { class: 'actions' }, ui.check, ui.show, ui.retry, ui.next));
    const intro = id === 'challenge' ? h('p', { class: 'note intro' }, 'Questions from all five topics — earn 10 stars to become a Time Master! ', ar('أسئلة من الأقسام الخمسة — اجمعوا 10 نجوم لتصبحوا "Time Master"!')) : null;
    root.replaceChildren(...[progressView(id), intro, qcard].filter(Boolean));
    if (at.solved || at.revealed) {          // coming back to a question that is already finished
      if (ui.clock) ui.clock.setTime(q.target, false);
      setFeedback(id, at.solved ? 'good' : 'info', at.solved ? 'Great job! You already solved this one. ⭐' : 'This is the answer.', at.solved ? 'أحسنتم! حللتم هذا السؤال.' : 'هذه هي الإجابة.', 'Why? ' + q.explain.en, q.explain.ar);
    } else setFeedback(id, 'info', 'Choose or set your answer, then press Check Answer.', 'اختاروا أو اضبطوا إجابتكم ثم اضغطوا تحقّقوا.');
    syncButtons(id);
  }

  function setFeedback(id, kind, en, arText, extraEn, extraAr, hintLine) {
    const ui = practice[id].ui;
    ui.feedback.className = 'feedback ' + kind;
    ui.feedback.replaceChildren(
      h('span', { class: 'fb-owl', 'aria-hidden': 'true' }, '🦉'),
      h('div', { class: 'fb-text' },
        h('p', { class: 'fb-main' }, en), arText ? arBlock(arText) : null,
        hintLine ? h('p', { class: 'fb-hint' }, '💡 Hint: ' + hintLine.en, ' ', ar(hintLine.ar)) : null,
        extraEn ? h('p', { class: 'fb-explain' }, extraEn) : null, extraAr ? arBlock(extraAr) : null));
  }

  function syncButtons(id) {
    const ps = practice[id], ui = ps.ui, at = ps.at, done = at.solved || at.revealed;
    ui.check.hidden = done;
    ui.show.hidden = done || at.wrong < 2;
    ui.retry.hidden = !done && at.wrong === 0 && at.selected == null;
    if (done) { ui.next.className = 'btn btn-primary btn-big'; ui.next.replaceChildren('Next question ➜ ', ar('السؤال التالي')); }
    else { ui.next.className = 'btn btn-soft'; ui.next.replaceChildren('New question ⏭ ', ar('سؤال جديد')); }
    ui.optionEls.forEach((btn, value) => {
      const q = ps.q;
      btn.disabled = done || at.tried.has(value);
      btn.classList.toggle('selected', at.selected === value && !done);
      btn.classList.toggle('tried', at.tried.has(value));
      btn.classList.toggle('correct', done && value === q.correct && (at.solved || at.revealed));
      btn.setAttribute('aria-pressed', at.selected === value ? 'true' : 'false');
    });
    if (ui.clock) ui.clock.el.classList.toggle('locked', done);
  }

  function onSelect(id, value) {
    const ps = practice[id], at = ps.at;
    if (at.solved || at.revealed || at.tried.has(value)) return;
    Sound.play('tap');
    at.selected = value;
    syncButtons(id);
  }

  function onCheck(id) {
    const ps = practice[id], q = ps.q, at = ps.at, ui = ps.ui;
    if (at.solved || at.revealed) return;
    let resp;
    if (q.type === 'setclock') resp = ui.clock.getC();
    else {
      if (at.selected == null) { setFeedback(id, 'info', 'Pick an answer first, then press Check Answer. 👆', 'اختاروا إجابة أولًا ثم اضغطوا تحقّقوا.'); return; }
      resp = at.selected;
    }
    if (checkAnswer(q, resp)) {
      at.solved = true;
      let earned = false;
      const firstTime = !at.starAwarded;
      if (firstTime) { at.starAwarded = true; earned = awardStar(id); }
      Sound.play('good');
      const i = Math.floor(rnd() * GOOD.length);
      setFeedback(id, 'good', GOOD[i] + (firstTime ? ' ⭐ You earned a star!' : ' (You already earned this star.)'), GOOD_AR[i % GOOD_AR.length] + (firstTime ? ' حصلتم على نجمة!' : ''),
        'Why? ' + q.explain.en, q.explain.ar);
      syncButtons(id);
      if (firstTime) { burst(ui.feedback); pulse(document.getElementById('starsTotal')); }
      if (earned) setTimeout(() => showBadge(id), 900);
    } else {
      at.wrong++;
      if (q.type !== 'setclock') { at.tried.add(resp); at.selected = null; }
      Sound.play('oops');
      const i = Math.floor(rnd() * OOPS.length), hint = q.hints[Math.min(at.wrong - 1, q.hints.length - 1)];
      setFeedback(id, 'oops', OOPS[i], OOPS_AR[i], null, null, hint);
      if (at.wrong >= 2) ui.feedback.querySelector('.fb-text').append(h('p', { class: 'fb-more' }, 'Still stuck? Press "Show answer" — it is okay! ', ar('لا بأس! اضغطوا "أظهروا الإجابة".')));
      syncButtons(id);
      ui.feedback.classList.add('shake');
      setTimeout(() => ui.feedback.classList.remove('shake'), 600);
    }
  }

  function onShow(id) {
    const ps = practice[id], q = ps.q, at = ps.at;
    if (at.solved || at.revealed) return;
    at.revealed = true;
    Sound.play('show');
    if (q.type === 'setclock') ps.ui.clock.setTime(q.target, true, 900);
    setFeedback(id, 'info', "Here is the answer. Let's learn from it — no star this time, and that is okay!", 'هذه هي الإجابة. لنتعلّم منها — لا نجمة هذه المرة، ولا بأس!', 'Why? ' + q.explain.en, q.explain.ar);
    syncButtons(id);
  }

  function onRetry(id) {
    const ps = practice[id];
    const keep = ps.at.starAwarded;
    ps.at = freshAttempt(keep);
    const root = document.querySelector('.section-body');
    buildQuestionCard(root, id, ps);
    if (keep) setFeedback(id, 'info', 'Try it again! (This question already gave you its star.)', 'جرّبوا مرة أخرى! (حصلتم على نجمة هذا السؤال من قبل.)');
  }

  function onNext(id) {
    nextQuestion(id);
    buildQuestionCard(document.querySelector('.section-body'), id, practice[id]);
  }

  function awardStar(id) {
    const sec = SEC[id], sp = progress.sections[id] || (progress.sections[id] = { correct: 0, badge: false });
    progress.stars += 1; sp.correct += 1;
    const earned = !sp.badge && sp.correct >= sec.goal;
    if (earned) sp.badge = true;
    saveProgress();
    updateStarsUI(); renderNav(); refreshProgressViews();
    return earned;
  }

  function showBadge(id) {
    const sec = SEC[id];
    Sound.play('badge');
    burst(document.getElementById('starsTotal'), ['🎉', '🏅', '⭐', '🎊']);
    const isChallenge = id === 'challenge';
    openDialog({
      emoji: sec.badge.emoji, title: 'Badge earned: ' + sec.badge.name + '!', titleAr: 'حصلتم على شارة!',
      text: isChallenge ? 'You finished the Challenge! You are a real Time Master! 🏆' : 'You finished ' + sec.title + '. Great work!',
      textAr: isChallenge ? 'أنهيتم التحدّي! أنتم حقًا أبطال الوقت!' : 'أنهيتم هذا القسم. عمل رائع!',
      buttons: [{ label: 'Keep practicing', onClick: () => { /* stay here */ } }, { label: 'Next section ➜', primary: true, onClick: () => { const i = SECTIONS.findIndex(s => s.id === id); showSection(SECTIONS[Math.min(i + 1, SECTIONS.length - 1)].id); } }]
    });
  }

  /* ---------- header buttons ---------- */
  document.getElementById('soundBtn').addEventListener('click', () => {
    progress.muted = !progress.muted; saveProgress(); updateSoundUI();
    if (!progress.muted) Sound.play('tap');
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    openDialog({
      emoji: '🔄', title: 'Start over?', titleAr: 'البدء من جديد؟',
      text: 'This clears all stars and badges on this device.', textAr: 'سيمسح هذا كل النجوم والشارات على هذا الجهاز.',
      buttons: [
        { label: 'Keep my stars', primary: true },
        { label: 'Reset Progress', onClick: () => {
          progress.stars = 0; progress.sections = {}; saveProgress();
          Object.keys(practice).forEach(k => delete practice[k]);
          updateStarsUI(); showSection('clock');
        } }
      ]
    });
  });

  /* ---------- welcome screen ---------- */
  // The greeting comes first; "We're ready" opens the lessons (the section they were on last time, or lesson 1).
  const welcomeEl = document.getElementById('welcome');
  const appEl = document.getElementById('app');
  const readyBtn = document.getElementById('readyBtn');
  const timeNow = () => { const d = new Date(); return c12(d.getHours(), d.getMinutes()); };
  // The clock on this screen turns to the real time right now.
  const welcomeClock = createClock({ c: 0, label: 'Clock showing the time right now', cls: 'big' });
  document.getElementById('welcomeClock').append(welcomeClock.el);
  setTimeout(() => welcomeClock.setTime(timeNow(), true, 2200), 500);
  const welcomeTick = setInterval(() => { if (welcomeClock.getC() !== timeNow()) welcomeClock.setTime(timeNow(), true, 900); }, 5000);

  function enterLessons() {
    clearInterval(welcomeTick);
    welcomeEl.hidden = true;
    appEl.hidden = false;
    showSection(progress.last);
    mainEl.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  readyBtn.addEventListener('click', () => {
    readyBtn.disabled = true;
    Sound.play('start');
    if (reducedMotion()) enterLessons();
    else { welcomeEl.classList.add('leaving'); setTimeout(enterLessons, 450); }
  });
  readyBtn.focus({ preventScroll: true });

  /* ---------- start ---------- */
  updateSoundUI();
  document.getElementById('starCount').textContent = progress.stars;
})();
