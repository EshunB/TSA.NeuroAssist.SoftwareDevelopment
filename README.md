# NeuroAssist

Simple **live captions** in the browser. The public site lives in [`docs/`](docs/) for **GitHub Pages** (no server for visitors). Saved sessions stay in the browser on that device only.

## Publish on GitHub Pages

1. Put this project on GitHub (see **Create a new repository** below if you need that).
2. Repo **Settings → Pages**.
3. **Source**: your default branch, folder **`/docs`**, save.
4. Open the URL GitHub shows (often `https://<you>.github.io/<repo>/`).

Then open the site and use **Start** → **Captions**. Chrome on a computer works best.

---

## Create a new repository on GitHub with these files

**On GitHub (in the browser)**

1. Sign in at [github.com](https://github.com).
2. Click your profile (top right) → **Your repositories** → green **New** (or go to [github.com/new](https://github.com/new)).
3. **Repository name**: e.g. `NeuroAssist` (any name you like).
4. Choose **Public** (GitHub Pages is easiest on a public repo; private Pages needs a paid plan).
5. Leave **Add a README** unchecked if you already have files on your computer to upload.
6. Click **Create repository**.

**On your computer** (in Terminal, inside this project folder)

If this folder is **not** a git repo yet:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with what you chose on GitHub. GitHub’s empty-repo page also shows these commands with the correct URL—copy from there if you prefer.

If the repo **already** exists and you only need to push updates:

```bash
git add .
git commit -m "Update site"
git push
```

After the first push, turn on **Pages** from the **`/docs`** folder as above.

---

## Optional: local Python server

From the repo root (for SQLite instead of browser storage):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://localhost:5000`. That uses Flask + `templates/`, not the static `docs/` tree.

### Regenerate `docs/*.html` after editing the generator

```bash
python3 docs/_build_static_pages.py
```
