import { useState } from "react";
import { monthNames } from "../lib/fundUtils";

export default function MpesaPaymentDialog({ currentUser, settings, contributions, onClose, onSubmit, isSubmitting }) {
  const now = new Date();
  const [form, setForm] = useState({
    amount: "",
    transaction_reference: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    payment_date: now.toISOString().slice(0, 10)
  });

  const verifiedPaid = contributions
    .filter(c => c.member_id === currentUser.id && c.verification_status === "verified" && Number(c.month) === Number(form.month) && Number(c.year) === Number(form.year))
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const remaining = Math.max(Number(currentUser.monthly_target || 0) - verifiedPaid, 0);

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  function submit(event) {
    event.preventDefault();
    onSubmit({ ...form, amount: Number(form.amount), month: Number(form.month), year: Number(form.year) });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="dialog-card" onSubmit={submit}>
        <div className="dialog-header">
          <div><p className="eyebrow">Member payment</p><h2>Submit M-Pesa Payment</h2></div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </div>
        <div className="success-box">
          After sending the money through M-Pesa, enter the transaction code from the confirmation SMS. An admin will verify the payment before it changes the fund balance.
        </div>
        <label>
          Amount paid ({settings.currency})
          <input type="number" min="1" value={form.amount} onChange={e => update("amount", e.target.value)} placeholder="e.g. 5000" required />
        </label>
        <label>
          M-Pesa transaction code
          <input value={form.transaction_reference} onChange={e => update("transaction_reference", e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="e.g. QGH7K82L9" maxLength={32} required />
          <small className="muted">Enter the transaction code exactly as shown in the M-Pesa confirmation.</small>
        </label>
        <div className="form-grid">
          <label>
            Contribution month
            <select value={form.month} onChange={e => update("month", e.target.value)}>
              {monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </label>
          <label>
            Year
            <input type="number" min="2020" max="2100" value={form.year} onChange={e => update("year", e.target.value)} required />
          </label>
        </div>
        <label>
          Payment date
          <input type="date" value={form.payment_date} onChange={e => update("payment_date", e.target.value)} required />
        </label>
        <div className="payment-preview">
          <span>Current verified balance for this month</span>
          <strong>{settings.currency} {verifiedPaid.toLocaleString()}</strong>
          <small>{remaining > 0 ? `${settings.currency} ${remaining.toLocaleString()} remaining against your target` : "Monthly target already covered"}</small>
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit Payment"}</button>
        </div>
      </form>
    </div>
  );
}
