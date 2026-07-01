import { useState } from "react";
import MemberFormDialog from "../components/MemberFormDialog";
import StatusBadge from "../components/StatusBadge";
import { formatMoney } from "../lib/fundUtils";

export default function SettingsPage({ members, currentUser, settings, onSaveMember, onSaveSettings, isSubmitting }) {
  const [editingMember, setEditingMember] = useState(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [fundForm, setFundForm] = useState(settings);

  if (currentUser.role !== "admin") {
    return (
      <section className="table-card">
        <h2>Admin only</h2>
        <p className="muted">Members can view fund health, contributions, and withdrawal requests, but cannot change setup data.</p>
      </section>
    );
  }

  function openNewMember() {
    setEditingMember(null);
    setShowMemberDialog(true);
  }

  function openEditMember(member) {
    setEditingMember(member);
    setShowMemberDialog(true);
  }

  function handleMemberSubmit(member) {
    onSaveMember(member);
    setShowMemberDialog(false);
  }

  function handleFundSubmit(event) {
    event.preventDefault();
    onSaveSettings(fundForm);
  }

  return (
    <div className="page-stack">
      <section className="settings-grid">
        <form className="table-card settings-form" onSubmit={handleFundSubmit}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fund setup</p>
              <h2>Fund Settings</h2>
            </div>
          </div>

          <label>
            Fund name
            <input value={fundForm.fund_name} onChange={(event) => setFundForm({ ...fundForm, fund_name: event.target.value })} required />
          </label>

          <label>
            Currency
            <input value={fundForm.currency} onChange={(event) => setFundForm({ ...fundForm, currency: event.target.value.toUpperCase() })} required />
          </label>

          <label>
            Start date
            <input
              type="date"
              value={fundForm.start_date}
              onChange={(event) => setFundForm({ ...fundForm, start_date: event.target.value })}
              required
            />
          </label>

          <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Settings"}</button>
        </form>

        <section className="table-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Members</p>
              <h2>Family Members</h2>
            </div>
            <button type="button" className="primary-button" onClick={openNewMember}>Add Member</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Monthly Target</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{formatMoney(member.monthly_target, settings.currency)}</td>
                    <td><StatusBadge status={member.role} /></td>
                    <td>
                      <button type="button" className="secondary-button compact" onClick={() => openEditMember(member)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {showMemberDialog ? (
        <MemberFormDialog
          member={editingMember}
          onClose={() => setShowMemberDialog(false)}
          onSubmit={handleMemberSubmit}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
}
