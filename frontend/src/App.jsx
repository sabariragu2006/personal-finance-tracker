import { useState, useEffect } from "react";
import Sidebar      from "./components/Sidebar";
import AssetManager from "./pages/AssetManager";
import Liabilities  from "./pages/LiabilityManager";
import NetWorth     from "./pages/Networth";
import Transactions from "./pages/Transactions";
import Reports      from "./pages/Reports";
import Profile      from "./pages/Profile";
import HomePage     from "./pages/Homepage";
import AuthPage     from "./pages/AuthPage";

const BASE = import.meta.env.VITE_API_URL;

function App() {
  const [view,   setView]   = useState("home");
  const [active, setActive] = useState("assets");
  const [user,   setUser]   = useState(null);
  const [token,  setToken]  = useState(() => localStorage.getItem("vaultfolio_token") || "");

  // Re-hydrate user from stored token on page load
  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setView("app");
        }
      })
      .catch(() => {});
  }, []);

  const handleAuthSuccess = (data) => {
    localStorage.setItem("vaultfolio_token", data.token);
    setToken(data.token);
    setUser(data.user);
    setView("app");
    setActive("assets");
  };

  const handleLogout = () => {
    localStorage.removeItem("vaultfolio_token");
    setToken("");
    setUser(null);
    setView("home");
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (view === "home") {
    return (
      <HomePage
        onLogin={()    => setView("login")}
        onRegister={()  => setView("register")}
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
        marginLeft: 260,
        flex: 1,
        minWidth: 0,
        height: "100%",
        minHeight: "100vh",
        overflowY: "auto"
      }}>
        {active === "assets"       && <AssetManager token={token} />}
        {active === "liabilities"  && <Liabilities  token={token} />}
        {active === "networth"     && <NetWorth      token={token} />}
        {active === "transactions" && <Transactions  token={token} />}
        {active === "reports"      && <Reports       token={token} />}
        {active === "profile"      && (
          <Profile
            user={user}
            token={token}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default App;