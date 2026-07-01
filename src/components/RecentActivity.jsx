import { formatMoney } from "../lib/fundUtils";
import StatusBadge from "./StatusBadge";

export default function RecentActivity({ items, currency }) {
  return (
    <section className="card-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h2>Recent Activity</h2>
        </div>
      </div>

      {items.length ? (
        <ul className="activity-list">
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
                <small>{new Date(item.created_at).toLocaleString()}</small>
              </div>
              <div className="activity-meta">
                <strong>{formatMoney(item.amount, currency)}</strong>
                <StatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">No recent activity yet.</div>
      )}
    </section>
  );
}
