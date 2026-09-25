import { useEffect, useState } from "react";
import MemberFormDialog from "../components/MemberFormDialog";
import StatusBadge from "../components/StatusBadge";
import { formatMoney } from "../lib/fundUtils";
import { monthlyLabel } from "../lib/featureUtils";

export default function SettingsPage({ members, currentUser, settings, onSaveMember, onDeleteMember, onSaveSettings, isSubmitting, monthlyCloses, onCloseMonth, onReopenMonth }) {
  const [editingMember, setEditingMember] = useState(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [fundForm, setFundForm] = useState(settings);
  useEffect(() => setFundForm(settings), [settings]);

  if (currentUser.role !== "admin") return <section className="table-card"><h2>Admin only</h2><p className="muted">Members can view fund health, contributions, and withdrawal requests, but cannot change setup data.</p></section>;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const closed = monthlyCloses?.find((item) => Number(item.month) === month && Number(item.year) === year);

  function handleDelete(member) {
    if (member.id === currentUser.id) return;
    if (window.confirm(`Remove ${member.name} from active fund access?\n\nHistorical records will be kept.`)) onDeleteMember(member);
  }

  async function copyInvite(member) {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}`;
    await navigator.clipboard.writeText(`Hi ${member.name}, you have been added to our FamilyFund Tracker. Open ${url} and create an account using ${member.email}.`);
    window.alert("Invite copied.");
  }

  function saveSettings(event) { event.preventDefault(); onSaveSettings(fundForm); }

  return (
    <div className="page-stack">
      <section className="settings-grid">
        <form className="table-card settings-form" onSubmit={saveSettings}>
          <div className="section-heading"><div><p className="eyebrow">Fund setup</p><h2>Fund Settings</h2></div></div>
          <label>Fund name<input value={fundForm.fund_name || ""} onChange={(e) => setFundForm({ ...fundForm, fund_name: e.target.value })} required /></label>
          <label>Currency<input value={fundForm.currency || ""} onChange={(e) => setFundForm({ ...fundForm, currency: e.target.value.toUpperCase() })} required /></label>
          <label>Start date<input type="date" value={fundForm.start_date || ""} onChange={(e) => setFundForm({ ...fundForm, start_date: e.target.value })} required /></label>
          <button className="primary-button" disabled={isSubmitting}>Save Settings</button>
        </form>

        <section className="table-card">
          <div className="section-heading"><div><p className="eyebrow">Month control</p><h2>Monthly Close</h2></div><StatusBadge status={closed ? "approved" : "pending"} /></div>
          <p className="muted">Closing a month records that the period was reviewed. It does not delete or alter financial history.</p>
          {closed ? (
            <div className="success-box">
              {monthlyLabel(month, year)} was closed on {new Date(closed.closed_at).toLocaleDateString()}.{" "}
              <button type="button" className="link-button" onClick={() => { if (window.confirm("Reopen this month for corrections?")) onReopenMonth({ month, year }); }}>Reopen month</button>
            </div>
          ) : (
            <button type="button" className="primary-button" onClick={() => { if (window.confirm(`Close ${monthlyLabel(month, year)}? Make sure contributions and withdrawals have been reviewed.`)) onCloseMonth({ month, year }); }}>
              Close {monthlyLabel(month, year)}
            </button>
          )}
        </section>
      </section>

      <section className="table-card">
        <div className="section-heading"><div><p className="eyebrow">Review history</p><h2>Closed Months</h2></div></div>
        {monthlyCloses?.length ? <div className="closed-months">{monthlyCloses.map((item) => <span key={item.id}>{monthlyLabel(item.month, item.year)} · {new Date(item.closed_at).toLocaleDateString()}</span>)}</div> : <p className="muted">No months have been closed yet.</p>}
      </section>

      <section className="table-card">
        <div className="section-heading"><div><p className="eyebrow">Members</p><h2>Family Members</h2></div><button className="primary-button" onClick={() => { setEditingMember(null); setShowMemberDialog(true); }}>Add Member</button></div>
        <p className="muted member-help">Add members here, then copy an invite. They should register using the same email address.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Monthly Target</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>{members.map((member) => <tr key={member.id}><td>{member.name}</td><td>{member.email}</td><td>{formatMoney(member.monthly_target, settings.currency)}</td><td><StatusBadge status={member.role} /></td><td><div className="inline-actions"><button className="secondary-button compact" onClick={() => { setEditingMember(member); setShowMemberDialog(true); }}>Edit</button><button className="secondary-button compact" onClick={() => copyInvite(member)}>Copy Invite</button><button className="reject-button compact" onClick={() => handleDelete(member)} disabled={member.id === currentUser.id}>Remove</button></div></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {showMemberDialog ? <MemberFormDialog key={editingMember?.id || "new"} member={editingMember} onClose={() => setShowMemberDialog(false)} onSubmit={(member) => { onSaveMember(member); setShowMemberDialog(false); }} isSubmitting={isSubmitting} /> : null}
    </div>
  );
}
