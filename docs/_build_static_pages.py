#!/usr/bin/env python3
"""Generate minimal static HTML under docs/. Run: python3 docs/_build_static_pages.py"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent


def shell(
    *,
    title: str,
    depth: int,
    nav: str,
    active: str,
    show_footer: bool,
    body_layout: str,
    main_class: str,
    inner_html: str,
    extra_scripts: str = "",
) -> str:
    p = "../" if depth == 1 else ""
    css = f"{p}static/css/styles.css"
    nav_js = f"{p}static/js/nav.js"
    footer_js = f"{p}static/js/footer.js" if show_footer else ""
    footer = (
        f'<div id="footer-root"></div>\n<script src="{footer_js}" defer></script>\n'
        if show_footer
        else ""
    )
    data_footer = ' data-show-footer="true"' if show_footer else ""
    if main_class == "main-app":
        inner_wrapped = (
            f'    <div class="main-app-inner stack-lg">\n{inner_html}\n    </div>'
        )
    else:
        inner_wrapped = inner_html
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} – NeuroAssist</title>
  <link rel="stylesheet" href="{css}">
</head>
<body class="{body_layout}" data-nav="{nav}" data-nav-depth="{depth}" data-active="{active}"{data_footer}>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div id="nav-root"></div>
  <main id="main-content" class="{main_class}">
{inner_wrapped}
  </main>
{footer}  <script src="{nav_js}" defer></script>
{extra_scripts}</body>
</html>
"""


def write(rel: str, content: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("wrote", rel)


# Home
write(
    "index.html",
    shell(
        title="NeuroAssist",
        depth=0,
        nav="marketing",
        active="index.html",
        show_footer=True,
        body_layout="layout-marketing",
        main_class="main-marketing",
        inner_html="""
    <section class="stack-lg" style="padding-top:1rem;padding-bottom:3rem;max-width:40rem">
      <h1 class="hero-title" style="font-size:2rem">Live captions in your browser</h1>
      <p class="muted" style="font-size:1.05rem;margin-top:0.75rem">
        Tap the button, allow the microphone, and read what is being said. Works best in Chrome on a computer.
      </p>
      <div style="margin-top:1.5rem;display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center">
        <a class="btn btn-primary btn-lg" href="app/captions.html">Start captions</a>
        <a class="btn btn-ghost" href="help.html">How this works</a>
      </div>
    </section>""",
    ),
)

# One short help page
write(
    "help.html",
    shell(
        title="How this works",
        depth=0,
        nav="marketing",
        active="help.html",
        show_footer=True,
        body_layout="layout-marketing",
        main_class="main-marketing",
        inner_html="""
    <div class="stack-md" style="max-width:36rem">
      <h1 style="font-size:1.35rem;margin:0">How this works</h1>
      <ul class="muted small list-disc" style="padding-left:1.25rem;margin-top:1rem;line-height:1.7">
        <li>This site can be hosted on GitHub Pages—open the link, no install.</li>
        <li>Captions use your browser’s microphone and speech-to-text.</li>
        <li>Saved sessions stay on <strong>this device only</strong> (browser storage).</li>
      </ul>
      <p style="margin-top:1.25rem"><a class="btn btn-primary" href="app/captions.html">Start captions</a></p>
    </div>""",
    ),
)

captions_inner = """
    <div class="page-header">
      <div><h1>Captions</h1><p class="page-header-desc">Space to start or pause. Ctrl or Cmd + S to save.</p></div>
      <div class="page-header-actions">
        <button type="button" class="btn btn-primary" id="btn-toggle-listen" aria-pressed="false">Listen</button>
        <button type="button" class="btn btn-outline" id="btn-clear" disabled>Clear</button>
        <button type="button" class="btn btn-secondary" id="btn-save" disabled>Save</button>
        <button type="button" class="btn btn-outline" id="btn-copy" disabled>Copy</button>
      </div>
    </div>
    <div class="grid-captions">
      <section class="captions-panel">
        <div class="captions-panel-head">
          <h2 class="card-title">Captions</h2>
          <span class="small muted">Status: <span id="caption-status" style="font-weight:500;color:var(--slate-900)">Stopped</span></span>
        </div>
        <div style="padding:0 1rem">
          <p id="banner-unsupported" class="alert alert-amber" style="display:none;margin-bottom:0.75rem"></p>
          <p id="banner-error" class="alert alert-red" style="display:none;margin-bottom:0.75rem"></p>
        </div>
        <div id="captions-stream" class="captions-scroll" aria-live="polite">
          <p class="small muted">Press <strong>Space</strong> or <strong>Listen</strong> to begin.</p>
        </div>
      </section>
      <article class="card">
        <div class="card-header"><h2 class="card-title">Language</h2></div>
        <div class="card-body small muted" style="padding-top:1rem">
          <select class="select" id="caption-language" aria-label="Language">
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
          </select>
          <p style="margin-top:1rem">Segments: <strong id="segment-count">0</strong></p>
          <div style="display:none;margin-top:0.5rem" id="session-length-row"><span class="small">Length </span><span id="session-length"></span></div>
          <p id="save-error" class="alert alert-red" style="display:none;margin-top:0.75rem"></p>
          <p class="small" style="margin-top:1rem;font-weight:500">Buffer</p>
          <div id="full-buffer" class="small" style="min-height:4rem;border:1px solid var(--slate-200);border-radius:0.375rem;padding:0.5rem;background:var(--slate-50)"></div>
        </div>
      </article>
    </div>"""

captions_scripts = """  <script src="../static/js/storage.js"></script>
  <script src="../static/js/captions.js" defer></script>
"""

write(
    "app/captions.html",
    shell(
        title="Captions",
        depth=1,
        nav="app",
        active="captions.html",
        show_footer=False,
        body_layout="layout-app",
        main_class="main-app",
        inner_html=captions_inner,
        extra_scripts=captions_scripts,
    ),
)

write(
    "app/transcripts.html",
    shell(
        title="History",
        depth=1,
        nav="app",
        active="transcripts.html",
        show_footer=False,
        body_layout="layout-app",
        main_class="main-app",
        inner_html="""
    <div class="page-header"><div><h1>History</h1><p class="page-header-desc">Saved on this device.</p></div></div>
    <article class="card"><div class="card-body small">
      <p id="transcripts-error" class="alert alert-red" style="display:none"></p>
      <ul id="transcripts-list" style="list-style:none;padding:0;margin:0"></ul>
    </div></article>""",
        extra_scripts="""  <script src="../static/js/storage.js"></script>
  <script src="../static/js/transcripts-page.js" defer></script>
""",
    ),
)

write(
    "app/transcript.html",
    shell(
        title="Session",
        depth=1,
        nav="app",
        active="transcript.html",
        show_footer=False,
        body_layout="layout-app",
        main_class="main-app",
        inner_html='<div id="transcript-detail-root"></div>',
        extra_scripts="""  <script src="../static/js/storage.js"></script>
  <script src="../static/js/transcript-detail.js" defer></script>
""",
    ),
)

# 404
write(
    "404.html",
    """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Not found – NeuroAssist</title>
  <link rel="stylesheet" href="static/css/styles.css">
</head>
<body class="layout-marketing" data-nav="marketing" data-nav-depth="0" data-active="" data-show-footer="false">
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div id="nav-root"></div>
  <main id="main-content" class="main-marketing">
    <p class="muted"><a href="index.html">Home</a> · <a href="app/captions.html">Captions</a></p>
  </main>
  <script src="static/js/nav.js" defer></script>
</body>
</html>
""",
)

print("done")
