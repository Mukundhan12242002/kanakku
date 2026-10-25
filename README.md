# Kanakku (கணக்கு)

Free, static calculators for Tamil Nadu and India: property cost, registration duty by deed, gratuity under the labour codes, TNEB bills, home loan prepayment and SIP step-up. No backend, no tracking, no accounts. Hosted free on GitHub Pages.

## Run it

```
python3 build.py          # writes site/
python3 -m http.server -d site 8000
node tests/calc.test.js   # calculation tests
python3 tests/smoke.py    # headless-browser check of every page (needs playwright)
python3 scripts/check_freshness.py
```

## Layout

| Path | What |
|---|---|
| `src/calc.js` | All calculations and the dated `RATES` and `DEEDS` tables. Pure functions, tested in Node. |
| `src/ui.js`, `src/styles.css` | Shared DOM helpers and theme (light and dark). |
| `src/pages/*.html` | One fragment per page: head, `<!--BODY-->`, body and page script. |
| `build.py`, `config.json` | Assembles `site/`, adds canonical, Open Graph, JSON-LD, sitemap, robots, 404. |
| `tests/`, `scripts/` | Unit tests, browser smoke test, rate freshness check. |
| `docs/` | `LAUNCH.md`, `ADDING_A_CALCULATOR.md`, `UPDATING_RATES.md`. |

## Rules for this repo

- A rate goes into `RATES` only with a source and a `checked` date. If sources disagree, say so on the page.
- Every calculation gets a test whose expected value was worked out by hand, not copied from the code's output.
- No analytics, ads or AWS resources are added without the owner agreeing first.
