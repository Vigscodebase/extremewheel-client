import { ArrowRightLeft, Save, Calculator } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../components/pageheader";
import SaveComparisonModal from "../components/SaveComparisonModal";
import SavedComparisonsList from "../components/SavedComparisonsList";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useLogTireComparison } from "../hooks/queries/useActivity";
import { usePermissions } from "../context/permissioncontext";
import { PERM } from "../utils/permissions";
// import { useTireOptionsQuery } from "../hooks/queries/useTireOptions"; // hidden: Tire Size Option feature is switched off
import {
  sidewallHeightInches,
  speedoDifferencePct,
  // tireCircumferenceMm, // hidden: Circumference row is commented out below
  tireDiameterInches,
  treadWidthInches,
} from "../utils/tireMath";

// Overall height as the client's worksheet works it out: Tread Width (Width ÷ 25.4) is
// rounded to 2dp first, then Sidewall Height = Tread Width × Aspect Ratio and
// Overall Height = (Sidewall Height × 2) + Diameter, rounded to 2dp at the end.
// Done in hundredths of an inch so ties round up (e.g. 26.755 -> 26.76) without
// floating-point surprises. 225/60 R16 -> 26.63", 245/35 R20 -> 26.76".
function worksheetOverallHeight({ width, aspect, rim }) {
  const treadHundredths = Math.round((width / 25.4) * 100);
  const overallHundredths = Math.round((2 * treadHundredths * aspect) / 100 + rim * 100);
  return overallHundredths / 100;
}

// Hidden: Tire Size Option presets are switched off, so no preset (or mock preset) data is used here.
// const MOCK_PRESETS = [
//   { _id: "t1", label: "Factory Standard", width: 225, aspect: 65, rim: 17 },
//   { _id: "t2", label: "Off-Road Package", width: 265, aspect: 70, rim: 17 },
//   { _id: "t3", label: "Highway Comfort", width: 215, aspect: 60, rim: 16 },
// ];

function TireForm({ title, tag, accent, value, otherValue, onChange /*, presets // hidden: Tire Size Option presets are switched off */ }) {
  // Results for this tire (shown under its own 3D preview).
  // Difference = this tire's overall height minus the other tire's (A = A - B, B = B - A).
  const overallHeight = worksheetOverallHeight(value);
  const heightDiff = Number((overallHeight - worksheetOverallHeight(otherValue)).toFixed(2));
  const rows = [
    // Overall Height = (Sidewall Height × 2) + Diameter
    { label: "Overall height", value: `${overallHeight.toFixed(2)}"` },
    // Tread Width = Width ÷ 25.4
    { label: "Tread width", value: `${treadWidthInches(value).toFixed(2)}"` },
    // Sidewall Height = Tread Width × Aspect Ratio
    { label: "Sidewall height", value: `${sidewallHeightInches(value).toFixed(2)}"` },
    // Difference comparison across entries
    { label: "Difference", value: `${heightDiff.toFixed(2)}"`, diff: true },
  ];

  // Hidden: "Load a saved preset" is switched off.
  // const applyPreset = (id) => {
  //   const preset = presets.find((p) => p._id === id);
  //   if (preset) onChange({ width: preset.width, aspect: preset.aspect, rim: preset.rim });
  // };

  return (
    <div className="card tiresize-comparison-card tire-form">
      <h3 className="comparison-tire-ab">{title}</h3>
      <h3 className="input-tire-size">
        <Calculator size={16} className="icon-inline" />
        Input Tire Size
      </h3>
      {/* Hidden: "Load a saved preset" (Tire Size Option presets are switched off)
      Reused existing global class: field-mb
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
      */}
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
      {/* <p className="tire-size-string">
        {value.width}/{value.aspect} R{value.rim}
      </p> */}

      {/* Same pairing as the Tire Size Calculator: 3D tire next to its specs table. */}
      <div className="tire-form-results">
        <div className="tire-form-viz">
          <Tire3DVisualizer tire={value} label={`${tag} · ${tireDiameterInches(value).toFixed(1)}"`} accent={accent} height={230} variant="compare" />
        </div>
        <div className="table-responsive">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Spec</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="compare-table-label">{r.label}</td>
                  <td className={`compare-table-value${r.diff ? " compare-table-diff" : ""}`}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TireSizeComparison() {
  const location = useLocation();
  const prefill = location.state?.prefillComparison;
  // Hidden: no Tire Size Option data is fetched or checked any more.
  // const { data: fetchedPresets, isError: presetsError } = useTireOptionsQuery();
  // const presets = presetsError || !fetchedPresets?.length ? MOCK_PRESETS : fetchedPresets;
  const [tireA, setTireA] = useState(prefill?.tireA || { width: 225, aspect: 65, rim: 17 });
  const [tireB, setTireB] = useState(prefill?.tireB || { width: 265, aspect: 70, rim: 17 });

  const update = (setter) => (patch) => setter((prev) => ({ ...prev, ...patch }));

  // "Apply" on a row of the Saved comparisons table: load that comparison's two
  // tires into the form above and scroll back up to it. Bumping `applyKey`
  // remounts the two TireForms so their "Load a saved preset" dropdowns drop
  // back to "Custom size…" instead of still naming a preset that no longer
  // matches the numbers.
  const topRef = useRef(null);
  const [applyKey, setApplyKey] = useState(0);
  const [appliedFrom, setAppliedFrom] = useState(null);
  const toTire = (t) => ({ width: Number(t.width), aspect: Number(t.aspect), rim: Number(t.rim) });
  const applySavedComparison = (savedA, savedB, row) => {
    setTireA(toTire(savedA));
    setTireB(toTire(savedB));
    setApplyKey((k) => k + 1);
    setAppliedFrom({ name: row?.name || "saved comparison", at: Date.now() });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {
    if (!appliedFrom) return undefined;
    const timer = setTimeout(() => setAppliedFrom(null), 5000);
    return () => clearTimeout(timer);
  }, [appliedFrom]);

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

  const diffPct = speedoDifferencePct(tireA, tireB);
  const roundedDiffPct = Number(diffPct.toFixed(2));

  return (
    <div ref={topRef}>
      <PageHeader eyebrow="Tire library" title="Tire Size Comparison" subtitle="Compare two tire specs side by side before approving a swap." />

      {appliedFrom && (
        <div className="speedo-banner ok" role="status">
          Loaded <strong>{appliedFrom.name}</strong> into the comparison: {tireA.width}/{tireA.aspect} R{tireA.rim} vs {tireB.width}/{tireB.aspect} R{tireB.rim}.
        </div>
      )}

      <div className="compare-grid">
        <TireForm key={`a-${applyKey}`} title="Tire size A" tag="Tire A" accent="#FF6F91" value={tireA} otherValue={tireB} onChange={update(setTireA)} /* presets={presets} // hidden: Tire Size Option presets are switched off */ />
        <div className="compare-arrow">
          <ArrowRightLeft size={18} />
        </div>
        <TireForm key={`b-${applyKey}`} title="Tire size B" tag="Tire B" accent="#8B7CF6" value={tireB} otherValue={tireA} onChange={update(setTireB)} /* presets={presets} // hidden: Tire Size Option presets are switched off */ />
      </div>

      {/* Speedometer note sits right below the two Tire boxes. */}
      <div className={`speedo-banner ${Math.abs(diffPct) > 3 ? "warn" : "ok"}`}>
        Tire B changes overall diameter by <strong>{diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%</strong> vs. Tire A —
        {" "}
        {Math.abs(diffPct) > 3
          ? " outside the ±3% range generally considered safe for speedometer accuracy."
          : " within the typical ±3% safe range for speedometer accuracy."}
      </div>

      <div className="section-title-row mb-4">
        <div />
        {/* {can(PERM.COMPARISON_SAVE) && (
          <button type="button" className="btn btn-ghost" onClick={() => setSaveModalOpen(true)} disabled={logComparison.isPending}>
            <Save size={14} /> {saved ? "Saved!" : logComparison.isPending ? "Saving…" : "Save comparison"}
          </button>
        )} */}
      </div>

      {/* <TireSuggestions tire={tireA} label="Tire A" />
      <TireSuggestions tire={tireB} label="Tire B" /> */}

      {/* Details listing of every saved comparison, with search + filters (same as Vehicle Notes) and an Apply button per row. */}
      {/* <SavedComparisonsList onApply={applySavedComparison} /> */}

      {/* Mounted only while open so every "Save comparison" starts a fresh form. */}
      {/* {saveModalOpen && (
        <SaveComparisonModal
          tireA={tireA}
          tireB={tireB}
          diffPct={roundedDiffPct}
          onClose={() => setSaveModalOpen(false)}
          onSaveComparison={logToRecentActivity}
        />
      )} */}
    </div>
  );
}