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
        "Your browser does not support the Web Speech API.";
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

    if (!btn) return;

    btn.textContent = isListening
      ? "Pause listening (Space)"
      : "Start listening (Space)";

    btn.setAttribute(
      "aria-pressed",
      isListening ? "true" : "false"
    );

    btn.className =
      "btn " + (isListening ? "btn-outline" : "btn-primary");
  }

  function updateCounts() {
    var n = document.getElementById("segment-count");

    if (n) {
      n.textContent = String(segments.length);
    }

    var buf = document.getElementById("full-buffer");

    if (buf) {
      var t = segments
        .map(function (s) {
          return s.text;
        })
        .join(" ");

      buf.textContent = t || "";
    }
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

    var language = langSel
      ? langSel.value
      : "en-US";

    sessionStart = performance.now();

    provider.error = null;

    recognition.lang = language;

    // IMPORTANT FIX
    recognition.interimResults = false;

    recognition.continuous = true;

    recognition.onresult = function (event) {
      for (
        var i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        var result = event.results[i];

        // ONLY FINAL RESULTS
        if (!result.isFinal) {
          continue;
        }

        var transcript = (
          (result[0] && result[0].transcript) || ""
        ).trim();

        if (!transcript) {
          continue;
        }

        // PREVENT DUPLICATES
        var normalized = transcript.toLowerCase();

        var last =
          segments[segments.length - 1];

        if (
          last &&
          last.text
            .trim()
            .toLowerCase() === normalized
        ) {
          continue;
        }

        var now =
          performance.now() - sessionStart;

        segments.push({
          id: Date.now() + Math.random(),
          text: transcript,
          confidence: result[0].confidence,
          startTimeMs: Math.max(
            0,
            now - 1000
          ),
          endTimeMs: now
        });

        renderSegments();
        updateCounts();
      }
    };

    recognition.onerror = function (event) {
      provider.status = "error";

      provider.error =
        event.error === "not-allowed"
          ? "Microphone access was blocked."
          : "Speech recognition error: " +
            (event.error || "unknown");

      updateErrorBanner();
      updateButtons(false);
      updateStatus();
    };

    recognition.onend = function () {
      provider.status = "idle";

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
        err && err.message
          ? err.message
          : "Failed to start speech recognition.";

      updateErrorBanner();
      updateButtons(false);
      updateStatus();
    }
  }

  function stopListening() {
    var r = provider.recognition;

    if (!r) return;

    try {
      r.stop();
    } catch (e) {}

    provider.status = "idle";

    updateButtons(false);
    updateStatus();
  }

  function clearSession() {
    segments = [];

    renderSegments();
    updateCounts();
  }

  function handleCopy() {
    var t = segments
      .map(function (s) {
        return s.text;
      })
      .join(" ");

    if (!t || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(t);
  }

  function onKeyDown(event) {
    var t = event.target;

    if (
      t &&
      (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable
      )
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

    if (event.key === "Escape") {
      stopListening();
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      var btnToggle =
        document.getElementById(
          "btn-toggle-listen"
        );

      if (btnToggle) {
        btnToggle.addEventListener(
          "click",
          function () {
            if (
              provider.status === "listening"
            ) {
              stopListening();
            } else {
              startListening();
            }
          }
        );
      }

      var btnClear =
        document.getElementById(
          "btn-clear"
        );

      if (btnClear) {
        btnClear.addEventListener(
          "click",
          clearSession
        );
      }

      var btnCopy =
        document.getElementById(
          "btn-copy"
        );

      if (btnCopy) {
        btnCopy.addEventListener(
          "click",
          handleCopy
        );
      }

      window.addEventListener(
        "keydown",
        onKeyDown
      );

      renderSegments();
      updateCounts();
      updateStatus();
      updateUnsupportedBanner();
    }
  );
})();
