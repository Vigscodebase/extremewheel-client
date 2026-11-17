/*
 * DonutChart
 *
 * Why the old version showed a notch at 12 o'clock:
 * every slice was a full <circle> clipped with stroke-dasharray. A circle is a
 * *closed* path, and the Guest slice ends exactly where the path closes (the
 * 12 o'clock point, where Admin also starts). The browser's stroker puts a
 * join there and floating-point error makes the last dash overrun or bevel,
 * which shows up as a small jagged step on the seam.
 *
 * Fix: draw each slice as its own open arc <path> (butt caps, no closed-path
 * seam). Every slice except the last is extended a hair so the next slice
 * paints over it, which also removes any anti-aliasing hairline between slices.
 */
const OVERLAP_PX = 0.5;

function polar(cx, cy, r, angle) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const [x0, y0] = polar(cx, cy, r, startAngle);
  const [x1, y1] = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`;
}

export default function DonutChart({ data, size = 150, thickness = 20 }) {
  const sum = data.reduce((s, d) => s + d.value, 0);
  const total = sum || 1;
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const overlap = OVERLAP_PX / radius; // radians

  // Only slices with a value; pure reduce keeps render free of mutation.
  const visible = data.filter((d) => d.value > 0);
  const slices = visible.reduce((acc, d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const start = acc.length ? acc[acc.length - 1].end : -Math.PI / 2; // 12 o'clock
    const end = start + sweep;
    const isLast = i === visible.length - 1;
    return [...acc, { ...d, start, end, drawEnd: isLast ? end : end + overlap, sweep }];
  }, []);

  return (
    <div className="donut-chart-container">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="geometricPrecision"
      >
        {/* track */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#F1F1F5" strokeWidth={thickness} />

        {slices.map((d) =>
          // A single slice at 100% can't be drawn as one arc (start === end), so use a circle.
          slices.length === 1 ? (
            <circle
              key={d.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
            />
          ) : (
            <path
              key={d.label}
              d={arcPath(center, center, radius, d.start, d.drawEnd)}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
            />
          )
        )}

        <text x="50%" y="48%" textAnchor="middle" className="donut-chart-total-val">
          {sum}
        </text>
        <text x="50%" y="63%" textAnchor="middle" className="donut-chart-total-label">
          total
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <div key={d.label} className="donut-legend-item">
            <span className="donut-legend-swatch" style={{ "--swatch-color": d.color }} />
            <span className="donut-legend-label">{d.label}</span>
            <strong className="donut-legend-value">{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
