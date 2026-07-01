import { useState } from "react";

export default function WithdrawalFormDialog({ members, currentUser, onClose, onSubmit, isSubmitting }) {
  const memberOptions = members.filter((member) => member.role === "member");
  const [form, setForm] = useState({
    requested_by_member_id: currentUser.role === "member" ? currentUser.id : memberOptions[0]?.id || "",
    amount: "",
    reason: ""
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount) });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="dialog-card" onSubmit={handleSubmit}>
        <div className="dialog-header">
          <div>
            <p className="eyebrow">Withdrawal flow</p>
            <h2>Request Withdrawal</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <label>
          Requester name
          <select
            value={form.requested_by_member_id}
            onChange={(event) => updateField("requested_by_member_id", event.target.value)}
            disabled={currentUser.role !== "admin"}
            required
          >
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>

        <label>
          Amount requested
          <input
            type="number"
            min="1"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            placeholder="e.g. 10000"
            required
          />
        </label>

        <label>
          Reason / purpose
          <textarea
            value={form.reason}
            onChange={(event) => updateField("reason", event.target.value)}
            rows="4"
            placeholder="Explain the emergency or family support need"
            required
          />
        </label>

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit Request"}</button>
        </div>
      </form>
    </div>
  );
}
