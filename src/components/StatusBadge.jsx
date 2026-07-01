const labels = {
  paid: "Paid",
  partial: "Partial",
  outstanding: "Outstanding",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  admin: "Admin",
  member: "Member"
};

export default function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();
  return <span className={`status-badge status-${normalized}`}>{labels[normalized] || status}</span>;
}
