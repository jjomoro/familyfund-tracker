import { useState } from "react";
import ContributionFormDialog from "../components/ContributionFormDialog";
import StatusBadge from "../components/StatusBadge";
import { formatMoney, getAdminContributionHistory, getMemberContributionHistory, monthNames } from "../lib/fundUtils";

export default function ContributionsPage({ members, currentUser, contributions, settings, onRecordContribution, isSubmitting }) {
  const [showForm, setShowForm] = useState(false);
  const memberRows = currentUser.role === "admin"
    ? getAdminContributionHistory(members, contributions, settings)
    : getMemberContributionHistory(currentUser, contributions, settings);

  const sortedRows = memberRows.sort((a, b) => b.year - a.year || b.month - a.month || a.member.name.localeCompare(b.member.name));

  function handleSubmit(payload) {
    onRecordContribution(payload);
    setShowForm(false);
  }

  return (
    <div className="page-stack">
      <section className="table-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Monthly audit</p>
            <h2>Contribution History</h2>
          </div>
          {currentUser.role === "admin" ? (
            <button type="button" className="primary-button" onClick={() => setShowForm(true)}>
              {isSubmitting ? "Saving..." : "Record Contribution"}
            </button>
          ) : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {currentUser.role === "admin" ? <th>Member</th> : null}
                <th>Month</th>
                <th>Target</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={`${row.member.id}-${row.month}-${row.year}`}>
                  {currentUser.role === "admin" ? <td data-label="Member">{row.member.name}</td> : null}
                  <td data-label="Month">{monthNames[row.month - 1]} {row.year}</td>
                  <td data-label="Target">{formatMoney(row.target, settings.currency)}</td>
                  <td data-label="Paid">{formatMoney(row.paid, settings.currency)}</td>
                  <td data-label="Outstanding">{formatMoney(row.outstanding, settings.currency)}</td>
                  <td data-label="Status"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showForm ? (
        <ContributionFormDialog
          members={members}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
}
