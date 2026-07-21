export default function DonutChart({ data, size = 150, thickness = 20 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Precompute each slice's dash length + cumulative offset via a pure
  // reduce (no mutable variables in the render body) up front so nothing
  // gets reassigned while mapping to JSX below.
  const slices = data.reduce((acc, d) => {
    const frac = d.value / total;
    const dash = frac * circumference;
    const gap = circumference - dash;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    return [...acc, { ...d, dash, gap, offset }];
  }, []);

  return (
    <div className="donut-chart-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F1F5" strokeWidth={thickness} />
          {slices.map((d) => (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${d.dash} ${d.gap}`}
              strokeDashoffset={-d.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text x="50%" y="48%" textAnchor="middle" className="donut-chart-total-val">
          {total}
        </text>
        <text x="50%" y="63%" textAnchor="middle" className="donut-chart-total-label">
          total
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <div key={d.label} className="donut-legend-item">
            <span className="donut-legend-swatch" style={{ background: d.color }} />
            <span className="donut-legend-label">{d.label}</span>
            <strong className="donut-legend-value">{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}