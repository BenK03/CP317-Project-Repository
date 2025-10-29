import json
import os
from datetime import datetime, timezone
from pathlib import Path
import re

from flask import (
    Flask,
    request,
    render_template_string,
    redirect,
    url_for,
    session,
    abort,
    flash,
)
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

# ------------------ Config ------------------
APP_SECRET = os.environ.get("FLASK_SECRET", "dev-only-change-me")
ACCOUNTS_DIR = Path("accounts")  # folder for account JSON files
ACCOUNTS_DIR.mkdir(parents=True, exist_ok=True)

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,32}$")

app = Flask(__name__)
app.secret_key = APP_SECRET


# ------------------ Helpers ------------------
def account_path(username: str) -> Path:
    # store as "<username>.json" in ACCOUNTS_DIR
    return ACCOUNTS_DIR / f"{username}.json"


def load_account(username: str):
    p = account_path(username)
    if not p.exists():
        return None
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_account_atomic(username: str, data: dict) -> None:
    """Write JSON atomically and restrict permissions (0600)."""
    p = account_path(username)
    tmp = p.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, p)
    os.chmod(p, 0o600)


def username_is_valid(username: str) -> bool:
    return bool(USERNAME_RE.fullmatch(username))


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user" not in session:
            return redirect(url_for("login", next=request.path))
        return fn(*args, **kwargs)

    return wrapper


# ------------------ Templates ------------------

INDEX_TPL = """
{% extends "base.html" %}
{% block content %}
  <h1>Finance App Prototype</h1>
  {% if session.get('user') %}
    <p>You're logged in as <strong>{{ session['user'] }}</strong>.</p>
    <div class="card">
      <p>Go to your <a href="{{ url_for('profile') }}">profile</a>.</p>
    </div>
  {% else %}
    <p>Use <a href="{{ url_for('register') }}">Register</a> or <a href="{{ url_for('login') }}">Login</a>.</p>
  {% endif %}
{% endblock %}
"""

REGISTER_TPL = """
{% extends "base.html" %}
{% block content %}
  <h1>Create account</h1>
  <div class="card">
    <form method="post" autocomplete="off">
      <label>Username (3–32, letters/digits/_ only)
        <input name="username" required>
      </label>
      <label>Password
        <input name="password" type="password" required>
      </label>
      <button type="submit">Register</button>
    </form>
  </div>
{% endblock %}
"""

LOGIN_TPL = """
{% extends "base.html" %}
{% block content %}
  <h1>Login</h1>
  <div class="card">
    <form method="post" autocomplete="off">
      <label>Username
        <input name="username" required>
      </label>
      <label>Password
        <input name="password" type="password" required>
      </label>
      <button type="submit">Login</button>
    </form>
  </div>
{% endblock %}
"""

PROFILE_TPL = """
{% extends "base.html" %}
{% block content %}
  <h1>Profile</h1>
  <div class="card">
    <p><strong>Username:</strong> {{ user['username'] }}</p>
    <p><strong>Created:</strong> {{ user['created'] }}</p>
    <p><strong>Stored file:</strong> <code>{{ path }}</code></p>
  </div>
{% endblock %}
"""

# app.jinja_loader = ChoiceLoader(
#    [
#        DictLoader({"base.html": BASE}),
#        app.jinja_loader,  # keep default file-system loader too
#    ]
# )


# ------------------ Routes ------------------
@app.route("/")
def index():
    return render_template_string(INDEX_TPL, title="Home")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template_string(
            REGISTER_TPL,
            title="Register",
        )

    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""

    if not username_is_valid(username):
        flash("Invalid username. Use 3–32 chars: letters, digits, underscore.", "error")
        return render_template_string(REGISTER_TPL, title="Register"), 400

    if account_path(username).exists():
        flash("Username already taken.", "error")
        return render_template_string(REGISTER_TPL, title="Register"), 409

    pwd_hash = generate_password_hash(password)  # pbkdf2:sha256 by default
    record = {
        "username": username,
        "password_hash": pwd_hash,
        "created": datetime.now(timezone.utc).isoformat(),
    }

    # Atomic write
    save_account_atomic(username, record)
    flash("Account created. You can log in now.", "ok")
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template_string(LOGIN_TPL, title="Login")

    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""

    if not username_is_valid(username):
        flash("Invalid username format.", "error")
        return render_template_string(LOGIN_TPL, title="Login"), 400

    acct = load_account(username)
    if not acct or not check_password_hash(acct.get("password_hash", ""), password):
        flash("Invalid username or password.", "error")
        return render_template_string(LOGIN_TPL, title="Login"), 401

    session["user"] = username
    flash("Logged in.", "ok")
    nxt = request.args.get("next") or url_for("profile")
    return redirect(nxt)


@app.route("/logout")
def logout():
    session.clear()
    flash("Logged out.", "ok")
    return redirect(url_for("index"))


@app.route("/profile")
@login_required
def profile():
    user = load_account(session["user"])
    if not user:
        session.clear()
        abort(403)
    return render_template_string(
        PROFILE_TPL,
        title="Profile",
        user=user,
        path=str(account_path(user["username"]).resolve()),
    )


if __name__ == "__main__":
    app.run(debug=True)
