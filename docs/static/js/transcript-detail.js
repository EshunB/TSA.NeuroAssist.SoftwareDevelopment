(function () {
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s != null ? String(s) : "";
    return d.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    var main = document.getElementById("transcript-detail-root");
    if (!main || !window.NAStorage) return;

    if (!id) {
      main.innerHTML =
        '<p class="muted"><a href="transcripts.html">Back</a></p>';
      return;
    }

    window.NAStorage.getSession(id).then(function (session) {
      if (!session) {
        main.innerHTML =
          '<p class="muted">Not found. <a href="transcripts.html">Back</a></p>';
        return;
      }

      var desc =
        esc(session.mode) +
        " • " +
        esc(session.languageSource) +
        (session.languageTarget
          ? " → " + esc(session.languageTarget)
          : "");

      var segs = session.segments || [];
      var body =
        segs.length === 0
          ? '<p class="muted">This transcript has no segments yet.</p>'
          : '<ul class="stack-md" style="list-style:none;padding:0;margin:0">' +
            segs
              .map(function (seg) {
                var tr = seg.translatedText
                  ? '<p class="emerald" style="margin:0.125rem 0 0">' +
                    esc(seg.translatedText) +
                    "</p>"
                  : "";
                return (
                  '<li class="segment-item"><p class="segment-time">' +
                  esc(seg.startTimeMs) +
                  "–" +
                  esc(seg.endTimeMs) +
                  ' ms</p><p style="color:var(--slate-900);margin:0">' +
                  esc(seg.originalText) +
                  "</p>" +
                  tr +
                  "</li>"
                );
              })
              .join("") +
            "</ul>";

      main.innerHTML =
        '<div class="page-header"><div><h1>' +
        esc(session.title) +
        '</h1><p class="page-header-desc">' +
        desc +
        '</p></div></div><article class="card"><div class="card-header"><h2 class="card-title">Transcript</h2></div><div class="card-body small" style="color:var(--slate-700)">' +
        body +
        "</div></article>";
    });
  });
})();
