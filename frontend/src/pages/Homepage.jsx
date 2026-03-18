import { useState, useEffect, useRef } from "react";

// ─── Ticker data ───────────────────────────────────────────────────────────────
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

const FEATURES = [
  {
    icon: "◈", title: "Asset Management",
    desc: "Track every investment across stocks, real estate, crypto, and more. Buy, sell, and monitor performance with real-time gain/loss calculations and full value history.",
    tags: ["Buy & Sell", "Value History", "Gain / Loss"], color: "#818cf8",
  },
  {
    icon: "⬡", title: "Liability Tracking",
    desc: "Manage all your debts — loans, mortgages, credit cards — with payment scheduling, EMI estimates, and payoff progress bars.",
    tags: ["Debt Payoff", "EMI Calculator", "Progress Bar"], color: "#f87171",
  },
  {
    icon: "◉", title: "Net Worth Chart",
    desc: "Interactive area chart showing assets, liabilities, and net worth over time. Filter by 1M, 3M, 6M, 1Y, or ALL with a unified timeline.",
    tags: ["Time Ranges", "Area Chart", "Trend Analysis"], color: "#2dd4bf",
  },
  {
    icon: "⬘", title: "Transaction Log",
    desc: "Every buy, sell, payment, and balance update is automatically recorded. Filter by type, date range, or entity. Paginated history.",
    tags: ["Auto-Logged", "Filterable", "Paginated"], color: "#fbbf24",
  },
  {
    icon: "◍", title: "Portfolio Reports",
    desc: "Dual donut charts for current vs invested allocation. Sortable gain/loss table, best and worst performers, and a full liability summary.",
    tags: ["Donut Charts", "Allocation", "Performance Table"], color: "#e2b55a",
  },
  {
    icon: "◬", title: "Inline Editing",
    desc: "Click any value directly in the table to edit it. No modal, no page reload. Update current asset value or outstanding debt balance instantly.",
    tags: ["Click-to-Edit", "Instant Save", "No Friction"], color: "#c084fc",
  },
  {
    icon: "◎", title: "Smart Sell Engine",
    desc: "Proportional cost-basis reduction on partial sells. Automatic realized gain/loss calculation. Full-exit detection with confirmation.",
    tags: ["Cost Basis", "Realized Gains", "Partial Sell"], color: "#34d399",
  },
  {
    icon: "⬟", title: "Live Sidebar",
    desc: "Always-visible portfolio health donut, net worth, all-time gain, and live nav counters. Data refreshes automatically every 60 seconds.",
    tags: ["Auto-Refresh", "Health Score", "Live Counts"], color: "#38bdf8",
  },
];

const STATS = [
  { val: "8",    label: "Modules" },
  { val: "30+",  label: "API Endpoints" },
  { val: "100%", label: "Auto-logged" },
  { val: "∞",    label: "History" },
];

// ─── useBreakpoint ─────────────────────────────────────────────────────────────
function useBreakpoint() {
  const get = () => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < 640)  return "mobile";
    if (window.innerWidth < 1024) return "tablet";
    return "desktop";
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    const h = () => setBp(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return bp;
}

// ─── Tag ─────────────────────────────────────────────────────────────────────
function Tag({ label, color }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em",
      color, background: `${color}14`, border: `1px solid ${color}30`,
      padding: "2px 8px", borderRadius: 20,
    }}>{label}</span>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onLogin, onRegister }) {
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Close menu on resize away from mobile
  useEffect(() => { if (!isMobile) setMenuOpen(false); }, [isMobile]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 48px", height: 60,
        background: scrolled || menuOpen ? "rgba(7,8,13,0.95)" : "transparent",
        backdropFilter: scrolled || menuOpen ? "blur(16px)" : "none",
        borderBottom: scrolled || menuOpen ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #34d399, #0d9488)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "#041009",
          }}>◈</div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: "#f0f4ff", letterSpacing: "-0.3px" }}>
            Maadala
          </span>
        </div>

        {/* Desktop: links + auth */}
        {!isMobile && (
          <>
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              {["Features", "Reports", "Pricing"].map((l) => (
                <span key={l} className="hp-navlink">{l}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="hp-btn-ghost" onClick={onLogin}>Log in</button>
              <button className="hp-btn-primary" onClick={onRegister}>Get Started</button>
            </div>
          </>
        )}

        {/* Mobile: hamburger */}
        {isMobile && (
          <button
            className={`hp-hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        )}
      </nav>

      {/* Mobile menu drawer */}
      {isMobile && (
        <div className={`hp-mobile-menu${menuOpen ? " open" : ""}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "16px 0" }}>
            {["Features", "Reports", "Pricing"].map((l) => (
              <span key={l} className="hp-mobile-link" onClick={() => setMenuOpen(false)}>{l}</span>
            ))}
          </div>
          <div style={{ padding: "16px 0", borderTop: "1px solid #0c1520", display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="hp-btn-ghost" style={{ width: "100%", padding: "12px" }} onClick={() => { onLogin(); setMenuOpen(false); }}>
              Log in
            </button>
            <button className="hp-btn-primary" style={{ width: "100%", padding: "12px" }} onClick={() => { onRegister(); setMenuOpen(false); }}>
              Get Started →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Ticker ───────────────────────────────────────────────────────────────────
function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      overflow: "hidden", borderTop: "1px solid #0a1018",
      borderBottom: "1px solid #0a1018", background: "#060709", padding: "10px 0",
    }}>
      <div style={{ display: "flex", gap: 48, animation: "hp-ticker 30s linear infinite", width: "max-content" }}>
        {doubled.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.16em", color: "#1e2a38", fontFamily: "'DM Mono', monospace" }}>
              {item.label}
            </span>
            <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 500, color: item.pos ? "#34d399" : "#f87171" }}>
              {item.val}
            </span>
            <span style={{ color: "#131c28", fontSize: 14 }}>·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onRegister }) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <section style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", textAlign: "center",
      padding: isMobile ? "100px 20px 60px" : "120px 40px 60px",
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

      {/* Glow */}
      <div style={{
        position: "absolute", top: "32%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? 320 : 700, height: isMobile ? 240 : 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,211,153,0.065) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px",
        background: "rgba(52,211,153,0.055)", border: "1px solid rgba(52,211,153,0.15)",
        borderRadius: 20, marginBottom: 28, animation: "hp-fadeUp 0.55s ease both",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "hp-pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.15em", color: "#34d399" }}>
          PERSONAL FINANCE TRACKER
        </span>
      </div>

      {/* H1 */}
      <h1 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: "clamp(40px, 9vw, 94px)",
        color: "#eef2ff", lineHeight: 1.0,
        letterSpacing: "-2px", maxWidth: 800,
        marginBottom: 16, animation: "hp-fadeUp 0.6s ease both 0.06s",
      }}>
        Your wealth,<br />
        <span style={{
          background: "linear-gradient(120deg, #34d399 0%, #2dd4bf 45%, #818cf8 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>crystal clear.</span>
      </h1>

      {/* Subhead */}
      <p style={{
        fontSize: "clamp(13px, 1.8vw, 17px)",
        color: "#243040", maxWidth: 480, lineHeight: 1.75, marginBottom: 36,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        animation: "hp-fadeUp 0.6s ease both 0.12s",
      }}>
        Track assets, liabilities, and net worth in one place.
        Smart sell engine, automatic transaction logging, live portfolio health — built for people who care about every dollar.
      </p>

      {/* CTA */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center",
        animation: "hp-fadeUp 0.6s ease both 0.18s",
      }}>
        <button className="hp-btn-primary hp-btn-hero" onClick={onRegister}>
          Create free account →
        </button>
        <span style={{ fontSize: 11, color: "#1a2535", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
          No credit card required
        </span>
      </div>

      {/* Stats */}
      <div style={{
        display: "flex", gap: isMobile ? 28 : 56, marginTop: isMobile ? 56 : 80,
        animation: "hp-fadeUp 0.6s ease both 0.24s",
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: isMobile ? 30 : 38, color: "#eef2ff", lineHeight: 1, letterSpacing: "-1.5px",
            }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#1e2a38", fontFamily: "'DM Mono', monospace", letterSpacing: "0.15em", marginTop: 5 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ feature, visible, delay }) {
  const [hovered, setHovered] = useState(false);
  const { icon, title, desc, tags, color } = feature;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "22px 20px",
        background: hovered ? "rgba(255,255,255,0.023)" : "rgba(255,255,255,0.012)",
        border: `1px solid ${hovered ? `${color}28` : "#0c1520"}`,
        borderRadius: 16, cursor: "default",
        transition: "all 0.22s ease",
        transform: visible ? "translateY(0)" : "translateY(22px)",
        opacity: visible ? 1 : 0,
        transitionDelay: `${delay}ms`,
        boxShadow: hovered ? `0 8px 40px ${color}0c` : "none",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Top shimmer on hover */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: hovered ? `linear-gradient(90deg, transparent, ${color}44, transparent)` : "transparent",
        transition: "background 0.3s",
      }} />

      <div style={{
        fontSize: 18, color, marginBottom: 12,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 38, height: 38, borderRadius: 10,
        background: `${color}0f`, border: `1px solid ${color}1e`,
        transition: "transform 0.22s",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}>{icon}</div>

      <h3 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 16, color: "#dce8f4", marginBottom: 8, lineHeight: 1.2, letterSpacing: "-0.3px",
      }}>{title}</h3>

      <p style={{
        fontSize: 12, color: "#1e2e40", lineHeight: 1.7, marginBottom: 14,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
      }}>{desc}</p>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {tags.map((t, i) => <Tag key={i} label={t} color={color} />)}
      </div>
    </div>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────
function FeaturesSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.06 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  // Grid layout per breakpoint
  const renderGrid = () => {
    if (isMobile) {
      // Single column — all 8 stacked
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} feature={f} visible={visible} delay={i * 50} />
          ))}
        </div>
      );
    }

    if (isTablet) {
      // 2-column uniform grid
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={i} feature={f} visible={visible} delay={i * 60} />
          ))}
        </div>
      );
    }

    // Desktop — mosaic layout
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr 1fr", gap: 12 }}>
          {FEATURES.slice(0, 3).map((f, i) => <FeatureCard key={i} feature={f} visible={visible} delay={i * 75} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.65fr", gap: 12 }}>
          {FEATURES.slice(3, 5).map((f, i) => <FeatureCard key={i} feature={f} visible={visible} delay={225 + i * 75} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {FEATURES.slice(5, 8).map((f, i) => <FeatureCard key={i} feature={f} visible={visible} delay={375 + i * 75} />)}
        </div>
      </div>
    );
  };

  return (
    <section ref={ref} style={{ padding: isMobile ? "60px 16px 80px" : "80px 48px 100px", maxWidth: 1120, margin: "0 auto" }}>
      <div style={{ marginBottom: isMobile ? 36 : 52, textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#1e2a38", fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
          EVERYTHING YOU NEED
        </div>
        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(26px, 4.5vw, 50px)",
          color: "#eef2ff", letterSpacing: "-1px", lineHeight: 1.1,
        }}>
          Built for complete<br />financial clarity
        </h2>
      </div>
      {renderGrid()}
    </section>
  );
}

// ─── CTA Section ─────────────────────────────────────────────────────────────
function CTASection({ onRegister, onLogin }) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <section style={{ padding: isMobile ? "40px 16px 70px" : "60px 40px 90px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(52,211,153,0.055) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 520, margin: "0 auto", position: "relative",
        padding: isMobile ? "36px 20px" : "52px 44px",
        background: "rgba(255,255,255,0.018)",
        border: "1px solid rgba(52,211,153,0.1)",
        borderRadius: 22, boxShadow: "0 0 80px rgba(52,211,153,0.04)",
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#1e2a38", fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
          START TODAY · FREE
        </div>
        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: isMobile ? 30 : 38, color: "#eef2ff",
          letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 12,
        }}>
          Take control of<br />your finances
        </h2>
        <p style={{
          fontSize: isMobile ? 13 : 13.5, color: "#1e2e40", lineHeight: 1.75, marginBottom: 28,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
        }}>
          Join thousands tracking every dollar, investing with confidence, and always knowing their net worth at a glance.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="hp-btn-primary" style={{ padding: "12px 26px" }} onClick={onRegister}>
            Register — it's free
          </button>
          <button className="hp-btn-ghost" style={{ padding: "12px 26px" }} onClick={onLogin}>
            Log in →
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ onLogin, onRegister }) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <footer style={{ borderTop: "1px solid #0a1018", padding: isMobile ? "28px 16px 24px" : "36px 48px 28px" }}>
      <div style={{
        maxWidth: 1120, margin: "0 auto",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        flexWrap: "wrap", gap: isMobile ? 20 : 16,
      }}>
        {/* Logo + copyright */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: "linear-gradient(135deg, #34d399, #0d9488)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "#041009",
            }}>◈</div>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: "#dce8f4" }}>Maadala</span>
          </div>
          <p style={{ fontSize: 10, color: "#1a2535", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
            © 2025 · Sabari Raghu Personal Finance Tracker
          </p>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", gap: isMobile ? 20 : 28, flexWrap: "wrap" }}>
          {["Features", "Privacy", "Terms", "Contact"].map((l) => (
            <span key={l} className="hp-footer-link">{l}</span>
          ))}
        </div>

        {/* Auth */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="hp-btn-ghost" style={{ padding: "7px 16px", fontSize: 11 }} onClick={onLogin}>Log in</button>
          <button style={{
            padding: "7px 16px", fontSize: 11,
            background: "rgba(52,211,153,0.09)", border: "1px solid rgba(52,211,153,0.22)",
            borderRadius: 7, color: "#34d399",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.07em", cursor: "pointer",
            transition: "background 0.15s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(52,211,153,0.18)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(52,211,153,0.09)"}
            onClick={onRegister}
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
    <div style={{ minHeight: "100vh", background: "#07080d", fontFamily: "'DM Sans', sans-serif", color: "#eef2ff", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes hp-fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes hp-ticker  { from { transform:translateX(0); } to { transform:translateX(-33.333%); } }
        @keyframes hp-pulse   { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.45; transform:scale(0.8); } }

        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#07080d; }
        ::-webkit-scrollbar-thumb { background:#1a2030; border-radius:99px; }
        button { font-family: inherit; }

        /* ── Shared buttons ── */
        .hp-btn-primary {
          padding: 9px 22px;
          background: linear-gradient(135deg, #34d399, #0d9488);
          border: none; border-radius: 9px;
          color: #041009; font-size: 12px;
          font-family: 'DM Mono', monospace; letter-spacing: 0.08em;
          font-weight: 600; cursor: pointer;
          box-shadow: 0 0 30px rgba(52,211,153,0.2);
          transition: opacity 0.18s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .hp-btn-primary:hover { opacity: 0.85; box-shadow: 0 0 50px rgba(52,211,153,0.35); }
        .hp-btn-hero { padding: 14px 34px; font-size: 13px; }

        .hp-btn-ghost {
          padding: 9px 22px;
          background: transparent; border: 1px solid #1a2535; border-radius: 9px;
          color: #4a6070; font-size: 12px;
          font-family: 'DM Mono', monospace; letter-spacing: 0.07em;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .hp-btn-ghost:hover { border-color: #34d399; color: #34d399; }

        /* ── Navbar links ── */
        .hp-navlink {
          font-size: 12px; color: #2a3a50;
          font-family: 'DM Mono', monospace; letter-spacing: 0.1em;
          cursor: pointer; transition: color 0.15s; user-select: none;
        }
        .hp-navlink:hover { color: #94a3b8; }

        /* ── Footer links ── */
        .hp-footer-link {
          font-size: 11px; color: #1a2535;
          font-family: 'DM Mono', monospace; letter-spacing: 0.08em;
          cursor: pointer; transition: color 0.15s;
        }
        .hp-footer-link:hover { color: #34d399; }

        /* ── Mobile hamburger ── */
        .hp-hamburger {
          width: 36px; height: 36px; background: rgba(255,255,255,0.04);
          border: 1px solid #1e2d40; border-radius: 8px; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; padding: 0; transition: background 0.15s;
        }
        .hp-hamburger:hover { background: #111825; }
        .hp-hamburger span {
          display: block; width: 16px; height: 2px; background: #7a8fa8;
          border-radius: 2px; transition: transform 0.25s ease, opacity 0.2s;
          transform-origin: center;
        }
        .hp-hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .hp-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hp-hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

        /* ── Mobile menu ── */
        .hp-mobile-menu {
          position: fixed; top: 60px; left: 0; right: 0; z-index: 199;
          background: rgba(7,8,13,0.97); backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.04);
          padding: 0 20px 20px;
          transform: translateY(-8px);
          opacity: 0; pointer-events: none;
          transition: transform 0.25s ease, opacity 0.25s ease;
        }
        .hp-mobile-menu.open { transform: translateY(0); opacity: 1; pointer-events: all; }

        .hp-mobile-link {
          display: block; padding: 14px 0;
          font-size: 15px; font-family: 'DM Serif Display', serif; color: #c8d6e8;
          border-bottom: 1px solid #0c1520; cursor: pointer;
          transition: color 0.15s;
        }
        .hp-mobile-link:hover { color: #34d399; }
        .hp-mobile-link:last-child { border-bottom: none; }
      `}</style>

      <Navbar      onLogin={handleLogin} onRegister={handleRegister} />
      <Hero        onRegister={handleRegister} />
      <Ticker />
      <FeaturesSection />
      <CTASection  onRegister={handleRegister} onLogin={handleLogin} />
      <Footer      onLogin={handleLogin} onRegister={handleRegister} />
    </div>
  );
}