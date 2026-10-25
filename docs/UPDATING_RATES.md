# Updating rates

CI fails weekly when a rate group in `src/calc.js` is older than `freshnessLimitDays` (90) in `config.json`.

1. Re-check each source listed on the page (state rate chart, TNERC tariff order, labour code notifications).
2. Change the numbers in `RATES` or `DEEDS`, update tests that depend on them, and set `checked` to today.
3. Update `checked` and `checkedIso` in `config.json` (shown in the footer and used in the sitemap).
4. Run the tests and build, then commit with the source named in the message.

If a source cannot be opened, leave the date alone and say so on the page. Do not bump a date you did not verify.
