// Small dependency-free SVG line/area chart. Package.json has no chart
// library installed, so this keeps the bundle lean instead of pulling in
// recharts/chart.js for a handful of points.
export default function AreaLineChart({ data, width = 560, height = 200, color = "#FF6F91" }) {
  if (!data || data.length === 0) return null;

  const padding = { top: 16, right: 12, bottom: 26, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const max = Math.max(...values) * 1.15 || 1;
  const min = Math.min(0, ...values);

  const x = (i) => padding.left + (i / (data.length - 1 || 1)) * innerW;
  const y = (v) => padding.top + innerH - ((v - min) / (max - min || 1)) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`;

  const gradientId = `area-fill-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Trend chart">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={padding.left} x2={width - padding.right} y1={padding.top + innerH * t} y2={padding.top + innerH * t} stroke="#EFEFF4" strokeWidth="1" />
      ))}

      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {data.map((d, i) => (
        <circle key={d.label} cx={x(i)} cy={y(d.value)} r={i === data.length - 1 ? 4.5 : 3} fill="#fff" stroke={color} strokeWidth="2" />
      ))}

      {data.map((d, i) => (
        <text key={d.label} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10.5" fill="#A9ACBD" fontFamily="Inter, sans-serif">
          {d.label}
        </text>
      ))}
    </svg>
  );
}
