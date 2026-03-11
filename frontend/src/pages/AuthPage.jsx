import { useState } from "react";

const API_BASE = "https://maadala.onrender.com/api";

// ─── Decorative left-panel stats ──────────────────────────────────────────────
const PANEL_STATS = [
  { label: "PORTFOLIO HEALTH", val: "94%",     color: "#34d399" },
  { label: "NET WORTH",        val: "$84,200",  color: "#f0f4ff" },
  { label: "TOTAL ASSETS",     val: "$128K",    color: "#818cf8" },
  { label: "DEBT CLEARED",     val: "67%",      color: "#2dd4bf" },
  { label: "ANNUAL RETURN",    val: "+18.7%",   color: "#fbbf24" },
];

const FEATURES_LIST = [
  "Asset buy / sell with cost-basis tracking",
  "Automatic transaction logging",
  "Net worth chart with full history",
  "Live portfolio health sidebar",
  "Liability payoff progress & EMI",
  "Donut allocation reports",
];

// ─── Input field component ────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, error, icon }) {
  const [focused, setFocused] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const inputType = type === "password" ? (showPw ? "text" : "password") : type;

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block",
        fontSize: 10, letterSpacing: "0.14em",
        color: error ? "#f87171" : focused ? "#34d399" : "#2a3a50",
        fontFamily: "'DM Mono', monospace",
        marginBottom: 7,
        transition: "color 0.15s",
      }}>{label}</label>

      <div style={{ position: "relative" }}>
        {/* Left icon */}
        {icon && (
          <div style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)",
            color: focused ? "#34d399" : "#1e2a38",
            pointerEvents: "none",
            transition: "color 0.15s",
          }}>{icon}</div>
        )}

        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            padding: icon ? "13px 44px 13px 42px" : "13px 44px 13px 16px",
            background: focused ? "rgba(52,211,153,0.04)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${error ? "#f87171" : focused ? "rgba(52,211,153,0.5)" : "#0e1a28"}`,
            borderRadius: 10,
            color: "#e2eaf4",
            fontSize: 13,
            fontFamily: "'DM Mono', monospace",
            outline: "none",
            transition: "all 0.18s",
            boxShadow: focused ? "0 0 0 3px rgba(52,211,153,0.08)" : "none",
          }}
        />

        {/* Password toggle */}
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            style={{
              position: "absolute", right: 13, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none",
              color: "#2a3a50", cursor: "pointer",
              padding: 2, display: "flex",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#34d399"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#2a3a50"}
          >
            {showPw ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <p style={{
          fontSize: 11, color: "#f87171",
          fontFamily: "'DM Mono', monospace",
          marginTop: 5, letterSpacing: "0.04em",
        }}>{error}</p>
      )}
    </div>
  );
}

// ─── Left decorative panel ────────────────────────────────────────────────────
function LeftPanel() {
  return (
    <div style={{
      width: 380, flexShrink: 0,
      background: "linear-gradient(160deg, #070d12 0%, #050a0f 100%)",
      borderRight: "1px solid #0c1822",
      padding: "52px 40px",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Grid bg */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(52,211,153,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(52,211,153,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        maskImage: "radial-gradient(ellipse 90% 90% at 30% 40%, black 0%, transparent 100%)",
      }} />

      {/* Glow blob */}
      <div style={{
        position: "absolute", top: -60, left: -60,
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,211,153,0.09) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 52, position: "relative" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg, #34d399, #0d9488)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, color: "#041009",
        }}>◈</div>
        <span style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 20, color: "#f0f4ff", letterSpacing: "-0.3px",
        }}>Vaultfolio</span>
      </div>

      {/* Headline */}
      <div style={{ position: "relative", flex: 1 }}>
        <p style={{
          fontSize: 10, letterSpacing: "0.18em", color: "#1e3028",
          fontFamily: "'DM Mono', monospace", marginBottom: 14,
        }}>PERSONAL FINANCE TRACKER</p>

        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 36, color: "#eef2ff",
          lineHeight: 1.1, letterSpacing: "-0.8px",
          marginBottom: 32,
        }}>
          Know every dollar.<br />
          <span style={{
            background: "linear-gradient(120deg, #34d399, #2dd4bf)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Grow every cent.</span>
        </h2>

        {/* Feature list */}
        <div style={{ marginBottom: 40 }}>
          {FEATURES_LIST.map((f, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              marginBottom: 11,
              animation: `fadeUp 0.5s ease both ${i * 60}ms`,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: "rgba(52,211,153,0.12)",
                border: "1px solid rgba(52,211,153,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 1,
                fontSize: 9, color: "#34d399",
              }}>✓</div>
              <span style={{
                fontSize: 12.5, color: "#1e3040",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                lineHeight: 1.5,
              }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}>
          {PANEL_STATS.map((s, i) => (
            <div key={i} style={{
              padding: "12px 14px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid #0c1822",
              borderRadius: 10,
              animation: `fadeUp 0.5s ease both ${300 + i * 60}ms`,
            }}>
              <div style={{
                fontSize: 9, color: "#1a2a38",
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.12em", marginBottom: 4,
              }}>{s.label}</div>
              <div style={{
                fontSize: 16, color: s.color,
                fontFamily: "'DM Serif Display', serif",
                letterSpacing: "-0.5px",
              }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [fields,     setFields]     = useState({ email: "", password: "" });
  const [errors,     setErrors]     = useState({});
  const [loading,    setLoading]    = useState(false);
  const [serverErr,  setServerErr]  = useState("");

  const set = (k) => (v) => setFields((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!fields.email)    e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(fields.email)) e.email = "Enter a valid email";
    if (!fields.password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setServerErr("");
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fields.email, password: fields.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      // Store token if returned
      if (data.token) localStorage.setItem("vaultfolio_token", data.token);
      onSuccess(data);
    } catch (err) {
      setServerErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{ animation: "fadeUp 0.45s ease both" }} onKeyDown={handleKeyDown}>
      <p style={{
        fontSize: 10, letterSpacing: "0.18em", color: "#1e3028",
        fontFamily: "'DM Mono', monospace", marginBottom: 10,
      }}>WELCOME BACK</p>
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 36, color: "#eef2ff",
        letterSpacing: "-0.8px", lineHeight: 1.1, marginBottom: 8,
      }}>Log in to your<br />portfolio</h1>
      <p style={{
        fontSize: 13, color: "#1a2a38",
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        marginBottom: 36, lineHeight: 1.6,
      }}>
        Track your wealth in real time.
      </p>

      {serverErr && (
        <div style={{
          padding: "10px 14px", marginBottom: 20,
          background: "rgba(248,113,113,0.07)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: 8,
          fontSize: 12, color: "#f87171",
          fontFamily: "'DM Mono', monospace",
        }}>{serverErr}</div>
      )}

      <Field
        label="EMAIL ADDRESS"
        type="email"
        value={fields.email}
        onChange={set("email")}
        placeholder="you@example.com"
        error={errors.email}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        }
      />

      <Field
        label="PASSWORD"
        type="password"
        value={fields.password}
        onChange={set("password")}
        placeholder="••••••••"
        error={errors.password}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        }
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -8, marginBottom: 24 }}>
        <span style={{
          fontSize: 11, color: "#1a3028",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.06em", cursor: "pointer",
          transition: "color 0.15s",
        }}
          onMouseEnter={(e) => e.target.style.color = "#34d399"}
          onMouseLeave={(e) => e.target.style.color = "#1a3028"}
        >Forgot password?</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%", padding: "14px",
          background: loading ? "rgba(52,211,153,0.4)" : "linear-gradient(135deg, #34d399, #0d9488)",
          border: "none", borderRadius: 10,
          color: "#041009", fontSize: 13,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.08em", fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.18s",
          boxShadow: loading ? "none" : "0 0 30px rgba(52,211,153,0.2)",
        }}
        onMouseEnter={(e) => { if (!loading) e.target.style.boxShadow = "0 0 50px rgba(52,211,153,0.35)"; }}
        onMouseLeave={(e) => { e.target.style.boxShadow = loading ? "none" : "0 0 30px rgba(52,211,153,0.2)"; }}
      >
        {loading ? "Logging in…" : "Log in →"}
      </button>

      <p style={{
        textAlign: "center", marginTop: 24,
        fontSize: 12, color: "#1a2a38",
        fontFamily: "'DM Mono', monospace",
      }}>
        No account?{" "}
        <span onClick={onSwitch} style={{
          color: "#34d399", cursor: "pointer",
          borderBottom: "1px solid transparent",
          transition: "border-color 0.15s",
        }}
          onMouseEnter={(e) => e.target.style.borderColor = "#34d399"}
          onMouseLeave={(e) => e.target.style.borderColor = "transparent"}
        >Create one →</span>
      </p>
    </div>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [fields,    setFields]    = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [serverErr, setServerErr] = useState("");

  const set = (k) => (v) => setFields((f) => ({ ...f, [k]: v }));

  // Password strength
  const strength = (() => {
    const p = fields.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel  = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor  = ["", "#f87171", "#fbbf24", "#34d399", "#2dd4bf"][strength];

  const validate = () => {
    const e = {};
    if (!fields.name)     e.name     = "Name is required";
    if (!fields.email)    e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(fields.email)) e.email = "Enter a valid email";
    if (!fields.password) e.password = "Password is required";
    else if (fields.password.length < 8) e.password = "Minimum 8 characters";
    if (fields.password !== fields.confirm) e.confirm = "Passwords do not match";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    setServerErr("");
    try {
      const res  = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fields.name, email: fields.email, password: fields.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      if (data.token) localStorage.setItem("vaultfolio_token", data.token);
      onSuccess(data);
    } catch (err) {
      setServerErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{ animation: "fadeUp 0.45s ease both" }} onKeyDown={handleKeyDown}>
      <p style={{
        fontSize: 10, letterSpacing: "0.18em", color: "#1e3028",
        fontFamily: "'DM Mono', monospace", marginBottom: 10,
      }}>CREATE ACCOUNT</p>
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 36, color: "#eef2ff",
        letterSpacing: "-0.8px", lineHeight: 1.1, marginBottom: 8,
      }}>Start tracking<br />your wealth</h1>
      <p style={{
        fontSize: 13, color: "#1a2a38",
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        marginBottom: 32, lineHeight: 1.6,
      }}>
        Free forever. No credit card required.
      </p>

      {serverErr && (
        <div style={{
          padding: "10px 14px", marginBottom: 20,
          background: "rgba(248,113,113,0.07)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: 8,
          fontSize: 12, color: "#f87171",
          fontFamily: "'DM Mono', monospace",
        }}>{serverErr}</div>
      )}

      <Field
        label="FULL NAME"
        value={fields.name}
        onChange={set("name")}
        placeholder="Your full name"
        error={errors.name}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      />

      <Field
        label="EMAIL ADDRESS"
        type="email"
        value={fields.email}
        onChange={set("email")}
        placeholder="you@example.com"
        error={errors.email}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        }
      />

      <Field
        label="PASSWORD"
        type="password"
        value={fields.password}
        onChange={set("password")}
        placeholder="Min. 8 characters"
        error={errors.password}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        }
      />

      {/* Password strength bar */}
      {fields.password && (
        <div style={{ marginTop: -10, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 99,
                background: i <= strength ? strengthColor : "#0e1a28",
                transition: "background 0.25s",
              }} />
            ))}
          </div>
          <div style={{
            fontSize: 10, color: strengthColor,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.1em",
            transition: "color 0.25s",
          }}>{strengthLabel}</div>
        </div>
      )}

      <Field
        label="CONFIRM PASSWORD"
        type="password"
        value={fields.confirm}
        onChange={set("confirm")}
        placeholder="••••••••"
        error={errors.confirm}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        }
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%", padding: "14px", marginTop: 4,
          background: loading ? "rgba(52,211,153,0.4)" : "linear-gradient(135deg, #34d399, #0d9488)",
          border: "none", borderRadius: 10,
          color: "#041009", fontSize: 13,
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.08em", fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.18s",
          boxShadow: loading ? "none" : "0 0 30px rgba(52,211,153,0.2)",
        }}
        onMouseEnter={(e) => { if (!loading) e.target.style.boxShadow = "0 0 50px rgba(52,211,153,0.35)"; }}
        onMouseLeave={(e) => { e.target.style.boxShadow = loading ? "none" : "0 0 30px rgba(52,211,153,0.2)"; }}
      >
        {loading ? "Creating account…" : "Create account →"}
      </button>

      <p style={{
        textAlign: "center", marginTop: 20,
        fontSize: 12, color: "#1a2a38",
        fontFamily: "'DM Mono', monospace",
      }}>
        Already have an account?{" "}
        <span onClick={onSwitch} style={{
          color: "#34d399", cursor: "pointer",
          borderBottom: "1px solid transparent",
          transition: "border-color 0.15s",
        }}
          onMouseEnter={(e) => e.target.style.borderColor = "#34d399"}
          onMouseLeave={(e) => e.target.style.borderColor = "transparent"}
        >Log in →</span>
      </p>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function AuthPage({ initialMode = "login", onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // "login" | "register"

  const handleSuccess = (data) => {
    if (onAuthSuccess) onAuthSuccess(data);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "#07080d",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        input::placeholder { color: #1a2a38; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #070d14 inset !important;
          -webkit-text-fill-color: #e2eaf4 !important;
          caret-color: #e2eaf4;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #07080d; }
        ::-webkit-scrollbar-thumb { background: #1a2030; border-radius: 99px; }
        button { font-family: inherit; }
      `}</style>

      {/* Left decorative panel — hidden on small screens via inline check */}
      <LeftPanel />

      {/* Right form panel */}
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
        overflowY: "auto",
        background: "#07080d",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {mode === "login" ? (
            <LoginForm
              key="login"
              onSuccess={handleSuccess}
              onSwitch={() => setMode("register")}
            />
          ) : (
            <RegisterForm
              key="register"
              onSuccess={handleSuccess}
              onSwitch={() => setMode("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}