import { useState, useEffect, useRef } from "react";

// ─── Ticker data (static, decorative) ─────────────────────────────────────────
const TICKER_ITEMS = [
  { label: "PORTFOLIO",   val: "+12.4%",    pos: true },
  { label: "NET WORTH",   val: "$84,200",   pos: true },
  { label: "ASSETS",      val: "↑ $128K",   pos: true },
  { label: "LIABILITIES", val: "↓ $43K",    pos: false },
  { label: "GAIN / LOSS", val: "+$6,840",   pos: true },
  { label: "DEBT RATIO",  val: "25.3%",     pos: true },
  { label: "INVESTMENTS", val: "8 assets",  pos: true },
  { label: "CASH FLOW",   val: "+$2,100",   pos: true },
  { label: "RETURNS",     val: "18.7% YTD", pos: true },
  { label: "SAVINGS",     val: "$31,500",   pos: true },
];

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: "◈",
    title: "Asset Management",
    desc: "Track every investment across stocks, real estate, crypto, and more. Buy, sell, and monitor performance with real-time gain/loss calculations and full value history.",
    tags: ["Buy & Sell", "Value History", "Gain / Loss"],
    color: "#818cf8",
  },
  {
    icon: "⬡",
    title: "Liability Tracking",
    desc: "Manage all your debts — loans, mortgages, credit cards — with payment scheduling, EMI estimates, and payoff progress bars.",
    tags: ["Debt Payoff", "EMI Calculator", "Progress Bar"],
    color: "#f87171",
  },
  {
    icon: "◉",
    title: "Net Worth Chart",
    desc: "Interactive area chart showing assets, liabilities, and net worth over time. Filter by 1M, 3M, 6M, 1Y, or ALL with a unified timeline built from all your history snapshots.",
    tags: ["Time Ranges", "Area Chart", "Trend Analysis"],
    color: "#2dd4bf",
  },
  {
    icon: "⬘",
    title: "Transaction Log",
    desc: "Every buy, sell, payment, and balance update is automatically recorded. Filter by type, date range, or entity. Paginated history with expand-on-click details.",
    tags: ["Auto-Logged", "Filterable", "Paginated"],
    color: "#fbbf24",
  },
  {
    icon: "◍",
    title: "Portfolio Reports",
    desc: "Dual donut charts for current vs invested allocation. Sortable gain/loss table, best and worst performers highlighted, and a full liability summary — all in one view.",
    tags: ["Donut Charts", "Allocation", "Performance Table"],
    color: "#e2b55a",
  },
  {
    icon: "◬",
    title: "Inline Editing",
    desc: "Click any value directly in the table to edit it. No modal, no page reload. Update current asset value or outstanding debt balance instantly with Enter to confirm.",
    tags: ["Click-to-Edit", "Instant Save", "No Friction"],
    color: "#c084fc",
  },
  {
    icon: "◎",
    title: "Smart Sell Engine",
    desc: "Proportional cost-basis reduction on partial sells. Automatic realized gain/loss calculation. Full-exit detection with a confirmation badge before you commit.",
    tags: ["Cost Basis", "Realized Gains", "Partial Sell"],
    color: "#34d399",
  },
  {
    icon: "⬟",
    title: "Live Sidebar",
    desc: "Always-visible portfolio health donut, net worth, all-time gain, and live nav counters. Data refreshes automatically every 60 seconds — no manual reload needed.",
    tags: ["Auto-Refresh", "Health Score", "Live Counts"],
    color: "#38bdf8",
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { val: "8",    label: "Modules" },
  { val: "30+",  label: "API Endpoints" },
  { val: "100%", label: "Auto-logged" },
  { val: "∞",    label: "History" },
];

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Tag({ label, color }) {
  return (
    <span style={{
      fontSize: 9,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.12em",
      color,
      background: `${color}14`,
      border: `1px solid ${color}30`,
      padding: "2px 8px",
      borderRadius: 20,
    }}>{label}</span>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const linkStyle = {
    fontSize: 12, color: "#2a3a50",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.1em", cursor: "pointer",
    transition: "color 0.15s", userSelect: "none",
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 48px", height: 64,
      background: scrolled ? "rgba(7,8,13,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
      transition: "all 0.3s ease",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "linear-gradient(135deg, #34d399, #0d9488)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: "#041009",
        }}>◈</div>
        <span style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 18, color: "#f0f4ff", letterSpacing: "-0.3px",
        }}>Vaultfolio</span>
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
        {["Features", "Reports", "Pricing"].map((l) => (
          <span key={l} style={linkStyle}
            onMouseEnter={(e) => e.target.style.color = "#94a3b8"}
            onMouseLeave={(e) => e.target.style.color = "#2a3a50"}
          >{l}</span>
        ))}
      </div>

      {/* Auth */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onLogin} style={{
          padding: "8px 20px", background: "transparent",
          border: "1px solid #1a2535", borderRadius: 8,
          color: "#4a6070", fontSize: 12,
          fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em",
          cursor: "pointer", transition: "all 0.15s",
        }}
          onMouseEnter={(e) => { e.target.style.borderColor = "#34d399"; e.target.style.color = "#34d399"; }}
          onMouseLeave={(e) => { e.target.style.borderColor = "#1a2535"; e.target.style.color = "#4a6070"; }}
        >Log in</button>

        <button onClick={onRegister} style={{
          padding: "8px 20px",
          background: "linear-gradient(135deg, #34d399, #0d9488)",
          border: "none", borderRadius: 8,
          color: "#041009", fontSize: 12,
          fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em",
          fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s",
        }}
          onMouseEnter={(e) => e.target.style.opacity = "0.82"}
          onMouseLeave={(e) => e.target.style.opacity = "1"}
        >Get Started</button>
      </div>
    </nav>
  );
}

// ─── Ticker strip ─────────────────────────────────────────────────────────────
function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      overflow: "hidden",
      borderTop: "1px solid #0a1018",
      borderBottom: "1px solid #0a1018",
      background: "#060709", padding: "10px 0",
    }}>
      <div style={{
        display: "flex", gap: 48,
        animation: "ticker 30s linear infinite",
        width: "max-content",
      }}>
        {doubled.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{
              fontSize: 9, letterSpacing: "0.16em", color: "#1e2a38",
              fontFamily: "'DM Mono', monospace",
            }}>{item.label}</span>
            <span style={{
              fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 500,
              color: item.pos ? "#34d399" : "#f87171",
            }}>{item.val}</span>
            <span style={{ color: "#131c28", fontSize: 14 }}>·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onRegister }) {
  return (
    <section style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      textAlign: "center",
      padding: "120px 40px 60px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Grid bg */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(52,211,153,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(52,211,153,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "52px 52px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 100%)",
      }} />

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "32%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,211,153,0.065) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "5px 16px",
        background: "rgba(52,211,153,0.055)",
        border: "1px solid rgba(52,211,153,0.15)",
        borderRadius: 20, marginBottom: 32,
        animation: "fadeUp 0.55s ease both",
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", background: "#34d399",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.15em", color: "#34d399",
        }}>PERSONAL FINANCE TRACKER</span>
      </div>

      {/* H1 */}
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: "clamp(46px, 8vw, 94px)",
        color: "#eef2ff", lineHeight: 1.0,
        letterSpacing: "-2px", maxWidth: 800,
        marginBottom: 16,
        animation: "fadeUp 0.6s ease both 0.06s",
      }}>
        Your wealth,<br />
        <span style={{
          background: "linear-gradient(120deg, #34d399 0%, #2dd4bf 45%, #818cf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>crystal clear.</span>
      </h1>

      {/* Subhead */}
      <p style={{
        fontSize: "clamp(14px, 1.8vw, 17px)",
        color: "#243040", maxWidth: 500,
        lineHeight: 1.75, marginBottom: 40,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        animation: "fadeUp 0.6s ease both 0.12s",
      }}>
        Track assets, liabilities, and net worth in one place.
        Smart sell engine, automatic transaction logging, live portfolio health — built for people who care about every dollar.
      </p>

      {/* CTA */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center",
        animation: "fadeUp 0.6s ease both 0.18s", flexWrap: "wrap", justifyContent: "center",
      }}>
        <button onClick={onRegister} style={{
          padding: "14px 34px",
          background: "linear-gradient(135deg, #34d399, #0d9488)",
          border: "none", borderRadius: 10,
          color: "#041009", fontSize: 13,
          fontFamily: "'DM Mono', monospace", letterSpacing: "0.09em",
          fontWeight: 600, cursor: "pointer",
          boxShadow: "0 0 40px rgba(52,211,153,0.22)",
          transition: "box-shadow 0.2s",
        }}
          onMouseEnter={(e) => e.target.style.boxShadow = "0 0 64px rgba(52,211,153,0.38)"}
          onMouseLeave={(e) => e.target.style.boxShadow = "0 0 40px rgba(52,211,153,0.22)"}
        >Create free account →</button>
        <span style={{
          fontSize: 11, color: "#1a2535",
          fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
        }}>No credit card required</span>
      </div>

      {/* Stats */}
      <div style={{
        display: "flex", gap: 56, marginTop: 80,
        animation: "fadeUp 0.6s ease both 0.24s",
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 38, color: "#eef2ff", lineHeight: 1, letterSpacing: "-1.5px",
            }}>{s.val}</div>
            <div style={{
              fontSize: 10, color: "#1e2a38",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.15em", marginTop: 5,
            }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function FeatureCard({ feature, visible, delay }) {
  const [hovered, setHovered] = useState(false);
  const { icon, title, desc, tags, color } = feature;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "26px 24px",
        background: hovered ? "rgba(255,255,255,0.023)" : "rgba(255,255,255,0.012)",
        border: `1px solid ${hovered ? `${color}28` : "#0c1520"}`,
        borderRadius: 16,
        cursor: "default",
        transition: "all 0.22s ease",
        transform: visible ? "translateY(0)" : "translateY(22px)",
        opacity: visible ? 1 : 0,
        transitionDelay: `${delay}ms`,
        boxShadow: hovered ? `0 8px 40px ${color}0c` : "none",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Top shimmer */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: hovered
          ? `linear-gradient(90deg, transparent, ${color}44, transparent)`
          : "transparent",
        transition: "background 0.3s",
      }} />

      {/* Icon */}
      <div style={{
        fontSize: 20, color,
        marginBottom: 14,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 42, height: 42, borderRadius: 11,
        background: `${color}0f`,
        border: `1px solid ${color}1e`,
        transition: "transform 0.22s",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}>{icon}</div>

      <h3 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 17, color: "#dce8f4",
        marginBottom: 9, lineHeight: 1.2, letterSpacing: "-0.3px",
      }}>{title}</h3>

      <p style={{
        fontSize: 12.5, color: "#1e2e40",
        lineHeight: 1.7, marginBottom: 16,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
      }}>{desc}</p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tags.map((t, i) => <Tag key={i} label={t} color={color} />)}
      </div>
    </div>
  );
}

function FeaturesSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} style={{ padding: "80px 48px 100px", maxWidth: 1120, margin: "0 auto" }}>
      <div style={{ marginBottom: 52, textAlign: "center" }}>
        <div style={{
          fontSize: 10, letterSpacing: "0.2em", color: "#1e2a38",
          fontFamily: "'DM Mono', monospace", marginBottom: 12,
        }}>EVERYTHING YOU NEED</div>
        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(30px, 4.5vw, 50px)",
          color: "#eef2ff", letterSpacing: "-1px", lineHeight: 1.1,
        }}>
          Built for complete<br />financial clarity
        </h2>
      </div>

      {/* Mosaic grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Row 1 — large + 2 small */}
        <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr 1fr", gap: 12 }}>
          {FEATURES.slice(0, 3).map((f, i) => (
            <FeatureCard key={i} feature={f} visible={visible} delay={i * 75} />
          ))}
        </div>
        {/* Row 2 — small + large */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.65fr", gap: 12 }}>
          {FEATURES.slice(3, 5).map((f, i) => (
            <FeatureCard key={i} feature={f} visible={visible} delay={225 + i * 75} />
          ))}
        </div>
        {/* Row 3 — 3 equal */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {FEATURES.slice(5, 8).map((f, i) => (
            <FeatureCard key={i} feature={f} visible={visible} delay={375 + i * 75} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTASection({ onRegister, onLogin }) {
  return (
    <section style={{
      padding: "60px 40px 90px", textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(52,211,153,0.055) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 520, margin: "0 auto", position: "relative",
        padding: "52px 44px",
        background: "rgba(255,255,255,0.018)",
        border: "1px solid rgba(52,211,153,0.1)",
        borderRadius: 22,
        boxShadow: "0 0 80px rgba(52,211,153,0.04)",
      }}>
        <div style={{
          fontSize: 10, letterSpacing: "0.2em", color: "#1e2a38",
          fontFamily: "'DM Mono', monospace", marginBottom: 16,
        }}>START TODAY · FREE</div>

        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 38, color: "#eef2ff",
          letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 14,
        }}>
          Take control of<br />your finances
        </h2>

        <p style={{
          fontSize: 13.5, color: "#1e2e40",
          lineHeight: 1.75, marginBottom: 36,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        }}>
          Join thousands tracking every dollar, investing with confidence, and always knowing their net worth at a glance.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onRegister} style={{
            padding: "13px 30px",
            background: "linear-gradient(135deg, #34d399, #0d9488)",
            border: "none", borderRadius: 10,
            color: "#041009", fontSize: 12,
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
            fontWeight: 600, cursor: "pointer",
            boxShadow: "0 0 30px rgba(52,211,153,0.25)",
            transition: "opacity 0.18s",
          }}
            onMouseEnter={(e) => e.target.style.opacity = "0.84"}
            onMouseLeave={(e) => e.target.style.opacity = "1"}
          >Register — it's free</button>

          <button onClick={onLogin} style={{
            padding: "13px 30px", background: "transparent",
            border: "1px solid #1a2535", borderRadius: 10,
            color: "#3a5060", fontSize: 12,
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
            cursor: "pointer", transition: "all 0.18s",
          }}
            onMouseEnter={(e) => { e.target.style.borderColor = "#34d399"; e.target.style.color = "#34d399"; }}
            onMouseLeave={(e) => { e.target.style.borderColor = "#1a2535"; e.target.style.color = "#3a5060"; }}
          >Log in →</button>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onLogin, onRegister }) {
  const linkStyle = {
    fontSize: 11, color: "#1a2535",
    fontFamily: "'DM Mono', monospace",
    letterSpacing: "0.08em", cursor: "pointer",
    transition: "color 0.15s",
  };

  return (
    <footer style={{
      borderTop: "1px solid #0a1018",
      padding: "36px 48px 28px",
    }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 20,
      }}>
        {/* Logo */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: "linear-gradient(135deg, #34d399, #0d9488)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "#041009",
            }}>◈</div>
            <span style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 15, color: "#dce8f4",
            }}>Vaultfolio</span>
          </div>
          <p style={{ fontSize: 10, color: "#1a2535", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            © 2025 · Personal Finance Tracker
          </p>
        </div>

        {/* Links */}
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center" }}>
          {["Features", "Privacy", "Terms", "Contact"].map((l) => (
            <span key={l} style={linkStyle}
              onMouseEnter={(e) => e.target.style.color = "#34d399"}
              onMouseLeave={(e) => e.target.style.color = "#1a2535"}
            >{l}</span>
          ))}
        </div>

        {/* Auth */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onLogin} style={{
            padding: "7px 17px", background: "transparent",
            border: "1px solid #1a2535", borderRadius: 7,
            color: "#2a3a50", fontSize: 11,
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em",
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={(e) => { e.target.style.borderColor = "#34d399"; e.target.style.color = "#34d399"; }}
            onMouseLeave={(e) => { e.target.style.borderColor = "#1a2535"; e.target.style.color = "#2a3a50"; }}
          >Log in</button>

          <button onClick={onRegister} style={{
            padding: "7px 17px",
            background: "rgba(52,211,153,0.09)",
            border: "1px solid rgba(52,211,153,0.22)", borderRadius: 7,
            color: "#34d399", fontSize: 11,
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em",
            cursor: "pointer", transition: "background 0.15s",
          }}
            onMouseEnter={(e) => e.target.style.background = "rgba(52,211,153,0.18)"}
            onMouseLeave={(e) => e.target.style.background = "rgba(52,211,153,0.09)"}
          >Register</button>
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomePage({ onLogin, onRegister }) {
  const handleLogin    = onLogin    ?? (() => {});
  const handleRegister = onRegister ?? (() => {});

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07080d",
      fontFamily: "'DM Sans', sans-serif",
      color: "#eef2ff",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.8); }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #07080d; }
        ::-webkit-scrollbar-thumb { background: #1a2030; border-radius: 99px; }
        button { font-family: inherit; }
      `}</style>

      <Navbar    onLogin={handleLogin} onRegister={handleRegister} />
      <Hero      onRegister={handleRegister} />
      <Ticker />
      <FeaturesSection />
      <CTASection onRegister={handleRegister} onLogin={handleLogin} />
      <Footer    onLogin={handleLogin} onRegister={handleRegister} />
    </div>
  );
}