import { useState, useEffect, useRef } from "react";

const BASE = import.meta.env.VITE_API_URL;
const ASSETS_API       = `${BASE}/api/assets`;
const LIABILITIES_API  = `${BASE}/api/liabilities`;
const TRANSACTIONS_API = `${BASE}/api/transactions`;

const NAV_ITEMS = [
  {
    id: "assets", label: "Assets",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>),
  },
  {
    id: "liabilities", label: "Liabilities",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>),
  },
  {
    id: "networth", label: "Net Worth",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>),
  },
  {
    id: "transactions", label: "Transactions",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>),
  },
  {
    id: "reports", label: "Reports",
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="5" y="3" width="14" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" /></svg>),
  },
];

function fmt(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${n < 0 ? "-" : ""}$${(abs / 1_000).toFixed(1)}K`;
  return `${n < 0 ? "-$" : "$"}${abs.toLocaleString()}`;
}

function fmtFull(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
}

function DonutChart({ assetVal, liabilityVal, animate, size = 96 }) {
  const total = assetVal + liabilityVal;
  const isSmall = size <= 44;
  const r  = isSmall ? 15 : 34;
  const sw = isSmall ? 5  : 11;
  const cx = size / 2;
  if (total === 0) {
    return (<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e2433" strokeWidth={sw} /></svg>);
  }
  const circumference = 2 * Math.PI * r;
  const gap       = isSmall ? 1.5 : 3;
  const assetLen  = Math.max(0, circumference * (assetVal / total) - gap);
  const liabLen   = Math.max(0, circumference * (liabilityVal / total) - gap);
  const liabOffset = -(assetLen + gap);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1a2030" strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#34d399" strokeWidth={sw}
        strokeDasharray={`${assetLen} ${circumference}`} strokeDashoffset={0} strokeLinecap="round"
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cx}px`, transition: animate ? "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)" : "none" }} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f87171" strokeWidth={sw}
        strokeDasharray={`${liabLen} ${circumference}`} strokeDashoffset={liabOffset} strokeLinecap="round"
        style={{ transform: `rotate(-90deg)`, transformOrigin: `${cx}px ${cx}px`, transition: animate ? "stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1), stroke-dashoffset 1.1s" : "none" }} />
    </svg>
  );
}

function Skeleton({ w = "100%", h = 14, r = 6, mb = 0 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#1a2030 25%,#222b40 50%,#1a2030 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear", marginBottom: mb }} />
  );
}

const BP_MOBILE = 640;
const BP_TABLET = 1024;

function useBreakpoint() {
  const get = () => {
    if (typeof window === "undefined") return "desktop";
    if (window.innerWidth < BP_MOBILE) return "mobile";
    if (window.innerWidth < BP_TABLET) return "tablet";
    return "desktop";
  };
  const [mode, setMode] = useState(get);
  useEffect(() => {
    const h = () => setMode(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mode;
}

function RailTooltip({ label, children }) {
  return (
    <div className="rail-tip-wrap">
      {children}
      <span className="rail-tooltip">{label}</span>
    </div>
  );
}

export default function Sidebar({ active, setActive, onLogout, onLogin, onRegister, user, token }) {
  const [data,       setData]       = useState({ assets: [], liabilities: [], txCount: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [animate,    setAnimate]    = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mode      = useBreakpoint();
  const drawerRef = useRef(null);

  // Outside-click closes drawer (with tiny delay so opening click doesn't instantly close)
  useEffect(() => {
    if (!drawerOpen) return;
    let timer;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setDrawerOpen(false);
      }
    };
    timer = setTimeout(() => document.addEventListener("mousedown", handler), 80);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [drawerOpen]);

  useEffect(() => { setDrawerOpen(false); }, [active]);
  useEffect(() => { if (mode !== "mobile") setDrawerOpen(false); }, [mode]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchData = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const [aRes, lRes, tRes] = await Promise.all([
        fetch(ASSETS_API,       { headers: authHeaders }),
        fetch(LIABILITIES_API,  { headers: authHeaders }),
        fetch(`${TRANSACTIONS_API}?limit=1&page=1`, { headers: authHeaders }),
      ]);
      const assets      = aRes.ok ? await aRes.json() : [];
      const liabilities = lRes.ok ? await lRes.json() : [];
      const txData      = tRes.ok ? await tRes.json() : { pagination: { total: 0 } };
      setData({ assets, liabilities, txCount: txData?.pagination?.total || 0 });
      setError(false);
      setTimeout(() => setAnimate(true), 50);
    } catch { setError(true); }
    finally  { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, [token]);

  const totalAssets   = data.assets.reduce((s, a) => s + (parseFloat(a.current_value ?? a.invested_value) || 0), 0);
  const totalLiab     = data.liabilities.reduce((s, l) => s + (parseFloat(l.current_balance) || 0), 0);
  const netWorth      = totalAssets - totalLiab;
  const assetsPct     = totalAssets + totalLiab > 0 ? Math.round((totalAssets / (totalAssets + totalLiab)) * 100) : 0;
  const health        = assetsPct >= 70 ? "healthy" : assetsPct >= 50 ? "fair" : "review";
  const healthColor   = assetsPct >= 70 ? "#34d399" : assetsPct >= 50 ? "#fbbf24" : "#f87171";
  const totalInvested = data.assets.reduce((s, a) => s + (parseFloat(a.invested_value) || 0), 0);
  const totalGain     = totalAssets - totalInvested;
  const totalGainPct  = totalInvested ? (totalGain / totalInvested) * 100 : 0;

  const displayName = user?.name  || "Portfolio";
  const initials    = getInitials(user?.name);
  const userEmail   = user?.email || "";

  // ── Shared full-panel content ──────────────────────────────────────────────
  const PanelContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div className="top-section">
        <div className="portfolio-label">{user ? "Portfolio" : "Vaultfolio"}</div>
        <div className="user-name">{user ? user.name : "Welcome back"}</div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 4 }}>
              <div style={{ width: 86, height: 86, borderRadius: "50%", background: "#1a2030", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton w="70%" h={11} r={4} /><Skeleton w="90%" h={16} r={4} />
                <Skeleton w="70%" h={11} r={4} /><Skeleton w="90%" h={16} r={4} />
              </div>
            </div>
            <Skeleton h={44} r={10} />
          </div>
        ) : error ? (
          <div className="error-banner" onClick={fetchData}>
            <span>⚠ Failed to load</span><span style={{ fontSize: 10, color: "#7f1d1d" }}>retry ↺</span>
          </div>
        ) : (
          <>
            <div className="donut-row">
              <div className="donut-wrap">
                <DonutChart assetVal={totalAssets} liabilityVal={totalLiab} animate={animate} size={96} />
                <div className="donut-center">
                  <div className="donut-pct" style={{ color: healthColor }}>{assetsPct}%</div>
                  <div className="donut-label">{health}</div>
                </div>
              </div>
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-top"><div className="legend-dot" style={{ background: "#34d399" }} /><span className="legend-name">Assets</span></div>
                  <div className="legend-val" style={{ color: "#34d399" }}>{fmt(totalAssets)}</div>
                  <div className="legend-sub">{data.assets.length} positions</div>
                </div>
                <div className="legend-item">
                  <div className="legend-top"><div className="legend-dot" style={{ background: "#f87171" }} /><span className="legend-name">Liabilities</span></div>
                  <div className="legend-val" style={{ color: "#f87171" }}>{fmt(totalLiab)}</div>
                  <div className="legend-sub">{data.liabilities.length} debts</div>
                </div>
              </div>
            </div>
            <div className="networth-strip">
              <div>
                <div className="nw-label">Net Worth</div>
                <div className="nw-value" style={{ color: netWorth >= 0 ? "#f0f4ff" : "#f87171" }}>{fmtFull(netWorth)}</div>
              </div>
              <div className="nw-badge" style={{ color: totalGain >= 0 ? "#34d399" : "#f87171", background: totalGain >= 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${totalGain >= 0 ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
                {totalGain >= 0 ? "↑" : "↓"} {Math.abs(totalGainPct).toFixed(1)}%
              </div>
            </div>
            <div className="gain-row">
              <div className="gain-item">
                <span className="gain-label">Invested</span>
                <span className="gain-val" style={{ color: "#64748b" }}>{fmt(totalInvested)}</span>
              </div>
              <div className="gain-item" style={{ alignItems: "flex-end" }}>
                <span className="gain-label">All-time gain</span>
                <span className="gain-val" style={{ color: totalGain >= 0 ? "#34d399" : "#f87171" }}>{totalGain >= 0 ? "+" : ""}{fmt(totalGain)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="nav" style={{ flex: 1, overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => (
          <div key={item.id} className={`nav-item${active === item.id ? " active" : ""}`} onClick={() => setActive(item.id)}>
            <div className="nav-icon">{item.icon}</div>
            <span className="nav-label">{item.label}</span>
            {item.id === "assets"       && !loading && <span className="nav-pill">{data.assets.length}</span>}
            {item.id === "liabilities"  && !loading && <span className="nav-pill">{data.liabilities.length}</span>}
            {item.id === "transactions" && !loading && data.txCount > 0 && <span className="nav-pill">{data.txCount > 99 ? "99+" : data.txCount}</span>}
          </div>
        ))}
      </nav>

      {user ? (
        <div className="bottom-section">
          <div className={`profile-card${active === "profile" ? " profile-card-active" : ""}`} onClick={() => setActive("profile")} role="button" style={{ cursor: "pointer" }}>
            <div className="avatar">{initials}</div>
            <div className="profile-info">
              <div className="profile-name">{displayName}</div>
              <div className="profile-email">{userEmail}</div>
            </div>
            <button className="logout-btn" onClick={(e) => { e.stopPropagation(); onLogout(); }} title="Log out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="auth-section">
          <div className="auth-tagline">Your portfolio awaits</div>
          <button className="auth-btn auth-btn-login" onClick={onLogin}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
            Sign In
          </button>
          <button className="auth-btn auth-btn-register" onClick={onRegister}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
            Create Account
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes shimmer     { 0%   { background-position: 200% 0; }  100% { background-position: -200% 0; } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── SHARED PANEL STYLES ── */
        .top-section     { padding: 20px 15px 15px; border-bottom: 1px solid #1a2030; flex-shrink: 0; animation: fadeSlideIn 0.4s ease both; }
        .portfolio-label { font-size: 10px; font-family: 'DM Mono', monospace; color: #2a3a50; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 3px; }
        .user-name       { font-family: 'DM Serif Display', serif; font-size: 18px; color: #f0f4ff; margin-bottom: 15px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .donut-row       { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .donut-wrap      { position: relative; flex-shrink: 0; }
        .donut-center    { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; pointer-events: none; }
        .donut-pct       { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; line-height: 1; }
        .donut-label     { font-size: 7px; color: #4a5568; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
        .legend          { flex: 1; min-width: 0; }
        .legend-item     { margin-bottom: 8px; }
        .legend-item:last-child { margin-bottom: 0; }
        .legend-top      { display: flex; align-items: center; gap: 5px; margin-bottom: 2px; }
        .legend-dot      { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .legend-name     { font-size: 9px; color: #3a4a60; text-transform: uppercase; letter-spacing: 0.12em; }
        .legend-val      { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; padding-left: 11px; line-height: 1; }
        .legend-sub      { font-size: 9px; color: #2a3a50; padding-left: 11px; margin-top: 1px; font-family: 'DM Mono', monospace; }
        .networth-strip  { background: #0f1520; border: 1px solid #1a2030; border-radius: 10px; padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .nw-label        { font-size: 9px; color: #2a3a50; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 3px; }
        .nw-value        { font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 500; line-height: 1; }
        .nw-badge        { font-size: 10px; font-family: 'DM Mono', monospace; padding: 3px 7px; border-radius: 20px; flex-shrink: 0; white-space: nowrap; }
        .gain-row        { display: flex; justify-content: space-between; align-items: center; margin-top: 7px; padding: 0 1px; }
        .gain-item       { display: flex; flex-direction: column; gap: 1px; }
        .gain-label      { font-size: 9px; color: #2a3a50; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'DM Mono', monospace; }
        .gain-val        { font-size: 12px; font-family: 'DM Mono', monospace; font-weight: 500; }
        .nav             { padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
        .nav-item        { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; cursor: pointer; transition: all 0.16s; color: #3a4a60; font-size: 13px; border: 1px solid transparent; position: relative; user-select: none; }
        .nav-item:hover  { color: #7a8fa8; background: #111825; }
        .nav-item.active { color: #e2e8f0; background: #111825; border-color: #1a2030; }
        .nav-item.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 55%; background: #34d399; border-radius: 0 3px 3px 0; }
        .nav-icon        { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 8px; flex-shrink: 0; transition: background 0.16s, color 0.16s; }
        .nav-item.active .nav-icon { background: rgba(52,211,153,0.1); color: #34d399; }
        .nav-item:hover  .nav-icon { background: #1a2030; }
        .nav-label       { flex: 1; }
        .nav-pill        { font-size: 10px; font-family: 'DM Mono', monospace; padding: 2px 7px; border-radius: 20px; background: #151d2a; color: #3a4a60; }
        .nav-item.active .nav-pill { background: rgba(52,211,153,0.1); color: #34d399; }
        .bottom-section  { padding: 10px; border-top: 1px solid #1a2030; flex-shrink: 0; }
        .profile-card    { display: flex; align-items: center; gap: 10px; padding: 10px 11px; border-radius: 10px; background: rgba(255,255,255,0.015); border: 1px solid #1a2030; cursor: pointer; transition: background 0.16s, border-color 0.16s; }
        .profile-card:hover { background: #111825; border-color: #1e2d40; }
        .profile-card-active { background: #111825 !important; border-color: rgba(52,211,153,0.25) !important; }
        .profile-card-active .profile-name { color: #e2e8f0; }
        .avatar          { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#34d399 0%,#0d9488 100%); display: flex; align-items: center; justify-content: center; font-family: 'DM Serif Display', serif; font-size: 12px; color: #0d1117; font-weight: 700; flex-shrink: 0; }
        .profile-info    { flex: 1; min-width: 0; }
        .profile-name    { font-size: 12px; font-weight: 500; color: #c8d6e8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .profile-email   { font-size: 9px; color: #2a3a50; margin-top: 1px; font-family: 'DM Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .logout-btn      { background: rgba(255,255,255,0.04); border: 1px solid #1e2d40; cursor: pointer; color: #4a6070; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 7px; transition: color 0.15s, background 0.15s, border-color 0.15s; flex-shrink: 0; min-width: 28px; min-height: 28px; }
        .logout-btn:hover { color: #f87171; background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.25); }
        .error-banner    { margin: 6px; padding: 8px 12px; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2); border-radius: 8px; font-size: 11px; color: #f87171; font-family: 'DM Mono', monospace; display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; }
        .auth-section    { padding: 10px; border-top: 1px solid #1a2030; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .auth-btn        { width: 100%; padding: 9px 14px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 12.5px; font-weight: 500; cursor: pointer; transition: all 0.16s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .auth-btn-login  { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: #34d399; }
        .auth-btn-login:hover { background: rgba(52,211,153,0.15); border-color: rgba(52,211,153,0.4); color: #6ee7b7; }
        .auth-btn-register { background: rgba(255,255,255,0.03); border: 1px solid #1e2d40; color: #4a6070; }
        .auth-btn-register:hover { background: #111825; border-color: #2a3a50; color: #7a8fa8; }
        .auth-tagline    { text-align: center; font-size: 9px; font-family: 'DM Mono', monospace; color: #1e2d3a; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }

        /* ── DESKTOP SIDEBAR ── */
        .vf-sidebar {
          width: 260px; height: 100vh; background: #0d1117; display: flex; flex-direction: column;
          font-family: 'DM Sans', sans-serif; border-right: 1px solid #1a2030; overflow: hidden;
          position: fixed; top: 0; left: 0; z-index: 100;
        }
        .vf-sidebar::before { content:''; position:absolute; top:-60px; right:-60px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle,rgba(52,211,153,0.07) 0%,transparent 70%); pointer-events:none; }

        /* ── TABLET RAIL ── */
        .vf-rail { width: 64px; height: 100vh; position: fixed; top: 0; left: 0; z-index: 100; background: #0d1117; border-right: 1px solid #1a2030; display: flex; flex-direction: column; align-items: center; padding: 14px 0 12px; gap: 4px; }
        .rail-logo { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; transition: background 0.16s; }
        .rail-logo:hover { background: #111825; }
        .rail-donut { position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; margin: 2px 0; }
        .rail-donut-pct { position: absolute; font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 500; pointer-events: none; }
        .rail-divider { width: 32px; height: 1px; background: #1a2030; margin: 6px 0; flex-shrink: 0; }
        .rail-item { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.16s; color: #3a4a60; border: 1px solid transparent; position: relative; flex-shrink: 0; }
        .rail-item:hover  { color: #7a8fa8; background: #111825; }
        .rail-item.active { color: #34d399; background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.15); }
        .rail-badge { position: absolute; top: 4px; right: 4px; min-width: 14px; height: 14px; border-radius: 7px; background: rgba(52,211,153,0.15); color: #34d399; font-family: 'DM Mono', monospace; font-size: 8px; display: flex; align-items: center; justify-content: center; padding: 0 3px; border: 1px solid rgba(52,211,153,0.25); }
        .rail-tip-wrap { position: relative; display: flex; }
        .rail-tooltip { position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%) translateX(-4px); background: #111825; border: 1px solid #1e2d40; border-radius: 7px; padding: 5px 10px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: #c8d6e8; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.15s, transform 0.15s; z-index: 9999; }
        .rail-tip-wrap:hover .rail-tooltip { opacity: 1; transform: translateY(-50%) translateX(0); }

        /* ── MOBILE TOP BAR ── */
        .vf-topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 400; height: 54px; background: #0d1117; border-bottom: 1px solid #1a2030; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; font-family: 'DM Sans', sans-serif; }
        .vf-topbar-logo   { font-family: 'DM Serif Display', serif; font-size: 17px; color: #f0f4ff; }
        .vf-topbar-right  { display: flex; align-items: center; gap: 8px; }
        .vf-topbar-nw     { font-family: 'DM Mono', monospace; font-size: 11px; color: #34d399; padding: 4px 9px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.18); border-radius: 20px; white-space: nowrap; }
        .vf-topbar-avatar { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg,#34d399 0%,#0d9488 100%); display: flex; align-items: center; justify-content: center; font-family: 'DM Serif Display', serif; font-size: 11px; color: #0d1117; font-weight: 700; cursor: pointer; flex-shrink: 0; }
        .vf-topbar-signin { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: #34d399; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; padding: 5px 11px; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .vf-topbar-signin:hover { background: rgba(52,211,153,0.15); }

        /* Hamburger button */
        .vf-hamburger { width: 36px; height: 36px; background: rgba(255,255,255,0.04); border: 1px solid #1e2d40; border-radius: 9px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: background 0.15s, border-color 0.15s; flex-shrink: 0; padding: 0; }
        .vf-hamburger:hover { background: #111825; border-color: #2a3a50; }
        .vf-hamburger span  { display: block; width: 16px; height: 2px; background: #7a8fa8; border-radius: 2px; transition: transform 0.25s ease, opacity 0.25s ease; transform-origin: center; }
        .vf-hamburger.is-open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .vf-hamburger.is-open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .vf-hamburger.is-open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

        /* ── BACKDROP — always rendered, opacity/pointer-events toggled ── */
        .vf-backdrop { position: fixed; inset: 0; z-index: 498; background: rgba(0,0,0,0); transition: background 0.28s; pointer-events: none; }
        .vf-backdrop.open { background: rgba(0,0,0,0.65); pointer-events: all; }

        /* ── DRAWER — always rendered, transform drives open/close ── */
        .vf-drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(82vw, 290px); z-index: 499;
          background: #0d1117; border-right: 1px solid #1a2030;
          display: flex; flex-direction: column;
          transform: translateX(-105%);
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }
        .vf-drawer.open { transform: translateX(0); }
        .vf-drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 0 16px; flex-shrink: 0; margin-bottom: 4px; }
        .vf-drawer-brand  { font-family: 'DM Serif Display', serif; font-size: 16px; color: #f0f4ff; }
        .vf-drawer-close  { width: 30px; height: 30px; background: rgba(255,255,255,0.04); border: 1px solid #1e2d40; color: #4a6070; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .vf-drawer-close:hover { background: #111825; color: #c8d6e8; border-color: #2a3a50; }
        .vf-drawer-body { flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; }

        /* ── BOTTOM NAV (extra-small ≤ 420px) ── */
        .vf-bottomnav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 300; height: 60px; background: #0d1117; border-top: 1px solid #1a2030; align-items: center; justify-content: space-around; padding: 0 4px; padding-bottom: env(safe-area-inset-bottom, 0); }
        .vf-bnav-item  { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 6px 2px; border-radius: 8px; cursor: pointer; color: #3a4a60; transition: color 0.15s; position: relative; min-width: 0; }
        .vf-bnav-item.active { color: #34d399; }
        .vf-bnav-item:active { background: #111825; }
        .vf-bnav-label { font-family: 'DM Sans', sans-serif; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .vf-bnav-dot   { position: absolute; top: 5px; right: calc(50% - 12px); width: 5px; height: 5px; border-radius: 50%; background: #34d399; }
      `}</style>

      {/* ── DESKTOP ── */}
      {mode === "desktop" && (
        <aside className="vf-sidebar">
          <PanelContent />
        </aside>
      )}

      {/* ── TABLET ── */}
      {mode === "tablet" && (
        <aside className="vf-rail">
          <div className="rail-logo" onClick={() => setActive("dashboard")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          {!loading && !error && (
            <div className="rail-donut" title={`Net Worth: ${fmtFull(netWorth)}`}>
              <DonutChart assetVal={totalAssets} liabilityVal={totalLiab} animate={animate} size={44} />
              <div className="rail-donut-pct" style={{ color: healthColor }}>{assetsPct}%</div>
            </div>
          )}
          <div className="rail-divider" />
          {NAV_ITEMS.map((item) => {
            const pill = item.id === "assets" ? data.assets.length
              : item.id === "liabilities" ? data.liabilities.length
              : item.id === "transactions" && data.txCount > 0 ? (data.txCount > 99 ? "99+" : data.txCount)
              : null;
            return (
              <RailTooltip key={item.id} label={item.label}>
                <div className={`rail-item${active === item.id ? " active" : ""}`} onClick={() => setActive(item.id)}>
                  {item.icon}
                  {!loading && pill !== null && <span className="rail-badge">{pill}</span>}
                </div>
              </RailTooltip>
            );
          })}
          <div style={{ flex: 1 }} />
          {user ? (
            <RailTooltip label={displayName}>
              <div className={`rail-item${active === "profile" ? " active" : ""}`} onClick={() => setActive("profile")}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{initials}</div>
              </div>
            </RailTooltip>
          ) : (
            <RailTooltip label="Sign In">
              <div className="rail-item" onClick={onLogin}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              </div>
            </RailTooltip>
          )}
        </aside>
      )}

      {/* ── MOBILE ── */}
      {mode === "mobile" && (
        <>
          {/* Top bar */}
          <header className="vf-topbar">
            <button
              className={`vf-hamburger${drawerOpen ? " is-open" : ""}`}
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              type="button"
            >
              <span /><span /><span />
            </button>
            <span className="vf-topbar-logo">Maadala</span>
            <div className="vf-topbar-right">
              {!loading && !error && <span className="vf-topbar-nw">{fmt(netWorth)}</span>}
              {user
                ? <div className="vf-topbar-avatar" onClick={() => setActive("profile")}>{initials}</div>
                : <button className="vf-topbar-signin" type="button" onClick={onLogin}>Sign In</button>
              }
            </div>
          </header>

          {/* Backdrop — always in DOM */}
          <div
            className={`vf-backdrop${drawerOpen ? " open" : ""}`}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer — always in DOM, slide in/out via transform */}
          <div className={`vf-drawer${drawerOpen ? " open" : ""}`} ref={drawerRef}>
            <div className="vf-drawer-header">
              <span className="vf-drawer-brand">Vaultfolio</span>
              <button className="vf-drawer-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="vf-drawer-body">
              <PanelContent />
            </div>
          </div>

          {/* Bottom nav for ≤ 420px — shown via CSS media query */}
          <nav className="vf-bottomnav" style={{ display: "flex" }}>
            {NAV_ITEMS.slice(0, 4).map((item) => {
              const hasBadge = (item.id === "assets" && data.assets.length > 0)
                || (item.id === "liabilities" && data.liabilities.length > 0)
                || (item.id === "transactions" && data.txCount > 0);
              return (
                <div key={item.id} className={`vf-bnav-item${active === item.id ? " active" : ""}`} onClick={() => setActive(item.id)}>
                  {item.icon}
                  {!loading && hasBadge && <span className="vf-bnav-dot" />}
                  <span className="vf-bnav-label">{item.label}</span>
                </div>
              );
            })}
            {user ? (
              <div className={`vf-bnav-item${active === "profile" ? " active" : ""}`} onClick={() => setActive("profile")}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: "linear-gradient(135deg,#34d399,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#0d1117", fontWeight: 700, fontFamily: "serif" }}>{initials}</div>
                <span className="vf-bnav-label">Profile</span>
              </div>
            ) : (
              <div className="vf-bnav-item" onClick={onLogin}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                <span className="vf-bnav-label">Sign In</span>
              </div>
            )}
          </nav>
        </>
      )}
    </>
  );
}