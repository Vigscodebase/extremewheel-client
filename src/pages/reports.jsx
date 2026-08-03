import { Car, Download, FileBarChart, Scale, SlidersHorizontal, Search } from "lucide-react";
import { useState } from "react";
import PageHeader from "../components/pageheader";
import { useDownloadReportCsv, useReportsSummary } from "../hooks/queries/useReports";

const REPORT_TYPES = [
  { type: "vehicles", label: "Vehicles added", icon: Car, tint: { soft: "var(--color-amber-dark)", solid: "var(--color-pink-soft)" } },
  { type: "tire-comparisons", label: "Tire comparisons", icon: Scale, tint: { soft: "var(--color-sidebar)", solid: "var(--color-pink-soft)" } },
  { type: "vehicle-searches", label: "Vehicle searches", icon: Search, tint: { soft: "var(--color-muted)", solid: "var(--color-pink-soft)" } },
  { type: "tire-options", label: "Tire presets added", icon: SlidersHorizontal, tint: { soft: "var(--color-pink)", solid: "var(--color-pink-soft)" } },
];

const SUMMARY_KEY = {
  vehicles: "vehiclesAdded",
  "tire-comparisons": "tireComparisons",
  "vehicle-searches": "vehicleSearches",
  "tire-options": "tirePresetsAdded",
};

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

export default function Reports() {
  const [today] = useState(() => new Date());
  const [monthAgo] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [from, setFrom] = useState(() => toDateInputValue(monthAgo));
  const [to, setTo] = useState(() => toDateInputValue(today));

  const { data: summary, isLoading } = useReportsSummary({ from, to });
  const downloadCsv = useDownloadReportCsv();

  const applyQuickRange = (days) => {
    setFrom(toDateInputValue(new Date(Date.now() - days * 24 * 60 * 60 * 1000)));
    setTo(toDateInputValue(today));
  };

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="Reporting & Data Export"
        subtitle="Pick a date range, review activity, and export any category to CSV."
      />

      <div className="card tire-form mb-20">
        <h3>
          <FileBarChart size={16} className="icon-inline" />
          Date range
        </h3>
        <div className="tire-input-grid">
          <div className="field">
            <label>From</label>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="range-toggle mt-10">
          <button type="button" onClick={() => applyQuickRange(7)}>Last 7 days</button>
          <button type="button" onClick={() => applyQuickRange(30)}>Last 30 days</button>
          <button type="button" onClick={() => applyQuickRange(90)}>Last 90 days</button>
        </div>
      </div>

      <div className="kpi-grid">
        {REPORT_TYPES.map(({ type, label, icon: Icon, tint }) => (
          <div key={type} className="card kpi-card">
            <div className="kpi-icon" style={{ "--kpi-icon-bg": tint.soft, "--kpi-icon-fg": tint.solid }}>
              <Icon size={19} />
            </div>
            <div>
              <p className="kpi-value">{isLoading ? "…" : summary?.[SUMMARY_KEY[type]] ?? 0}</p>
              <p className="kpi-label">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-20">
        <h3 className="mb-4">Export to CSV</h3>
        <p className="text-muted mb-16">
          Downloads are scoped to the date range selected above.
        </p>
        <div className="preset-grid">
          {REPORT_TYPES.map(({ type, label }) => (
            <div key={type} className="card preset-card">
              <div>
                <p className="preset-label">{label}</p>
                <p className="preset-size">{summary?.[SUMMARY_KEY[type]] ?? 0} record(s) in range</p>
              </div>
              <div className="preset-actions">
                <button
                  type="button"
                  className="icon-btn"
                  title={`Download ${label} CSV`}
                  onClick={() => downloadCsv.mutate({ type, from, to })}
                  disabled={downloadCsv.isPending}
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
