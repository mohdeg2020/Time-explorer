# Time Explorer 🦉⏰

A small, friendly game that helps children (boys and girls) learn **Time and Duration**: reading the clock, morning and evening, time before and after, duration, and hours and minutes.
The screens are in simple English, with a short Arabic explanation next to the key ideas. The Arabic talks to the children as a group ("اختاروا", "أحسنتم").

## How to run

1. Open the folder and **double-click `index.html`** (it opens in Chrome, Edge, Firefox or Safari).
2. That's all. No internet, no login, no installation, no server.

Files: `index.html`, `style.css`, `script.js`. (`tests/` is only for checking the math and is not needed to play.)

Works on a computer, a tablet and a phone. Stars and badges are saved **in that browser only**. Use **Reset Progress** (top right) to start again.

## How to use it with children

When the app opens, a welcome screen greets everyone ("أهلًا بيكو يا حلوين!", with the owl and a clock that shows the real time right now). When they press **We're ready! / جاهزين!**, the lessons open: lesson 1 the first time, and the section they were on the next times. The greeting texts are at the top of `index.html` if you want to change them.

Each of the six sections has a **📖 Learn** page and a **✏️ Practice** page (section 6 is practice only).

| # | Section | What the child does |
|---|---------|---------------------|
| 1 | Learn the Clock | Drags the hands of a magic clock, sees how the time is read (each number = 5 minutes, one full turn = 60 minutes) |
| 2 | Morning or Evening? | Slides through the 24-hour day and links times to daily activities (AM / PM, noon, midnight) |
| 3 | After & Before | Watches the long hand jump forward or backward by 5, 10, 15, 20, 30 or 35 minutes |
| 4 | Duration | Finds how long something takes between a start time and an end time |
| 5 | Hours & Minutes | Changes hours into minutes and back (1 hour = 60 minutes) |
| 6 | Practice & Challenge | 10 mixed questions, earn a ⭐ for each to become a Time Master 🏆 |

Suggested way to play:

1. Start with **Learn** and let them play with the clock. Drag the hands, press the examples.
2. Press **Let's practice!** Each correct answer gives a ⭐ and a happy message. 5 stars in a section earn a badge 🏅.
3. If someone answers wrong, nothing is taken away. They get a hint and can try again. After two wrong tries a **Show answer** button appears, with a short explanation (no star for that question, and that's fine).
4. **Try again** replays the same question (no second star), **New question** gives a different one.
5. Every answer has its own sound: a celebration for a correct answer (a fanfare, a cheering crowd and applause), a sad falling "wah-wah-wah-waaah" for a wrong one, a gentle chime for **Show answer**, and a bigger fanfare when a badge is earned. The sound starts after the first tap or click on the page, and can be turned off with the **Sound** button.

Tips: sit next to the children for the first session, read the question aloud, and let them say the answer before they press **Check Answer**. In "set the clock" questions they can drag either hand or use the big **+ / −** buttons.

### للأهل والمعلّمين (بالعربي)

افتحوا الملف `index.html` بنقرتين، وسيعمل مباشرة بدون إنترنت. لكل قسم صفحة **تعلّموا** (شرح وساعة تفاعلية) وصفحة **تدرّبوا** (أسئلة). الإجابة الصحيحة تعطي نجمة، والخطأ لا يخصم شيئًا؛ يظهر تلميح ويمكن المحاولة من جديد. يُفضَّل أن يجلس أحد الكبار بجانب الأطفال في المرة الأولى، ويتركهم يقولون الإجابة بصوت عالٍ قبل أن يضغطوا **Check Answer**.

## For developers

Plain HTML, CSS and JavaScript. No framework, no build step, no backend, nothing to install.

`script.js` has two parts: the time logic and question generators (no DOM), and the user interface.
Every question is made from random numbers, and the app checks the answer from the real time values, including rolling over 12 (for example 11:50 + 20 minutes = 12:10).

Run the tests (needs Node.js; there are no packages to install):

```
node tests/run-tests.js
```

The tests cover the time arithmetic (3:00 + 30 minutes, 7:00 − 15 minutes, 1 hour 10 minutes = 70 minutes, 90 minutes = 1 hour 30 minutes, crossing 12), hand angles, AM/PM, noon and midnight, answer checking, and thousands of generated questions that are solved again independently to make sure each one has exactly one correct answer.
