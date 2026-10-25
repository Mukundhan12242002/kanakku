#!/usr/bin/env python3
"""Fails when any rate group in src/calc.js was last checked more than freshnessLimitDays ago,
or when the display date in config.json disagrees with the code. Run weekly by CI."""
import datetime, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, 'config.json'), encoding='utf-8'))
limit = cfg['freshnessLimitDays']
today = datetime.date.today()
code = open(os.path.join(ROOT, 'src', 'calc.js'), encoding='utf-8').read()
dates = re.findall(r"(\w+):\s*\{\s*checked:\s*'(\d{4}-\d{2}-\d{2})'", code)
if not dates:
    sys.exit('no rate groups with a checked date found in src/calc.js')
bad = 0
for name, d in dates:
    age = (today - datetime.date.fromisoformat(d)).days
    status = 'ok' if age <= limit else 'STALE'
    print('%-9s checked %s (%d days ago) %s' % (name, d, age, status))
    bad += age > limit
oldest = min(d for _, d in dates)
if oldest < cfg['checkedIso']:
    print('note: config.json checkedIso (%s) is newer than the oldest rate group (%s)' % (cfg['checkedIso'], oldest))
    bad += 1
if bad:
    sys.exit('Rates need re-checking against their sources. See docs/UPDATING_RATES.md.')
