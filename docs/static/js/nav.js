/**
 * Minimal nav. Body: data-nav="marketing"|"app", data-nav-depth="0"|"1", data-active="*.html"
 */
(function () {
  function prefix(depth) {
    return depth === "1" ? "../" : "";
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function inject() {
    var body = document.body;
    var depth = body.getAttribute("data-nav-depth") || "0";
    var navType = body.getAttribute("data-nav") || "marketing";
    var active = body.getAttribute("data-active") || "";
    var p = prefix(depth);

    var marketingNav =
      '<a href="' +
      p +
      'app/captions.html" class="nav-link' +
      (active === "captions.html" ? " active" : "") +
      '">Captions</a>' +
      '<a href="' +
      p +
      'help.html" class="nav-link' +
      (active === "help.html" ? " active" : "") +
      '">Help</a>';

    var appNav =
      '<a href="' +
      p +
      'app/captions.html" class="nav-link' +
      (active === "captions.html" ? " active" : "") +
      '">Captions</a>' +
      '<a href="' +
      p +
      'app/transcripts.html" class="nav-link' +
      (active === "transcripts.html" || active === "transcript.html" ? " active" : "") +
      '">History</a>';

    var navInner = navType === "app" ? appNav : marketingNav;
    var aria = navType === "app" ? "App" : "Site";

    var actions =
      navType === "app"
        ? '<a class="btn btn-outline btn-sm" href="' + p + 'index.html">Home</a>'
        : "";

    var brandHref = p + "index.html";

    var actionsBlock = actions
      ? '<div class="header-actions">' + actions + "</div>"
      : "";

    var html =
      '<header class="site-header">' +
      '<div class="site-header-inner">' +
      '<div class="nav-cluster">' +
      '<a href="' +
      brandHref +
      '" class="brand">NeuroAssist</a>' +
      '<nav class="site-nav" aria-label="' +
      esc(aria) +
      '">' +
      navInner +
      "</nav></div>" +
      actionsBlock +
      "</div></header>";

    var root = document.getElementById("nav-root");
    if (root) root.innerHTML = html;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
