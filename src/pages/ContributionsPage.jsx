import { useMemo, useState } from "react";
import ContributionFormDialog from "../components/ContributionFormDialog";
import StatusBadge from "../components/StatusBadge";
import { formatMoney, getAdminContributionHistory, getMemberContributionHistory, monthNames } from "../lib/fundUtils";
import { reminderText } from "../lib/featureUtils";

export default function ContributionsPage({ members, currentUser, contributions, settings, onRecordContribution, onSubmitContribution, onVerifyContribution, isSubmitting }) {
  const [showForm, setShowForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const isAdmin = currentUser.role === "admin";
  const rows = isAdmin ? getAdminContributionHistory(members, contributions, settings) : getMemberContributionHistory(currentUser, contributions, settings);
  const pendingPayments = isAdmin ? contributions.filter(c => c.verification_status === "pending") : contributions.filter(c => c.member_id === currentUser.id && c.verification_status === "pending");

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

  function memberPaymentState() {
    if (isAdmin) return null;
    const current = new Date();
    const paid = contributions.filter(c => c.member_id === currentUser.id && c.verification_status === "verified" && Number(c.month) === current.getMonth() + 1 && Number(c.year) === current.getFullYear()).reduce((s,c) => s + Number(c.amount || 0), 0);
    const pending = contributions.filter(c => c.member_id === currentUser.id && c.verification_status === "pending" && Number(c.month) === current.getMonth() + 1 && Number(c.year) === current.getFullYear()).reduce((s,c) => s + Number(c.amount || 0), 0);
    return { paid, pending, outstanding: Math.max(Number(currentUser.monthly_target || 0) - paid, 0) };
  }
  const memberState = memberPaymentState();
  const currentMonthLabel = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;

  return (
    <div className="page-stack">
      {!isAdmin ? (
        <section className="payment-cta card-section">
          <div>
            <p className="eyebrow">{currentMonthLabel} contribution</p>
            <h2>Record your contribution</h2>
            <p className="muted">Enter the amount you paid. An admin will verify it before it is added to the fund balance.</p>
            <div className="payment-state-row">
              <span>Verified: <strong>{formatMoney(memberState.paid, settings.currency)}</strong></span>
              {memberState.pending > 0 ? <span>Awaiting verification: <strong>{formatMoney(memberState.pending, settings.currency)}</strong></span> : null}
              <span>Outstanding: <strong>{formatMoney(memberState.outstanding, settings.currency)}</strong></span>
            </div>
          </div>
          <button className="primary-button" onClick={() => setShowMemberForm(true)}>Submit Contribution</button>
        </section>
      ) : null}

      {isAdmin && pendingPayments.length ? (
        <section className="table-card verification-card">
          <div className="section-heading"><div><p className="eyebrow">Admin verification</p><h2>Contributions awaiting verification</h2></div><strong>{pendingPayments.length}</strong></div>
          <div className="verification-list">
            {pendingPayments.map(payment => {
              const member = members.find(m => m.id === payment.member_id);
              return <div className="verification-row" key={payment.id}>
                <div><strong>{member?.name || "Unknown member"}</strong><span>{monthNames[payment.month - 1]} {payment.year}</span></div>
                <strong>{formatMoney(payment.amount, settings.currency)}</strong>
                <div className="inline-actions"><button className="secondary-button compact" onClick={() => onVerifyContribution(payment.id, "rejected")} disabled={isSubmitting}>Reject</button><button className="primary-button compact" onClick={() => onVerifyContribution(payment.id, "verified")} disabled={isSubmitting}>Verify contribution</button></div>
              </div>;
            })}
          </div>
        </section>
      ) : null}

      <section className="table-card">
        <div className="section-heading">
          <div><p className="eyebrow">Monthly audit</p><h2>Contribution History</h2></div>
          {isAdmin ? <button className="primary-button" onClick={() => setShowForm(true)}>Record Contribution</button> : null}
        </div>
        <div className="filter-bar">
          <input placeholder="Search member or month..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="outstanding">Outstanding</option></select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{isAdmin ? <th>Member</th> : null}<th>Month</th><th>Target</th><th>Paid</th><th>Outstanding</th><th>Status</th>{isAdmin ? <th /> : null}</tr></thead>
            <tbody>{filtered.map(row => <tr key={`${row.member.id}-${row.month}-${row.year}`}>
              {isAdmin ? <td data-label="Member">{row.member.name}</td> : null}
              <td data-label="Month">{monthNames[row.month - 1]} {row.year}</td>
              <td data-label="Target">{formatMoney(row.target, settings.currency)}</td>
              <td data-label="Paid">{formatMoney(row.paid, settings.currency)}</td>
              <td data-label="Outstanding">{formatMoney(row.outstanding, settings.currency)}</td>
              <td data-label="Status"><StatusBadge status={row.status} /></td>
              {isAdmin ? <td>{row.outstanding > 0 ? <button className="link-button" onClick={() => copyReminder(row)}>Copy reminder</button> : null}</td> : null}
            </tr>)}</tbody>
          </table>
          {!filtered.length ? <div className="empty-state">No contribution records match these filters.</div> : null}
        </div>
      </section>
      {pendingPayments.length && !isAdmin ? <section className="card-section"><strong>Pending contributions</strong><div className="pending-mini-list">{pendingPayments.map(p => <div key={p.id}><span>{monthNames[p.month - 1]} {p.year} · {formatMoney(p.amount, settings.currency)}</span><StatusBadge status="pending" /></div>)}</div></section> : null}
      {showForm ? <ContributionFormDialog members={members} onClose={() => setShowForm(false)} onSubmit={(payload) => { onRecordContribution(payload); setShowForm(false); }} isSubmitting={isSubmitting} /> : null}
      {showMemberForm ? <ContributionFormDialog members={members} currentUser={currentUser} mode="member" onClose={() => setShowMemberForm(false)} onSubmit={(payload) => { onSubmitContribution(payload); setShowMemberForm(false); }} isSubmitting={isSubmitting} /> : null}
    </div>
  );
}
