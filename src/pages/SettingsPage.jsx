import { useEffect, useState } from "react";
import MemberFormDialog from "../components/MemberFormDialog";
import StatusBadge from "../components/StatusBadge";
import { formatMoney } from "../lib/fundUtils";

export default function SettingsPage({ members, currentUser, settings, onSaveMember, onDeleteMember, onSaveSettings, isSubmitting }) {
  const [editingMember, setEditingMember] = useState(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [fundForm, setFundForm] = useState(settings);

  useEffect(() => {
    setFundForm(settings);
  }, [settings]);

  if (currentUser.role !== "admin") {
    return (
      <section className="table-card">
        <h2>Admin only</h2>
        <p className="muted">Members can view fund health, contributions, and withdrawal requests, but cannot change setup data.</p>
      </section>
    );
  }

  function openNewMember(event) {
    event?.preventDefault();
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

  function handleDeleteMember(member) {
    if (member.id === currentUser.id) return;
    const confirmed = window.confirm(
      `Remove ${member.name} from active fund access?\n\nHistorical contributions, withdrawals, and audit records will be kept.`
    );
    if (confirmed) onDeleteMember(member);
  }

  async function copyInviteLink(member) {
    const inviteUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const message = `Hi ${member.name}, you have been added to our FamilyFund Tracker. Open this link and create an account using ${member.email}: ${inviteUrl}`;
    await navigator.clipboard.writeText(message);
    window.alert("Invite message copied. Send it to the member by WhatsApp or email.");
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
            <input value={fundForm.fund_name || ""} onChange={(event) => setFundForm({ ...fundForm, fund_name: event.target.value })} required />
          </label>

          <label>
            Currency
            <input value={fundForm.currency || ""} onChange={(event) => setFundForm({ ...fundForm, currency: event.target.value.toUpperCase() })} required />
          </label>

          <label>
            Start date
            <input
              type="date"
              value={fundForm.start_date || ""}
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
            <button type="button" className="primary-button" onClick={openNewMember} disabled={isSubmitting}>Add Member</button>
          </div>

          <p className="muted member-help">
            Add the member here first, then copy their invite message. They should create an account using the same email address.
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Monthly Target</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td data-label="Name">{member.name}</td>
                    <td data-label="Email">{member.email}</td>
                    <td data-label="Monthly Target">{formatMoney(member.monthly_target, settings.currency)}</td>
                    <td data-label="Role"><StatusBadge status={member.role} /></td>
                    <td data-label="Actions">
                      <div className="inline-actions">
                        <button type="button" className="secondary-button compact" onClick={() => openEditMember(member)} disabled={isSubmitting}>
                          Edit
                        </button>
                        <button type="button" className="secondary-button compact" onClick={() => copyInviteLink(member)} disabled={isSubmitting}>
                          Copy Invite
                        </button>
                        <button
                          type="button"
                          className="reject-button compact"
                          onClick={() => handleDeleteMember(member)}
                          disabled={isSubmitting || member.id === currentUser.id}
                          title={member.id === currentUser.id ? "You cannot remove yourself" : "Remove member"}
                        >
                          Remove
                        </button>
                      </div>
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
          key={editingMember?.id || "new-member"}
          member={editingMember}
          onClose={() => setShowMemberDialog(false)}
          onSubmit={handleMemberSubmit}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
}
