import KpiCard from "../components/KpiCard";
import MonthlyGrowthChart from "../components/MonthlyGrowthChart";
import OutstandingList from "../components/OutstandingList";
import RecentActivity from "../components/RecentActivity";
import {
  calculateFundBalance,
  calculateOutstanding,
  formatMoney,
  getMonthlyGrowth,
  getRecentActivity
} from "../lib/fundUtils";

export default function DashboardPage({ members, contributions, withdrawals, auditTrail, settings, dashboardSnapshot }) {
  const balance = dashboardSnapshot?.fundBalance ?? calculateFundBalance(contributions, withdrawals);
  const outstanding = dashboardSnapshot?.outstanding ?? calculateOutstanding(members, contributions);
  const outstandingTotal = outstanding.reduce((sum, item) => sum + Number(item.owed || 0), 0);
  const growthData = dashboardSnapshot?.monthlyGrowth ?? getMonthlyGrowth(contributions, withdrawals, settings.start_date);
  const previousBalance = growthData.at(-2)?.balance || 0;
  const currentBalance = growthData.at(-1)?.balance || balance;
  const growth = currentBalance - previousBalance;
  const recentActivity = dashboardSnapshot?.recentActivity ?? getRecentActivity(members, contributions, withdrawals, auditTrail, 5);

  return (
    <div className="page-stack">
      <section className="kpi-grid">
        <KpiCard
          label="Total Fund Balance"
          value={formatMoney(balance, settings.currency)}
          helper="Approved contributions minus approved withdrawals"
          tone="primary"
        />
        <KpiCard
          label="Monthly Growth"
          value={formatMoney(growth, settings.currency)}
          helper="Change since previous calendar month"
          tone={growth >= 0 ? "positive" : "danger"}
        />
        <KpiCard
          label="Outstanding This Month"
          value={formatMoney(outstandingTotal, settings.currency)}
          helper={`${outstanding.length} member${outstanding.length === 1 ? "" : "s"} with dues`}
          tone={outstandingTotal > 0 ? "warning" : "positive"}
        />
      </section>

      <MonthlyGrowthChart data={growthData} currency={settings.currency} />

      <div className="two-column-grid">
        <OutstandingList items={outstanding} currency={settings.currency} />
        <RecentActivity items={recentActivity} currency={settings.currency} />
      </div>
    </div>
  );
}
