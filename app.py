"""NeuroAssist web application: HTML templates, static assets, JSON APIs."""

from __future__ import annotations

import re
from typing import Any

from flask import Flask, abort, jsonify, render_template, request

import db as database

app = Flask(__name__)


@app.context_processor
def _inject_globals() -> dict[str, Any]:
    from datetime import datetime

    return {
        "current_year": datetime.now().year,
        "narrow_main": False,
        "layout": "",
    }


@app.before_request
def _setup_db() -> None:
    database.ensure_schema()


def _validate_transcript_payload(data: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    if not isinstance(data, dict):
        return None, "Invalid JSON body"

    title = data.get("title")
    language_source = data.get("languageSource")
    language_target = data.get("languageTarget")
    mode = data.get("mode")
    segments = data.get("segments")

    if not isinstance(title, str) or not (1 <= len(title) <= 200):
        return None, "Invalid title"
    if not isinstance(language_source, str) or len(language_source) < 2:
        return None, "Invalid languageSource"
    if language_target is not None and (
        not isinstance(language_target, str) or len(language_target) < 2
    ):
        return None, "Invalid languageTarget"
    if mode not in ("captions", "translate"):
        return None, "Invalid mode"
    if not isinstance(segments, list) or len(segments) < 1:
        return None, "Invalid segments"

    cleaned: list[dict[str, Any]] = []
    for s in segments:
        if not isinstance(s, dict):
            return None, "Invalid segment"
        try:
            start = int(s["startTimeMs"])
            end = int(s["endTimeMs"])
        except (KeyError, TypeError, ValueError):
            return None, "Invalid segment times"
        if start < 0 or end < 0:
            return None, "Invalid segment times"
        orig = s.get("originalText")
        if not isinstance(orig, str) or len(orig) < 1:
            return None, "Invalid originalText"
        conf = s.get("confidence")
        if conf is not None:
            try:
                cf = float(conf)
            except (TypeError, ValueError):
                return None, "Invalid confidence"
            if not 0 <= cf <= 1:
                return None, "Invalid confidence"
        else:
            cf = None
        spk = s.get("speakerLabel")
        if spk is not None and not isinstance(spk, str):
            return None, "Invalid speakerLabel"
        tr = s.get("translatedText")
        if tr is not None and not isinstance(tr, str):
            return None, "Invalid translatedText"
        cleaned.append(
            {
                "startTimeMs": start,
                "endTimeMs": end,
                "speakerLabel": spk,
                "originalText": orig,
                "translatedText": tr,
                "confidence": cf,
            }
        )

    return {
        "title": title,
        "languageSource": language_source,
        "languageTarget": language_target,
        "mode": mode,
        "segments": cleaned,
    }, None


@app.post("/api/transcripts")
def api_transcripts_post() -> Any:
    data = request.get_json(silent=True) or {}
    parsed, err = _validate_transcript_payload(data)
    if err:
        return jsonify({"error": err}), 400
    assert parsed is not None
    try:
        sid = database.create_transcript_session(
            title=parsed["title"],
            language_source=parsed["languageSource"],
            language_target=parsed["languageTarget"],
            mode=parsed["mode"],
            segments=parsed["segments"],
        )
    except Exception:
        app.logger.exception("save transcript")
        return jsonify({"error": "Failed to save transcript."}), 500
    return jsonify({"id": sid}), 201


@app.get("/api/transcripts/list")
def api_transcripts_list() -> Any:
    try:
        sessions = database.list_transcript_sessions()
    except Exception:
        app.logger.exception("list transcripts")
        return jsonify({"error": "Failed to load transcripts."}), 500
    out = []
    for s in sessions:
        row = dict(s)
        for k, v in row.items():
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
        out.append(row)
    return jsonify({"sessions": out})


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@app.post("/api/contact")
def api_contact_post() -> Any:
    data = request.get_json(silent=True) or {}
    name = data.get("fromName")
    email = data.get("email")
    message = data.get("message")
    if not isinstance(name, str) or not (1 <= len(name) <= 200):
        return jsonify({"error": "Invalid fromName"}), 400
    if not isinstance(email, str) or not _EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email"}), 400
    if not isinstance(message, str) or not (1 <= len(message) <= 2000):
        return jsonify({"error": "Invalid message"}), 400
    try:
        database.save_contact_message(from_name=name, email=email, message=message)
    except Exception:
        app.logger.exception("contact save")
        return jsonify({"error": "Failed to save message."}), 500
    return jsonify({"ok": True})


@app.get("/")
def marketing_home() -> str:
    return render_template("marketing/index.html", nav="marketing", show_footer=True)


@app.get("/features")
def marketing_features() -> str:
    return render_template("marketing/features.html", nav="marketing", show_footer=True)


@app.get("/pricing")
def marketing_pricing() -> str:
    return render_template("marketing/pricing.html", nav="marketing", show_footer=True)


@app.get("/about")
def marketing_about() -> str:
    return render_template("marketing/about.html", nav="marketing", show_footer=True)


@app.get("/accessibility")
def marketing_accessibility() -> str:
    return render_template(
        "marketing/accessibility.html", nav="marketing", show_footer=True
    )


@app.get("/privacy")
def marketing_privacy() -> str:
    return render_template("marketing/privacy.html", nav="marketing", show_footer=True)


@app.get("/security")
def marketing_security() -> str:
    return render_template("marketing/security.html", nav="marketing", show_footer=True)


@app.route("/contact", methods=["GET", "POST"])
def marketing_contact() -> str:
    status = None
    if request.method == "POST":
        name = (request.form.get("fromName") or "").strip()
        email = (request.form.get("email") or "").strip()
        message = (request.form.get("message") or "").strip()
        if not (1 <= len(name) <= 200):
            status = "Please enter a valid name."
        elif not _EMAIL_RE.match(email):
            status = "Please enter a valid email address."
        elif not (1 <= len(message) <= 2000):
            status = "Please enter a message (up to 2000 characters)."
        else:
            try:
                database.save_contact_message(
                    from_name=name, email=email, message=message
                )
                status = "Message sent. Thank you for reaching out."
            except Exception:
                app.logger.exception("contact form")
                status = "Something went wrong. Please try again."
    return render_template(
        "marketing/contact.html",
        nav="marketing",
        show_footer=True,
        form_status=status,
    )


@app.get("/docs")
def docs_home() -> str:
    return render_template(
        "docs/index.html", nav="marketing", show_footer=False, narrow_main=True
    )


@app.get("/docs/getting-started")
def docs_getting_started() -> str:
    return render_template(
        "docs/getting_started.html",
        nav="marketing",
        show_footer=False,
        narrow_main=True,
    )


@app.get("/docs/how-live-captions-work")
def docs_how_captions() -> str:
    return render_template(
        "docs/how_captions.html",
        nav="marketing",
        show_footer=False,
        narrow_main=True,
    )


@app.get("/docs/translation")
def docs_translation() -> str:
    return render_template(
        "docs/translation.html",
        nav="marketing",
        show_footer=False,
        narrow_main=True,
    )


@app.get("/docs/keyboard-shortcuts")
def docs_shortcuts() -> str:
    return render_template(
        "docs/shortcuts.html",
        nav="marketing",
        show_footer=False,
        narrow_main=True,
    )


@app.get("/docs/troubleshooting")
def docs_troubleshooting() -> str:
    return render_template(
        "docs/troubleshooting.html",
        nav="marketing",
        show_footer=False,
        narrow_main=True,
    )


@app.get("/docs/changelog")
def docs_changelog() -> str:
    return render_template(
        "docs/changelog.html",
        nav="marketing",
        show_footer=False,
        narrow_main=True,
    )


@app.get("/app")
def app_dashboard() -> str:
    return render_template(
        "app/dashboard.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/captions")
def app_captions() -> str:
    return render_template(
        "app/captions.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/transcripts")
def app_transcripts() -> str:
    try:
        sessions = database.list_transcript_sessions()
    except Exception:
        app.logger.exception("transcripts page")
        sessions = []
        error = "Failed to load transcripts."
    else:
        error = None
    return render_template(
        "app/transcripts.html",
        nav="app",
        show_footer=False,
        layout="app",
        sessions=sessions,
        error=error,
    )


@app.get("/app/transcripts/<session_id>")
def app_transcript_detail(session_id: str) -> str:
    session = database.get_transcript_session(session_id)
    if not session:
        abort(404)
    return render_template(
        "app/transcript_detail.html",
        nav="app",
        show_footer=False,
        layout="app",
        session=session,
    )


@app.get("/app/settings")
def app_settings() -> str:
    return render_template(
        "app/settings.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/settings/audio")
def app_settings_audio() -> str:
    return render_template(
        "app/settings_audio.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/settings/translation")
def app_settings_translation() -> str:
    return render_template(
        "app/settings_translation.html",
        nav="app",
        show_footer=False,
        layout="app",
    )


@app.get("/app/settings/accessibility")
def app_settings_accessibility() -> str:
    return render_template(
        "app/settings_accessibility.html",
        nav="app",
        show_footer=False,
        layout="app",
    )


@app.get("/app/settings/privacy")
def app_settings_privacy() -> str:
    return render_template(
        "app/settings_privacy.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/settings/shortcuts")
def app_settings_shortcuts() -> str:
    return render_template(
        "app/settings_shortcuts.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/settings/account")
def app_settings_account() -> str:
    return render_template(
        "app/settings_account.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/help")
def app_help() -> str:
    return render_template(
        "app/help.html", nav="app", show_footer=False, layout="app"
    )


@app.get("/app/onboarding")
def app_onboarding() -> str:
    return render_template(
        "app/onboarding.html", nav="app", show_footer=False, layout="app"
    )


if __name__ == "__main__":
    port = int(__import__("os").environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
