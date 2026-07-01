import StatusBadge from "./StatusBadge";

const navItems = [
  { key: "dashboard", label: "Dashboard" },
  { key: "contributions", label: "Contributions" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "settings", label: "Settings" }
];

export default function Layout({ children, page, setPage, currentUser, settings, onSignOut, onRefresh, isRefreshing }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span>FF</span>
          <div>
            <strong>{settings.fund_name}</strong>
            <small>Emergency Fund Tracker</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map((item) => {
            const disabled = item.key === "settings" && currentUser?.role !== "admin";
            return (
              <button
                type="button"
                key={item.key}
                className={page === item.key ? "active" : ""}
                onClick={() => !disabled && setPage(item.key)}
                disabled={disabled}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Shared visibility. Admin control.</p>
            <h1>{pageTitle(page)}</h1>
          </div>
          <div className="user-panel">
            <div className="signed-in-card">
              <span>Signed in as</span>
              <strong>{currentUser?.name || "Family member"}</strong>
              <StatusBadge status={currentUser?.role} />
            </div>
            <button type="button" className="secondary-button" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" className="ghost-button" onClick={onSignOut}>Sign out</button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function pageTitle(page) {
  const titles = {
    dashboard: "Dashboard",
    contributions: "Contributions",
    withdrawals: "Withdrawals",
    settings: "Settings"
  };
  return titles[page] || "Dashboard";
}
