import { useMemo, useState } from "react";
import ContributionFormDialog from "../components/ContributionFormDialog";
import StatusBadge from "../components/StatusBadge";
import { formatMoney, getAdminContributionHistory, getMemberContributionHistory, monthNames } from "../lib/fundUtils";
import { reminderText } from "../lib/featureUtils";

export default function ContributionsPage({ members, currentUser, contributions, settings, onRecordContribution, isSubmitting }) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const rows = currentUser.role === "admin"
    ? getAdminContributionHistory(members, contributions, settings)
    : getMemberContributionHistory(currentUser, contributions, settings);

  const filtered = useMemo(() => rows
    .filter((row) => {
      const matchesStatus = status === "all" || row.status === status;
      const haystack = `${row.member.name} ${monthNames[row.month - 1]} ${row.year}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    })
    .sort((a, b) => b.year - a.year || b.month - a.month || a.member.name.localeCompare(b.member.name)),
    [rows, status, query]
  );

  async function copyReminder(row) {
    await navigator.clipboard.writeText(reminderText(row.member, settings.currency, row.outstanding));
    window.alert("Reminder copied.");
  }

  return (
    <div className="page-stack">
      <section className="table-card">
        <div className="section-heading">
          <div><p className="eyebrow">Monthly audit</p><h2>Contribution History</h2></div>
          {currentUser.role === "admin" ? <button className="primary-button" onClick={() => setShowForm(true)}>Record Contribution</button> : null}
        </div>
        <div className="filter-bar">
          <input placeholder="Search member or month..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="outstanding">Outstanding</option>
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{currentUser.role === "admin" ? <th>Member</th> : null}<th>Month</th><th>Target</th><th>Paid</th><th>Outstanding</th><th>Status</th>{currentUser.role === "admin" ? <th /> : null}</tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.member.id}-${row.month}-${row.year}`}>
                  {currentUser.role === "admin" ? <td data-label="Member">{row.member.name}</td> : null}
                  <td data-label="Month">{monthNames[row.month - 1]} {row.year}</td>
                  <td data-label="Target">{formatMoney(row.target, settings.currency)}</td>
                  <td data-label="Paid">{formatMoney(row.paid, settings.currency)}</td>
                  <td data-label="Outstanding">{formatMoney(row.outstanding, settings.currency)}</td>
                  <td data-label="Status"><StatusBadge status={row.status} /></td>
                  {currentUser.role === "admin" ? <td>{row.outstanding > 0 ? <button className="link-button" onClick={() => copyReminder(row)}>Copy reminder</button> : null}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <div className="empty-state">No contribution records match these filters.</div> : null}
        </div>
      </section>
      {showForm ? <ContributionFormDialog members={members} onClose={() => setShowForm(false)} onSubmit={(payload) => { onRecordContribution(payload); setShowForm(false); }} isSubmitting={isSubmitting} /> : null}
    </div>
  );
}
