(function () {
  "use strict";

  var provider = {
    recognition: null,
    status: "idle",
    error: null
  };

  function getRecognition() {
    var SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      provider.status = "unsupported";
      provider.error =
        "Web Speech API is not supported in this browser. Try Chrome on desktop.";
      return null;
    }
    if (!provider.recognition) {
      provider.recognition = new SpeechRecognition();
    }
    return provider.recognition;
  }

  var segments = [];
  var sessionStart = 0;
  var onSegmentCallback = null;

  function renderSegments() {
    var container = document.getElementById("captions-stream");
    if (!container) return;
    if (segments.length === 0) {
      container.innerHTML =
        '<p class="small muted">Press <strong>Space</strong> or select <strong>Start listening</strong> to see captions here.</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      var conf =
        typeof seg.confidence === "number"
          ? '<p class="small" style="margin-top:0.5rem;color:#94a3b8;font-weight:500">Accuracy: ' +
            Math.round(seg.confidence * 100) +
            "%</p>"
          : "";
      html +=
        '<div class="caption-block" data-id="' +
        seg.id +
        '"><p>' +
        escapeHtml(seg.text) +
        "</p>" +
        conf +
        "</div>";
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function updateStatus() {
    var el = document.getElementById("caption-status");
    if (!el) return;
    if (provider.status === "unsupported") {
      el.textContent = "Not supported";
    } else if (provider.status === "listening") {
      el.textContent = "Listening";
    } else {
      el.textContent = "Stopped";
    }
  }

  function updateUnsupportedBanner() {
    var b = document.getElementById("banner-unsupported");
    if (!b) return;
    if (provider.status === "unsupported") {
      b.style.display = "block";
      b.textContent =
        provider.error ||
        "Your browser does not support the Web Speech API. Try Chrome on desktop for live captions, or check the Docs page for alternatives.";
    } else {
      b.style.display = "none";
    }
  }

  function updateErrorBanner() {
    var b = document.getElementById("banner-error");
    if (!b) return;
    if (provider.error) {
      b.style.display = "block";
      b.textContent = provider.error;
    } else {
      b.style.display = "none";
    }
  }

  function updateButtons(isListening) {
    var btn = document.getElementById("btn-toggle-listen");
    if (btn) {
      btn.textContent = isListening
        ? "Pause listening (Space)"
        : "Start listening (Space)";
      btn.setAttribute("aria-pressed", isListening ? "true" : "false");
      btn.className =
        "btn " + (isListening ? "btn-outline" : "btn-primary");
    }
  }

  function updateCounts() {
    var n = document.getElementById("segment-count");
    if (n) n.textContent = String(segments.length);
    var buf = document.getElementById("full-buffer");
    if (buf) {
      var t = segments.map(function (s) { return s.text; }).join(" ");
      buf.textContent = t || "";
    }
    var lenEl = document.getElementById("session-length");
    if (lenEl) {
      if (segments.length >= 2) {
        var first = segments[0];
        var last = segments[segments.length - 1];
        var sec = Math.max(
          0,
          Math.round((last.endTimeMs - first.startTimeMs) / 1000)
        );
        lenEl.textContent = "~" + sec + "s";
        lenEl.parentElement.style.display = "flex";
      } else {
        lenEl.parentElement.style.display = "none";
      }
    }
    var btnClear = document.getElementById("btn-clear");
    var btnSave = document.getElementById("btn-save");
    var btnCopy = document.getElementById("btn-copy");
    var has = segments.length > 0;
    if (btnClear) btnClear.disabled = !has;
    if (btnSave) btnSave.disabled = !has;
    var fullText = segments.map(function (s) { return s.text; }).join(" ");
    if (btnCopy) btnCopy.disabled = !fullText;
  }

  function startListening() {
    var recognition = getRecognition();
    if (!recognition) {
      updateUnsupportedBanner();
      updateErrorBanner();
      updateStatus();
      return;
    }
    var langSel = document.getElementById("caption-language");
    var language = langSel ? langSel.value : "en-US";

    sessionStart = performance.now();
    provider.error = null;

    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = function (event) {
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var result = event.results[i];
        var transcript = (result[0] && result[0].transcript || "").trim();
        if (!transcript) continue;
        var confidence = result[0].confidence;
        var now = performance.now() - sessionStart;
        var segment = {
  id: nextSegmentId++,
  speaker: activeSpeaker,
  text: transcript,
  ts: nowIso()
};

// Prevent repeated captions
if (!result.isFinal) continue;

var last = segments[segments.length - 1];

if (
  last &&
  last.text.trim().toLowerCase() === transcript.trim().toLowerCase()
) {
  continue;
}

if (!result.isFinal) {
  continue;
}

var last = segments[segments.length - 1];
var cleanTranscript = transcript.trim().toLowerCase();

if (
  last &&
  last.text.trim().toLowerCase() === cleanTranscript
) {
  continue;
}

segments.push(segment);

renderSegments();
updateCounts();
      }
    };

    recognition.onerror = function (event) {
      provider.status = "error";
      provider.error =
        event.error === "not-allowed"
          ? "Microphone access was blocked. Please allow access in your browser."
          : "Speech recognition error: " + (event.error || "unknown");
      updateErrorBanner();
      updateButtons(false);
      updateStatus();
    };

    recognition.onend = function () {
      if (provider.status !== "paused") {
        provider.status = "idle";
      }
      updateButtons(false);
      updateStatus();
    };

    try {
      recognition.start();
      provider.status = "listening";
      provider.error = null;
      updateErrorBanner();
      updateButtons(true);
      updateStatus();
    } catch (err) {
      provider.status = "error";
      provider.error =
        err && err.message ? err.message : "Failed to start speech recognition.";
      updateErrorBanner();
      updateButtons(false);
      updateStatus();
    }
  }

  function stopListening() {
    var r = provider.recognition;
    if (!r) return;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try {
      r.stop();
    } catch (e) { /* ignore */ }
    provider.status = "idle";
    updateButtons(false);
    updateStatus();
  }

  function clearSession() {
    segments = [];
    var err = document.getElementById("save-error");
    if (err) err.style.display = "none";
    renderSegments();
    updateCounts();
  }

  function getLanguage() {
    var langSel = document.getElementById("caption-language");
    return langSel ? langSel.value : "en-US";
  }

  function handleSave() {
    var errEl = document.getElementById("save-error");
    if (segments.length === 0) return;
    var btn = document.getElementById("btn-save");
    if (btn && btn.disabled) return;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving…";
    }
    if (errEl) errEl.style.display = "none";

    var payload = {
      title: "Live captions session",
      languageSource: getLanguage(),
      languageTarget: null,
      mode: "captions",
      segments: segments.map(function (s) {
        return {
          startTimeMs: s.startTimeMs,
          endTimeMs: s.endTimeMs,
          speakerLabel: null,
          originalText: s.text,
          translatedText: null,
          confidence: typeof s.confidence === "number" ? s.confidence : null
        };
      })
    };

    fetch("/api/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error((data && data.error) || "Failed to save transcript.");
          });
        }
        return res.json();
      })
      .then(function () {
        clearSession();
      })
      .catch(function (e) {
        if (errEl) {
          errEl.style.display = "block";
          errEl.textContent = e.message || "Failed to save transcript.";
        }
      })
      .finally(function () {
        if (btn) {
          btn.disabled = segments.length === 0;
          btn.textContent = "Save session (Ctrl/Cmd+S)";
        }
      });
  }

  function handleCopy() {
    var t = segments.map(function (s) { return s.text; }).join(" ");
    if (!t || !navigator.clipboard) return;
    var btn = document.getElementById("btn-copy");
    navigator.clipboard.writeText(t).then(
      function () {
        if (btn) btn.textContent = "Copied";
        setTimeout(function () {
          if (btn) btn.textContent = "Copy text";
        }, 2000);
      },
      function () {
        if (btn) btn.textContent = "Copy failed";
        setTimeout(function () {
          if (btn) btn.textContent = "Copy text";
        }, 4000);
      }
    );
  }

  function onKeyDown(event) {
    var t = event.target;
    if (
      t &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable)
    ) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (provider.status === "listening") {
        stopListening();
      } else {
        startListening();
      }
    }
    var isSave =
      (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
    if (isSave) {
      event.preventDefault();
      handleSave();
    }
    if (event.key === "Escape") {
      stopListening();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btnToggle = document.getElementById("btn-toggle-listen");
    if (btnToggle) {
      btnToggle.addEventListener("click", function () {
        if (provider.status === "listening") {
          stopListening();
        } else {
          startListening();
        }
      });
    }
    var btnClear = document.getElementById("btn-clear");
    if (btnClear) btnClear.addEventListener("click", clearSession);
    var btnSave = document.getElementById("btn-save");
    if (btnSave) btnSave.addEventListener("click", handleSave);
    var btnCopy = document.getElementById("btn-copy");
    if (btnCopy) btnCopy.addEventListener("click", handleCopy);

    window.addEventListener("keydown", onKeyDown);
    renderSegments();
    updateCounts();
    updateStatus();
    updateUnsupportedBanner();
  });
})();
