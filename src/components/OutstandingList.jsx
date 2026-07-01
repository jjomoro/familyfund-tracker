import { formatMoney } from "../lib/fundUtils";
import StatusBadge from "./StatusBadge";

export default function OutstandingList({ items, currency }) {
  return (
    <section className="card-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Current month</p>
          <h2>Outstanding Contributions</h2>
        </div>
      </div>

      {items.length ? (
        <ul className="outstanding-list">
          {items.map((item) => (
            <li key={item.member.id}>
              <div>
                <strong>{item.member.name}</strong>
                <span>Paid {formatMoney(item.paid, currency)} of {formatMoney(item.member.monthly_target, currency)}</span>
              </div>
              <div>
                <strong>{formatMoney(item.owed, currency)}</strong>
                <StatusBadge status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state success">Everyone is fully paid for the current month.</div>
      )}
    </section>
  );
}
