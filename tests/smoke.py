#!/usr/bin/env python3
"""Loads every built page in headless Chromium at desktop and phone width.
Fails on JavaScript errors, horizontal page scroll, or an empty result ledger on tool pages.
Usage: python3 build.py && python3 tests/smoke.py"""
import os, sys, http.server, threading, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
PAGES = sorted(f for f in os.listdir(SITE) if f.endswith('.html') and f != '404.html')
TOOLS = [p for p in PAGES if p not in ('index.html', 'about.html', 'privacy.html')]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass


handler = functools.partial(Quiet, directory=SITE)
srv = socketserver.TCPServer(('127.0.0.1', 0), handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

bad = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for width, height in ((1280, 800), (390, 844)):
        ctx = b.new_context(viewport={'width': width, 'height': height})
        for name in PAGES:
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and errs.append(m.text))
            pg.goto('http://127.0.0.1:%d/%s' % (port, name), wait_until='domcontentloaded')
            pg.wait_for_timeout(150)
            over = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            rows = pg.locator('#ledger .row').count() if name in TOOLS else -1
            ok = not errs and over <= 1 and rows != 0
            print(('ok   ' if ok else 'FAIL ') + '%4d %-42s overflow=%s ledger_rows=%s %s' % (width, name, over, rows, errs))
            if not ok:
                bad.append((width, name))
            pg.close()
        ctx.close()
    b.close()
srv.shutdown()
sys.exit(1 if bad else 0)
