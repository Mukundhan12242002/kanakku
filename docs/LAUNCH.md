# Launch and the 4-week test

## Go live (about 10 minutes)

1. Merge to `main`. CI runs the tests.
2. GitHub: Settings > Pages > Source: **GitHub Actions**.
3. Settings > Secrets and variables > Actions > Variables > new variable `ENABLE_PAGES` = `true`.
4. Actions tab > "Deploy to GitHub Pages" > Run workflow. The site appears at the `baseUrl` in `config.json`. (Current live host: Cloudflare, https://kanakku.mukundhansubbaraj.workers.dev. Keep only one host live so search engines see one copy.)
5. If you use a different address (custom domain), change `baseUrl` in `config.json` and rebuild.

## Search Console

1. Add the site as a URL-prefix property at search.google.com/search-console.
2. Verify with the HTML-tag method (add the meta tag to the head of `src/pages/index.html`) or a DNS record.
3. Submit `sitemap.xml`.
4. Optionally do the same in Bing Webmaster Tools.

## The experiment

Question: do these pages get found, and does that lead to anything worth continuing?

- Week 1: live, sitemap submitted. Share each page once where Tamil Nadu property or salary questions are asked, only where links are allowed.
- Weeks 2 to 3: fix what Search Console reports. Do not add features.
- Week 4 review, using Search Console Performance:
  - **Continue** if pages are indexed and impressions are about 500 a week or more.
  - **Stop or change direction** if fewer than 10 pages are indexed or impressions are under about 100 a week.
  - Anything in between: give it four more weeks and add only pages that match queries already showing up.

Check your employer's outside-income policy before adding ads or selling anything. Ads (AdSense) usually need an About, Privacy and original content, which the site already has, but do not add them until traffic justifies it.
