import { useMemo, useState } from "react";
import { formatMoney } from "../lib/fundUtils";
import { getReportData, getReportPeriods, reportPeriodLabel } from "../lib/reportUtils";
import { downloadFundReport } from "../lib/reportPdf";

export default function ReportsPage({ members, contributions, withdrawals, settings }) {
  const [type, setType] = useState("monthly");
  const periods = useMemo(() => getReportPeriods(type), [type]);
  const [periodKey, setPeriodKey] = useState(periods[0]?.key || "");

  const selectedPeriod = periods.find((period) => period.key === periodKey) || periods[0];
  const report = useMemo(() => selectedPeriod ? getReportData({ type, period: selectedPeriod, members, contributions, withdrawals, settings }) : null, [type, selectedPeriod, members, contributions, withdrawals, settings]);

  function changeType(nextType) {
    setType(nextType);
    const nextPeriods = getReportPeriods(nextType);
    setPeriodKey(nextPeriods[0]?.key || "");
  }

  if (!report) return null;

  return (
    <div className="page-stack">
      <section className="table-card report-controls">
        <div>
          <p className="eyebrow">Fund reporting</p>
          <h2>Download a financial report</h2>
          <p className="muted">Generate a PDF for a month, quarter or full year using the recorded fund data.</p>
        </div>
        <div className="report-selector-grid">
          <label>
            Report type
            <select value={type} onChange={(event) => changeType(event.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </label>
          <label>
            Period
            <select value={selectedPeriod.key} onChange={(event) => setPeriodKey(event.target.value)}>
              {periods.map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}
            </select>
          </label>
          <button type="button" className="primary-button report-download-button" onClick={() => downloadFundReport(report)}>
            Download PDF
          </button>
        </div>
      </section>

      <section className="kpi-grid">
        <ReportMetric label="Opening balance" value={formatMoney(report.openingBalance, report.currency)} />
        <ReportMetric label="Contributions" value={formatMoney(report.contributionTotal, report.currency)} />
        <ReportMetric label="Approved withdrawals" value={formatMoney(report.approvedWithdrawalTotal, report.currency)} />
        <ReportMetric label="Closing balance" value={formatMoney(report.closingBalance, report.currency)} />
      </section>

      <section className="table-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{reportPeriodLabel(type)}</p>
            <h2>Member contribution summary</h2>
          </div>
          <span className="muted">{report.period.label}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>Target</th><th>Paid</th><th>Outstanding</th></tr></thead>
            <tbody>
              {report.memberRows.map((row) => (
                <tr key={row.member.id}>
                  <td data-label="Member">{row.member.name}</td>
                  <td data-label="Target">{formatMoney(row.target, report.currency)}</td>
                  <td data-label="Paid">{formatMoney(row.paid, report.currency)}</td>
                  <td data-label="Outstanding">{formatMoney(row.outstanding, report.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-card">
        <div className="section-heading"><h2>Activity by month</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Contributions</th><th>Withdrawals</th><th>Net</th></tr></thead>
            <tbody>
              {report.monthlyRows.map((row) => (
                <tr key={row.label}><td data-label="Month">{row.label}</td><td data-label="Contributions">{formatMoney(row.contribution, report.currency)}</td><td data-label="Withdrawals">{formatMoney(row.withdrawal, report.currency)}</td><td data-label="Net">{formatMoney(row.net, report.currency)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportMetric({ label, value }) {
  return <article className="kpi-card"><span>{label}</span><strong>{value}</strong></article>;
}
