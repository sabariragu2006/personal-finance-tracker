import { useState, useEffect } from "react";
import Sidebar      from "./components/Sidebar";
import Dashboard    from "./pages/Dashboard";
import AssetManager from "./pages/AssetManager";
import Liabilities  from "./pages/LiabilityManager";
import NetWorth     from "./pages/Networth";
import Transactions from "./pages/Transactions";
import Reports      from "./pages/Reports";
import Profile      from "./pages/Profile";
import HomePage     from "./pages/Homepage";
import AuthPage     from "./pages/AuthPage";

const BASE = import.meta.env.VITE_API_URL;

function useLayout() {
  const get = () => {
    if (typeof window === "undefined") return { ml: 260, pt: 0, pb: 0 };
    const w = window.innerWidth;
    if (w < 420)  return { ml: 0,   pt: 54, pb: 60 }; // mobile xs: top bar + bottom nav
    if (w < 640)  return { ml: 0,   pt: 54, pb: 0  }; // mobile: top bar only
    if (w < 1024) return { ml: 64,  pt: 0,  pb: 0  }; // tablet: icon rail
    return              { ml: 260, pt: 0,  pb: 0  }; // desktop
  };
  const [layout, setLayout] = useState(get);
  useEffect(() => {
    const h = () => setLayout(get());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return layout;
}

function App() {
  const [view,   setView]   = useState("home");
  const [active, setActive] = useState("dashboard");
  const [user,   setUser]   = useState(null);
  const [token,  setToken]  = useState(() => localStorage.getItem("vaultfolio_token") || "");

  const { ml, pt, pb } = useLayout();

  useEffect(() => {
    const storedToken = localStorage.getItem("vaultfolio_token");
    if (!storedToken) return;
    fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setToken(storedToken);
          setView("app");
        } else {
          localStorage.removeItem("vaultfolio_token");
          setToken("");
        }
      })
      .catch(() => {
        localStorage.removeItem("vaultfolio_token");
        setToken("");
      });
  }, []);

  const handleAuthSuccess = (data) => {
    if (!data?.token) return;
    localStorage.setItem("vaultfolio_token", data.token);
    setToken(data.token);
    setUser(data.user ?? null);
    setView("app");
    setActive("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("vaultfolio_token");
    setToken("");
    setUser(null);
    setView("home");
  };

  if (view === "home") {
    return (
      <HomePage
        onLogin={()    => setView("login")}
        onRegister={() => setView("register")}
      />
    );
  }

  if (view === "login" || view === "register") {
    return (
      <AuthPage
        initialMode={view}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div style={{ display: "flex", width: "100%", background: "#07080d" }}>
      <Sidebar
        active={active}
        setActive={setActive}
        onLogout={handleLogout}
        onLogin={() => setView("login")}
        onRegister={() => setView("register")}
        user={user}
        token={token}
      />

      <div style={{
        marginLeft: ml,
        paddingTop: pt,
        paddingBottom: pb,
        flex: 1,
        minWidth: 0,
        minHeight: "100vh",
        overflowY: "auto",
        transition: "margin-left 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {active === "dashboard"    && <Dashboard    token={token} />}
        {active === "assets"       && <AssetManager token={token} />}
        {active === "liabilities"  && <Liabilities  token={token} />}
        {active === "networth"     && <NetWorth      token={token} />}
        {active === "transactions" && <Transactions  token={token} />}
        {active === "reports"      && <Reports       token={token} />}
        {active === "profile"      && (
          <Profile
            user={user}
            token={token}
            onUserUpdate={(u) => setUser(u)}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default App;