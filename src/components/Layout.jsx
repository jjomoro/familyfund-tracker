import React from "react";
import StatusBadge from "./StatusBadge";
import { AlertCircle, BarChart3, FileText, LayoutDashboard, LogOut, Settings, WalletCards } from "lucide-react";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "contributions", label: "Contributions", icon: WalletCards },
  { key: "withdrawals", label: "Withdrawals", icon: BarChart3 },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "settings", label: "Settings", icon: Settings }
];

export default function Layout({ children, page, setPage, currentUser, settings, onSignOut, onRefresh, isRefreshing, notificationItems = [] }) {
  const activeNotifications = notificationItems.filter(item => item.key !== "clear");
  const [showNotifications, setShowNotifications] = React.useState(false);

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
                <item.icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
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
            <div className="notification-wrap">
              <button type="button" className="notification-button" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifications"><AlertCircle size={18} strokeWidth={2} /><span className="notification-label">Alerts</span>{activeNotifications.length ? <span>{activeNotifications.length}</span> : null}</button>
              {showNotifications ? <div className="notification-popover"><strong>Notifications</strong>{notificationItems.map(item => <button key={item.key} type="button" onClick={() => { setShowNotifications(false); if(item.key === "withdrawals") setPage("withdrawals"); else if(item.key === "dues" || item.key === "contributions") setPage("contributions"); }}><b>{item.title}</b><small>{item.detail}</small></button>)}</div> : null}
            </div>
            <div className="signed-in-card">
              <span>Signed in as</span>
              <strong>{currentUser?.name || "Family member"}</strong>
              <StatusBadge status={currentUser?.role} />
            </div>
            <button type="button" className="secondary-button" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" className="ghost-button icon-button" onClick={onSignOut}><LogOut size={16} /> <span>Sign out</span></button>
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
    reports: "Reports",
    settings: "Settings"
  };
  return titles[page] || "Dashboard";
}
