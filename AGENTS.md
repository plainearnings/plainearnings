# Agent notes

## Google AdSense meta tag

Every HTML page under `docs/` (including nested paths such as `docs/earnings/...`) must include this tag in `<head>`, typically right after `<meta charset="utf-8">`:

```html
<meta name="google-adsense-account" content="ca-pub-6709464128865038">
```

When you create any new HTML page, add this tag. Do not omit it from generated report pages, company index pages, or the landing page.

## Google AdSense horizontal ad

Every content HTML page under `docs/` (landing, company indexes, quarter reports — not redirect-only pages) must place this ad block immediately after the closing `</header>` of `<header class="topbar">`, wrapped in `div.ad-slot-top` so shared CSS can cap height (~100px) and hide unfilled slots:

```html
<div class="ad-slot-top">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6709464128865038"
     crossorigin="anonymous"></script>
<!-- plainearnings -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-6709464128865038"
     data-ad-slot="7743095279"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
</div>
```

Keep the ad directly under the site topbar header and above the main page content. Do not remove the `ad-slot-top` wrapper.
