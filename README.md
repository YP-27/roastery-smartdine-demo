# THE ROASTERY & CO. — SmartDine Demo Site

A 2-page demo: a real cafe landing page (`index.html`) plus the QR digital
menu (`menu.html`), so a client sees the whole product — not just the order
flow. Static files, no build step, free to host on GitHub Pages. Both pages
work from a plain URL, not only from a scanned QR code.

## Files

```
index.html     Home / landing page — hero, about, menu preview, gallery,
                testimonials, visit info, footer
menu.html      The digital menu (cart, checkout, WhatsApp order) — same
                app as before, now linked from the home page nav
base.css       Shared design tokens (colors, fonts, resets) — loaded by
                both pages, edit here to reskin the whole demo at once
home.css       Styles specific to index.html
menu.css       Styles specific to menu.html
home.js        Mobile nav toggle for index.html
app.js         Menu logic — table detection, cart, checkout (unchanged)
config.json    Cafe name, branding, hours, WhatsApp number, festival
                banner, full menu — the one file you edit day-to-day
```

## What's demo / placeholder right now

Everything is filled in with placeholder content so the site is presentable
as-is. Before showing a specific prospect or going live, swap:

- **Photos** — all images are stock Unsplash URLs (hero, about, gallery,
  menu preview cards). Replace the `src="..."` values in `index.html` with
  the client's own photos, or their branded Unsplash equivalents for a pitch.
- **Copy** — the About story, testimonial quotes, and address/hours in
  `index.html` are placeholder text written for "THE ROASTERY & CO."
- **`config.json`** — `whatsappPhone` and `sheetWebhookUrl` are placeholders
  (see below). Menu items are demo dishes.
- **Logo** — currently a stock photo standing in for a logo mark. Drop in
  a real logo image and point `logoUrl` (in `config.json`) and the
  `<img class="cafe-logo">`/brand text in `index.html` at it.

## Editing the menu (config.json)

Same as before — open `config.json` and change:

- `cafeDetails` — name, tagline, hours, logo, WhatsApp number, colors
- `festivalOffer.isActive` — show/hide the banner
- `menu[].price`, `menu[].isAvailable`, `menu[].isVeg`

Save, commit, push — GitHub Pages updates in ~1 minute.

## Editing the home page

There's no config file for the landing page (it's mostly one-off marketing
copy, not day-to-day data), so edit `index.html` directly:

- Hero headline/subtext — `<section class="hero">`
- About story — `<section class="about" id="about">`
- Menu preview cards — `<section class="menu-preview">` (3 hardcoded dishes;
  keep these in sync with `config.json` by hand, or point them at your
  actual best-sellers)
- Gallery images — `<section class="gallery" id="gallery">`
- Testimonials — `<section class="testimonials">`
- Address/hours/phone — `<section class="visit" id="visit">`

## Table detection & direct URL access

Both apply as before:

- Visiting the site directly (`https://you.github.io/repo/`) works fine —
  `index.html` needs no query parameter at all, and `menu.html` without one
  just shows "Takeaway" instead of a table number.
- A table QR code should point at `.../menu.html?table=04` (or `?t=04`) to
  skip the home page and land straight on the order screen.

## Deploying to GitHub Pages

1. Push all files in this folder to the root of a GitHub repo (or a `/docs`
   folder).
2. Repo → **Settings → Pages** → Source: deploy from branch → `main` (and
   `/docs` if used).
3. Live at `https://<username>.github.io/<repo>/`.
4. For table QR codes, generate one per table pointing at
   `https://<username>.github.io/<repo>/menu.html?table=<number>`.

## Order-logging webhook (Google Sheets)

Unchanged from the menu-only build — see the Apps Script snippet below,
paste the deployed `/exec` URL into `config.json` → `sheetWebhookUrl`.

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.timestamp, data.name, data.phone, data.table, data.items, data.total
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy → New deployment → Web app → Execute as **Me**, access **Anyone**.
The site fires this with `mode: 'no-cors'` right before redirecting to
WhatsApp, so it never blocks the order if the webhook is slow or misconfigured.
