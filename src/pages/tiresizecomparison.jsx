import { ArrowRightLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../components/pageheader";
import SaveComparisonModal from "../components/SaveComparisonModal";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useLogTireComparison } from "../hooks/queries/useActivity";
import { usePermissions } from "../context/permissioncontext";
import { PERM } from "../utils/permissions";
import { useTireOptionsQuery } from "../hooks/queries/useTireOptions";
import {
  speedoDifferencePct,
  // tireCircumferenceMm, // hidden: Circumference row is commented out below
  tireDiameterInches,
  treadWidthInches,
} from "../utils/tireMath";

const MOCK_PRESETS = [
  { _id: "t1", label: "Factory Standard", width: 225, aspect: 65, rim: 17 },
  { _id: "t2", label: "Off-Road Package", width: 265, aspect: 70, rim: 17 },
  { _id: "t3", label: "Highway Comfort", width: 215, aspect: 60, rim: 16 },
];

function TireForm({ title, value, onChange, presets }) {
  const applyPreset = (id) => {
    const preset = presets.find((p) => p._id === id);
    if (preset) onChange({ width: preset.width, aspect: preset.aspect, rim: preset.rim });
  };

  return (
    <div className="card tire-form">
      <h3>{title}</h3>
      {/* Reused existing global class: field-mb */}
      <div className="field field-mb">
        <label>Load a saved preset</label>
        <select onChange={(e) => e.target.value && applyPreset(e.target.value)} defaultValue="">
          <option value="">Custom size…</option>
          {presets.map((p) => (
            <option key={p._id} value={p._id}>
              {p.label} — {p.width}/{p.aspect} R{p.rim}
            </option>
          ))}
        </select>
      </div>
      <div className="tire-input-grid">
        <div className="field">
          <label>Width</label>
          <input type="number" value={value.width} onChange={(e) => onChange({ width: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>Aspect</label>
          <input type="number" value={value.aspect} onChange={(e) => onChange({ aspect: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label>Rim</label>
          <input type="number" value={value.rim} onChange={(e) => onChange({ rim: Number(e.target.value) })} />
        </div>
      </div>
      <p className="tire-size-string">
        {value.width}/{value.aspect} R{value.rim}
      </p>
    </div>
  );
}

export default function TireSizeComparison() {
  const location = useLocation();
  const prefill = location.state?.prefillComparison;
  const { data: fetchedPresets, isError: presetsError } = useTireOptionsQuery();
  const presets = presetsError || !fetchedPresets?.length ? MOCK_PRESETS : fetchedPresets;
  const [tireA, setTireA] = useState(prefill?.tireA || { width: 225, aspect: 65, rim: 17 });
  const [tireB, setTireB] = useState(prefill?.tireB || { width: 265, aspect: 70, rim: 17 });

  const update = (setter) => (patch) => setter((prev) => ({ ...prev, ...patch }));

  const logComparison = useLogTireComparison();
  const { can } = usePermissions();
  const [saved, setSaved] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Runs after the popup has saved the comparison (with its vehicle details and
  // customer) to the saved-comparisons collection: logs it to recent activity as
  // before, with the vehicle name leading the summary so the recent-comparisons
  // list shows which vehicle it belongs to.
  const logToRecentActivity = async (savedComparison) => {
    const sizes = `${tireA.width}/${tireA.aspect}R${tireA.rim} vs ${tireB.width}/${tireB.aspect}R${tireB.rim}`;
    await logComparison.mutateAsync({
      tireA,
      tireB,
      diffPct: roundedDiffPct,
      summary: savedComparison?.name ? `${savedComparison.name} — ${sizes}` : sizes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const diameterA = tireDiameterInches(tireA);
  const diameterB = tireDiameterInches(tireB);
  const diffPct = speedoDifferencePct(tireA, tireB);
  const roundedDiffPct = Number(diffPct.toFixed(2));

  const rows = useMemo(
    () => [
      { label: "Overall diameter", a: `${diameterA.toFixed(2)}"`, b: `${diameterB.toFixed(2)}"` },
      // Tread Width = Width ÷ 25.4
      { label: "Tread width", a: `${treadWidthInches(tireA).toFixed(2)}"`, b: `${treadWidthInches(tireB).toFixed(2)}"` },
      // Hidden for now:
      // { label: "Circumference", a: `${tireCircumferenceMm(tireA).toFixed(0)} mm`, b: `${tireCircumferenceMm(tireB).toFixed(0)} mm` },
      // { label: "Sidewall height", a: `${((tireA.width * tireA.aspect) / 100 / 25.4).toFixed(2)}"`, b: `${((tireB.width * tireB.aspect) / 100 / 25.4).toFixed(2)}"` },
    ],
    [tireA, tireB, diameterA, diameterB]
  );

  return (
    <div>
      <PageHeader eyebrow="Tire library" title="Tire Size Comparison" subtitle="Compare two tire specs side by side before approving a swap." />

      <div className="compare-grid">
        <TireForm title="Tire A" value={tireA} onChange={update(setTireA)} presets={presets} />
        <div className="compare-arrow">
          <ArrowRightLeft size={18} />
        </div>
        <TireForm title="Tire B" value={tireB} onChange={update(setTireB)} presets={presets} />
      </div>

      <div className="card compare-result-card">
        <div className="section-title-row mb-4">
          <div />
          {can(PERM.COMPARISON_SAVE) && (
            <button type="button" className="btn btn-ghost" onClick={() => setSaveModalOpen(true)} disabled={logComparison.isPending}>
              <Save size={14} /> {saved ? "Saved!" : logComparison.isPending ? "Saving…" : "Save comparison"}
            </button>
          )}
        </div>
        <div className="wheel-viz">
          <div className="wheel-col">
            <Tire3DVisualizer tire={tireA} label={`Tire A · ${diameterA.toFixed(1)}"`} accent="#FF6F91" height={230} variant="compare" />
          </div>
          <div className="wheel-col">
            <Tire3DVisualizer tire={tireB} label={`Tire B · ${diameterB.toFixed(1)}"`} accent="#8B7CF6" height={230} variant="compare" />
          </div>
        </div>

        <div className={`speedo-banner ${Math.abs(diffPct) > 3 ? "warn" : "ok"}`}>
          Tire B changes overall diameter by <strong>{diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%</strong> vs. Tire A —
          {" "}
          {Math.abs(diffPct) > 3
            ? " outside the ±3% range generally considered safe for speedometer accuracy."
            : " within the typical ±3% safe range for speedometer accuracy."}
        </div>

        <table className="compare-table">
          <thead>
            <tr>
              <th>Spec</th>
              <th>Tire A</th>
              <th>Tire B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="compare-table-label">{r.label}</td>
                <td className="compare-table-value">{r.a}</td>
                <td className="compare-table-value">{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* <TireSuggestions tire={tireA} label="Tire A" />
        <TireSuggestions tire={tireB} label="Tire B" /> */}
      </div>

      {/* Mounted only while open so every "Save comparison" starts a fresh form. */}
      {saveModalOpen && (
        <SaveComparisonModal
          tireA={tireA}
          tireB={tireB}
          diffPct={roundedDiffPct}
          onClose={() => setSaveModalOpen(false)}
          onSaveComparison={logToRecentActivity}
        />
      )}
    </div>
  );
}