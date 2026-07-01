import { formatMoney } from "../lib/fundUtils";

export default function MonthlyGrowthChart({ data, currency }) {
  if (!data.length) {
    return <div className="empty-state">No growth data yet. Record contributions to start the chart.</div>;
  }

  const width = 760;
  const height = 260;
  const padding = 34;
  const values = data.map((item) => item.balance);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((item.balance - min) / range) * (height - padding * 2);
    return { ...item, x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Fund health</p>
          <h2>Monthly Growth</h2>
        </div>
      </div>

      <div className="chart-scroll">
        <svg className="growth-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly fund balance growth chart">
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
          <polyline points={polyline} />
          {points.map((point) => (
            <g key={`${point.month}-${point.year}`}>
              <circle cx={point.x} cy={point.y} r="5" />
              <text x={point.x} y={height - 8} textAnchor="middle">
                {point.label}
              </text>
              <title>{`${point.label}: ${formatMoney(point.balance, currency)}`}</title>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
