import { useState } from "react";

export default function AuthPage({ onSignIn, onSignUp, isSubmitting, errorMessage }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (mode === "signin") {
      onSignIn({ email: form.email, password: form.password });
      return;
    }
    onSignUp(form);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark auth-brand">
          <span>FF</span>
          <div>
            <strong>FamilyFund Tracker</strong>
            <small>Shared visibility. Admin control.</small>
          </div>
        </div>

        <div>
          <p className="eyebrow">Supabase secured</p>
          <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
          <p className="muted auth-copy">
            Fund records are stored in Supabase. The first account created after running the schema becomes the admin.
          </p>
        </div>

        {errorMessage ? <div className="error-box">{errorMessage}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label>
              Full name
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="e.g. Jansen Omoro"
                required
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              minLength="6"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Minimum 6 characters"
              required
            />
          </label>

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="ghost-button full-width"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
