import { useState } from "react";

export default function MemberFormDialog({ member, onClose, onSubmit, isSubmitting }) {
  const [form, setForm] = useState({
    name: member?.name || "",
    email: member?.email || "",
    monthly_target: member?.monthly_target || "",
    role: member?.role || "member"
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...member,
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      monthly_target: Number(form.monthly_target || 0)
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="dialog-card" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <p className="eyebrow">Family setup</p>
            <h2>{member ? "Edit Member" : "Add Member"}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </div>

        <label>
          Name
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required autoFocus />
        </label>

        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
        </label>

        <label>
          Monthly contribution target
          <input
            type="number"
            min="0"
            value={form.monthly_target}
            onChange={(event) => updateField("monthly_target", event.target.value)}
            required
          />
        </label>

        <label>
          Role
          <select value={form.role} onChange={(event) => updateField("role", event.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <p className="muted">
          Saving this member creates or updates their fund profile. It does not automatically create a Supabase Auth account; use Copy Invite after saving.
        </p>

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Member"}</button>
        </div>
      </form>
    </div>
  );
}
