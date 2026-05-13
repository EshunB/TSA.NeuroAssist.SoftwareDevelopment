(function () {
  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s != null ? String(s) : "";
    return d.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var list = document.getElementById("transcripts-list");
    var errBox = document.getElementById("transcripts-error");
    if (!list || !window.NAStorage) {
      if (errBox) {
        errBox.style.display = "block";
        errBox.textContent = "Could not load transcript storage.";
      }
      return;
    }

    window.NAStorage
      .listSessions()
      .then(function (sessions) {
        if (!sessions.length) {
          list.innerHTML =
            '<li><p class="muted">Nothing saved yet. Use <strong>Save</strong> on the Captions page.</p></li>';
          return;
        }
        list.innerHTML = sessions
          .map(function (s) {
            var tgt = s.languageTarget ? " → " + esc(s.languageTarget) : "";
            var when = esc(s.createdAt);
            return (
              '<li><a class="session-link" href="transcript.html?id=' +
              encodeURIComponent(s.id) +
              '"><div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem"><p style="margin:0;font-size:0.75rem;font-weight:600;color:var(--slate-900)">' +
              esc(s.title) +
              '</p><span class="badge">' +
              esc(s.mode) +
              "</span></div>" +
              '<p class="session-meta">' +
              when +
              " • " +
              esc(s.languageSource) +
              tgt +
              "</p></a></li>"
            );
          })
          .join("");
      })
      .catch(function (e) {
        if (errBox) {
          errBox.style.display = "block";
          errBox.textContent =
            (e && e.message) || "Failed to load transcripts from your browser.";
        }
      });
  });
})();
