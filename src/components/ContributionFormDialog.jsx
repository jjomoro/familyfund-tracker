import { useState } from "react";
import { monthNames } from "../lib/fundUtils";

export default function ContributionFormDialog({ members, onClose, onSubmit, isSubmitting, currentYear = new Date().getFullYear() }) {
  const memberOptions = members.filter((member) => member.role === "member");
  const now = new Date();
  const [form, setForm] = useState({
    member_id: memberOptions[0]?.id || "",
    amount: "",
    month: now.getMonth() + 1,
    year: currentYear
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount), month: Number(form.month), year: Number(form.year) });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="dialog-card" onSubmit={handleSubmit}>
        <div className="dialog-header">
          <div>
            <p className="eyebrow">Admin action</p>
            <h2>Record Contribution</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <label>
          Member
          <select value={form.member_id} onChange={(event) => updateField("member_id", event.target.value)} required>
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>

        <label>
          Amount paid
          <input
            type="number"
            min="1"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            placeholder="e.g. 5000"
            required
          />
        </label>

        <div className="form-grid">
          <label>
            Month covered
            <select value={form.month} onChange={(event) => updateField("month", event.target.value)}>
              {monthNames.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
          </label>
          <label>
            Year
            <input
              type="number"
              min="2020"
              value={form.year}
              onChange={(event) => updateField("year", event.target.value)}
              required
            />
          </label>
        </div>

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Contribution"}</button>
        </div>
      </form>
    </div>
  );
}
