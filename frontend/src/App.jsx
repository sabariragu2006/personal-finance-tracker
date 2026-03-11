import { useState, useEffect } from "react";
import Sidebar      from "./components/Sidebar";
import AssetManager from "./pages/AssetManager";
import Liabilities  from "./pages/Liabilities";
import NetWorth     from "./pages/Networth";
import Transactions from "./pages/Transactions";
import Reports      from "./pages/Reports";
import Profile      from "./pages/Profile";
import HomePage     from "./pages/Homepage";
import AuthPage     from "./pages/AuthPage";

function App() {
  const [view,   setView]   = useState("home");
  const [active, setActive] = useState("assets");
  const [user,   setUser]   = useState(null);

  // Re-hydrate user from stored token on page load
  useEffect(() => {
    const token = localStorage.getItem("vaultfolio_token");
    if (!token) return;
    fetch("https://maadala.onrender.com/api/auth/me", {
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
    setUser(data.user);
    setView("app");
    setActive("assets");
  };

  const handleLogout = () => {
    localStorage.removeItem("vaultfolio_token");
    setUser(null);
    setView("home");
  };

  // Called by Profile page after a successful name/email update
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
<div style={{ display: "flex", width: "100%", background: "#07080d" }}>      <Sidebar
        active={active}
        setActive={setActive}
        onLogout={handleLogout}
        onLogin={() => setView("login")}
        onRegister={() => setView("register")}
        user={user}
      />

<div style={{ 
  marginLeft: 260,
  flex: 1,
  minWidth: 0,
  height: "100%",
  minHeight: "100vh",
  overflowY: "auto"
}}>        {active === "assets"       && <AssetManager />}
        {active === "liabilities"  && <Liabilities />}
        {active === "networth"     && <NetWorth />}
        {active === "transactions" && <Transactions />}
        {active === "reports"      && <Reports />}
        {active === "profile"      && (
          <Profile
            user={user}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default App;