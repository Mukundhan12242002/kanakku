#!/usr/bin/env python3
"""Builds site/ from src/. Static output, no runtime dependencies.

Page fragments live in src/pages/*.html: head part + <!--BODY--> + body part.
Tokens in bodies: {{HEADER:key}}, {{FOOTER}}, {{CHECKED}}.
Per page, this script adds canonical, Open Graph, JSON-LD (WebApplication, plus FAQPage when the page
contains <details class="faq">), and writes sitemap.xml and robots.txt.

  python3 build.py            -> site/
  python3 build.py --preview  -> also preview/ (index without a document wrapper, for the Artifact tool)
"""
import json, os, re, shutil, sys, html

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
CFG = json.load(open(os.path.join(ROOT, 'config.json'), encoding='utf-8'))
BASE = CFG['baseUrl']
CHECKED = CFG['checked']

# (file, key, nav label, kind)   kind: tool | info | home
PAGES = [
    ('index.html', 'home', 'Home', 'home'),
    ('property-cost-tamil-nadu.html', 'property', 'Property cost', 'tool'),
    ('registration-duty-tamil-nadu.html', 'deeds', 'Deed duty', 'tool'),
    ('home-loan-prepayment-calculator.html', 'prepay', 'Loan prepayment', 'tool'),
    ('sip-step-up-calculator.html', 'sip', 'SIP step-up', 'tool'),
    ('gratuity-calculator-labour-codes.html', 'gratuity', 'Gratuity', 'tool'),
    ('tneb-bill-estimator.html', 'tneb', 'TNEB bill', 'tool'),
    ('about.html', 'about', 'About', 'info'),
    ('privacy.html', 'privacy', 'Privacy', 'info'),
]
ASSETS = ['styles.css', 'calc.js', 'ui.js']

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700'
         '&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600'
         '&family=Noto+Sans+Tamil:wght@400;600&display=swap">'
         '<link rel="stylesheet" href="styles.css">')

FOOTER = ('<footer class="site-foot wrap">'
          '<p>Estimates for planning. They are not legal, tax or financial advice, and a government office, your lender or your employer decides the final figure.</p>'
          '<p>Rates and rules last checked ' + CHECKED + '. Everything you type stays in your browser. '
          '<a href="about.html">About and method</a> · <a href="privacy.html">Privacy</a></p>'
          '</footer>')


def header(active):
    items = ''.join(
        '<a href="%s"%s>%s</a>' % (f, ' aria-current="page"' if k == active else '', label)
        for f, k, label, kind in PAGES if kind == 'tool')
    return ('<header class="site-head wrap"><a class="brand" href="index.html">Kanakku<span>கணக்கு</span></a>'
            '<nav aria-label="Calculators">' + items + '</nav></header>')


def strip_tags(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()


def seo(name, kind, head, body):
    title = re.search(r'<title>(.*?)</title>', head, re.S).group(1).strip()
    desc = re.search(r'<meta name="description" content="(.*?)"', head, re.S)
    desc = html.unescape(desc.group(1)) if desc else ''
    url = BASE + ('' if name == 'index.html' else name)
    full_title = title if name == 'index.html' else title + ' | Kanakku'
    head = re.sub(r'<title>.*?</title>', '<title>' + html.escape(full_title) + '</title>', head, flags=re.S)
    tags = ['<link rel="canonical" href="%s">' % url,
            '<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="Kanakku">',
            '<meta property="og:title" content="%s">' % html.escape(full_title, quote=True),
            '<meta property="og:description" content="%s">' % html.escape(desc, quote=True),
            '<meta property="og:url" content="%s">' % url,
            '<meta name="twitter:card" content="summary">',
            '<meta name="theme-color" content="#2A3FA3">']
    graph = []
    if kind == 'tool':
        graph.append({'@context': 'https://schema.org', '@type': 'WebApplication', 'name': title, 'url': url,
                      'description': desc, 'applicationCategory': 'FinanceApplication',
                      'operatingSystem': 'Any', 'inLanguage': CFG['language'],
                      'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'INR'}})
    faqs = re.findall(r'<details class="faq"><summary>(.*?)</summary>\s*(.*?)</details>', body, re.S)
    if faqs:
        graph.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': strip_tags(q),
             'acceptedAnswer': {'@type': 'Answer', 'text': strip_tags(a)}} for q, a in faqs]})
    for g in graph:
        tags.append('<script type="application/ld+json">' + json.dumps(g, ensure_ascii=False) + '</script>')
    return head + '\n' + '\n'.join(tags)


def render(name, key, kind, wrapped):
    raw = open(os.path.join(SRC, 'pages', name), encoding='utf-8').read()
    head, body = raw.split('<!--BODY-->')
    body = re.sub(r'\{\{HEADER:(\w+)\}\}', lambda m: header(m.group(1)), body)
    body = body.replace('{{FOOTER}}', FOOTER).replace('{{CHECKED}}', CHECKED)
    head = head.replace('{{CHECKED}}', CHECKED)
    if wrapped:
        head = seo(name, kind, head, body)
        return ('<!doctype html>\n<html lang="en-IN">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                + head.strip() + '\n' + FONTS + '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n')
    return head.strip() + '\n' + FONTS + '\n' + body.strip() + '\n'


def build(out, preview):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    for name, key, _, kind in PAGES:
        if preview and kind == 'info':
            pass
        wrapped = not (preview and name == 'index.html')
        open(os.path.join(out, name), 'w', encoding='utf-8').write(render(name, key, kind, wrapped))
    for a in ASSETS:
        shutil.copy(os.path.join(SRC, a), os.path.join(out, a))
    if not preview:
        urls = ''.join('<url><loc>%s</loc><lastmod>%s</lastmod></url>\n' %
                       (BASE + ('' if n == 'index.html' else n), CFG['checkedIso']) for n, _, _, _ in PAGES)
        open(os.path.join(out, 'sitemap.xml'), 'w').write(
            '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')
        open(os.path.join(out, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n' % BASE)
        open(os.path.join(out, '404.html'), 'w', encoding='utf-8').write(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            '<title>Page not found | Kanakku</title><link rel="stylesheet" href="styles.css">'
            '<main class="wrap"><h1>That page is not here</h1><p><a href="index.html">Go to the Kanakku calculators</a></p></main>')


if __name__ == '__main__':
    build(os.path.join(ROOT, 'site'), False)
    msg = 'built site/'
    if '--preview' in sys.argv:
        build(os.path.join(ROOT, 'preview'), True)
        msg += ' and preview/'
    print(msg)
