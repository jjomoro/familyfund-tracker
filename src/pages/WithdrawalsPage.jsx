import { useState } from "react";
import WithdrawalFormDialog from "../components/WithdrawalFormDialog";
import StatusBadge from "../components/StatusBadge";
import { formatMoney, getMemberById } from "../lib/fundUtils";

export default function WithdrawalsPage({ members, currentUser, withdrawals, settings, onSubmitWithdrawal, onReviewWithdrawal, isSubmitting }) {
  const [showForm, setShowForm] = useState(false);
  const visibleWithdrawals = currentUser.role === "admin"
    ? withdrawals
    : withdrawals.filter((withdrawal) => withdrawal.requested_by_member_id === currentUser.id);
  const sortedWithdrawals = [...visibleWithdrawals].sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at));

  function handleSubmit(payload) {
    onSubmitWithdrawal(payload);
    setShowForm(false);
  }

  function reject(withdrawal) {
    const note = window.prompt("Optional rejection note:", withdrawal.rejection_note || "");
    onReviewWithdrawal(withdrawal.id, "rejected", note || "");
  }

  return (
    <div className="page-stack">
      <section className="table-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Emergency access</p>
            <h2>Withdrawal Requests</h2>
          </div>
          <button type="button" className="primary-button" onClick={() => setShowForm(true)}>
            Request Withdrawal
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Requested</th>
                {currentUser.role === "admin" ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedWithdrawals.map((withdrawal) => {
                const requester = getMemberById(members, withdrawal.requested_by_member_id);
                return (
                  <tr key={withdrawal.id}>
                    <td>{requester?.name || "Unknown member"}</td>
                    <td>{formatMoney(withdrawal.amount, settings.currency)}</td>
                    <td>
                      {withdrawal.reason}
                      {withdrawal.rejection_note ? <small className="note-block">Note: {withdrawal.rejection_note}</small> : null}
                    </td>
                    <td><StatusBadge status={withdrawal.status} /></td>
                    <td>{new Date(withdrawal.requested_at).toLocaleDateString()}</td>
                    {currentUser.role === "admin" ? (
                      <td>
                        {withdrawal.status === "pending" ? (
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="approve-button"
                              onClick={() => onReviewWithdrawal(withdrawal.id, "approved")} disabled={isSubmitting}
                            >
                              Approve
                            </button>
                            <button type="button" className="reject-button" onClick={() => reject(withdrawal)}>
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="muted">Reviewed</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {showForm ? (
        <WithdrawalFormDialog
          members={members}
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </div>
  );
}
