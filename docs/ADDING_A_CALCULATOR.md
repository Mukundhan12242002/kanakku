# Adding a calculator

1. **Calculation first.** Add a pure function to `src/calc.js` and export it. Put any rates in `RATES` under a new group with `checked: 'YYYY-MM-DD'`.
2. **Test.** Add cases to `tests/calc.test.js` with values worked out by hand. Include edges (zero, caps, cliffs).
3. **Page.** Copy a fragment in `src/pages/` (the deed page is the simplest). Keep: `<title>`, meta description, `claude:viewport-fit-sides` meta, `{{HEADER:key}}`, a "where sources disagree" box, "How this is calculated", sources with a date, `<details class="faq"><summary>…</summary><p>…</p></details>` questions (these become FAQ structured data), `{{FOOTER}}`.
4. **Register.** Add the file to `PAGES` in `build.py` and a card to `src/pages/index.html`.
5. **Verify.** `node tests/calc.test.js && python3 build.py && python3 tests/smoke.py`.

Write the page for the question people actually search, for example "stamp duty for gift deed Tamil Nadu", not for the formula.
