(function () {
  function inject() {
    var body = document.body;
    if (body.getAttribute("data-show-footer") !== "true") return;
    var depth = body.getAttribute("data-nav-depth") || "0";
    var p = depth === "1" ? "../" : "";
    var y = new Date().getFullYear();
    var html =
      '<footer class="site-footer">' +
      '<div class="site-footer-inner">' +
      "<p>© " +
      y +
      ' NeuroAssist · <a href="' +
      p +
      'help.html">Help</a> · <a href="' +
      p +
      'app/captions.html">Captions</a></p>' +
      "</div></footer>";
    var root = document.getElementById("footer-root");
    if (root) root.innerHTML = html;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
