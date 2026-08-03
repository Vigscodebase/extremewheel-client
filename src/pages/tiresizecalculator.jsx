import { Calculator, Gauge, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useLogTireComparison } from "../hooks/queries/useActivity";
import { useTireOptionsQuery } from "../hooks/queries/useTireOptions";
import {
  equivalentInchSize,
  revsPerMile,
  sidewallHeightInches,
  speedoDifferencePct,
  speedometerErrorTable,
  tireCircumferenceMm,
  tireDiameterInches,
  tireWidthInches,
} from "../utils/tireMath";

const MOCK_PRESETS = [
  { _id: "t1", label: "Factory Standard", width: 225, aspect: 65, rim: 17 },
  { _id: "t2", label: "Off-Road Package", width: 265, aspect: 70, rim: 17 },
  { _id: "t3", label: "Highway Comfort", width: 215, aspect: 60, rim: 16 },
];

const SPEED_READINGS = [20, 30, 40, 50, 60, 70, 80, 90];

function specRows(tire) {
  return {
    diameter: tireDiameterInches(tire),
    width: tireWidthInches(tire),
    sidewall: sidewallHeightInches(tire),
    circumference: tireCircumferenceMm(tire) / 25.4,
    revsPerMile: revsPerMile(tire),
  };
}

export default function TireSizeCalculator() {
  const { data: fetchedPresets, isError: presetsError } = useTireOptionsQuery();
  const presets = presetsError || !fetchedPresets?.length ? MOCK_PRESETS : fetchedPresets;
  const logComparison = useLogTireComparison();

  const [tire, setTire] = useState({ width: 265, aspect: 70, rim: 17 });
  const [unit, setUnit] = useState("in"); // "in" | "mm" for the results table
  const [convertOpen, setConvertOpen] = useState(false);
  const [targetRim, setTargetRim] = useState(18);
  const [logged, setLogged] = useState(false);

  const applyPreset = (id) => {
    const preset = presets.find((p) => p._id === id);
    if (preset) setTire({ width: preset.width, aspect: preset.aspect, rim: preset.rim });
  };

  const spec = useMemo(() => specRows(tire), [tire]);

  // "Convert to Different Wheel Size?" — keep the same sidewall aspect
  // ratio (typical shop approach) and recompute against the new rim.
  const convertedTire = useMemo(() => ({ ...tire, rim: Number(targetRim) || tire.rim }), [tire, targetRim]);
  const convertedSpec = useMemo(() => specRows(convertedTire), [convertedTire]);
  const diffPct = useMemo(() => speedoDifferencePct(tire, convertedTire), [tire, convertedTire]);
  const speedoTable = useMemo(() => speedometerErrorTable(tire, convertedTire, SPEED_READINGS), [tire, convertedTire]);

  // Alternate sizes — presets whose overall diameter falls within ±1" of
  // the entered size, sorted by closeness (mirrors tiresize.com's
  // "alternate tire sizes within 1 inch" suggestion using our own preset
  // library instead of a full manufacturer database).
  const alternates = useMemo(() => {
    const target = tireDiameterInches(tire);
    return presets
      .map((p) => ({ ...p, diameter: tireDiameterInches(p) }))
      .filter((p) => Math.abs(p.diameter - target) <= 1 && !(p.width === tire.width && p.aspect === tire.aspect && p.rim === tire.rim))
      .sort((a, b) => Math.abs(a.diameter - target) - Math.abs(b.diameter - target));
  }, [presets, tire]);

  const fmt = (inches) => (unit === "mm" ? `${(inches * 25.4).toFixed(1)} mm` : `${inches.toFixed(2)}"`);

  const handleConvertClick = async () => {
    const opening = !convertOpen;
    setConvertOpen(opening);
    if (opening && !logged) {
      try {
        await logComparison.mutateAsync({
          tireA: tire,
          tireB: convertedTire,
          diffPct: Number(diffPct.toFixed(2)),
          summary: `${tire.width}/${tire.aspect}R${tire.rim} → ${convertedTire.width}/${convertedTire.aspect}R${convertedTire.rim}`,
        });
        setLogged(true);
      } catch {
        // Logging is best-effort — never block the calculator on it.
      }
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Tire Size Calculator"
        subtitle="Calculate metric tire specs, convert to a different wheel size, and see alternate size suggestions."
      />

      <div className="card tire-calculator-form">
        <h3>
          <Calculator size={16} className="icon-inline" />
          Tire Size
        </h3>
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
            <label>Width (mm)</label>
            <input type="number" value={tire.width} onChange={(e) => { setTire((t) => ({ ...t, width: Number(e.target.value) })); setLogged(false); }} />
          </div>
          <div className="field">
            <label>Aspect (%)</label>
            <input type="number" value={tire.aspect} onChange={(e) => { setTire((t) => ({ ...t, aspect: Number(e.target.value) })); setLogged(false); }} />
          </div>
          <div className="field">
            <label>Rim (in)</label>
            <input type="number" value={tire.rim} onChange={(e) => { setTire((t) => ({ ...t, rim: Number(e.target.value) })); setLogged(false); }} />
          </div>
        </div>
        <p className="tire-size-string">
          {tire.width}/{tire.aspect} R{tire.rim} · equivalent inch size ≈ {equivalentInchSize(tire)}
        </p>

        <div className="range-toggle mt-10">
          <button type="button" className={unit === "in" ? "active" : ""} onClick={() => setUnit("in")}>inches</button>
          <button type="button" className={unit === "mm" ? "active" : ""} onClick={() => setUnit("mm")}>mm</button>
        </div>
      </div>

      <div className="card compare-result-card">
        <div className="wheel-viz">
          <Tire3DVisualizer tire={tire} label={`${tire.width}/${tire.aspect}R${tire.rim}`} accent="#FF6F91" height={240} variant="calculator" />
        </div>

        <table className="compare-table">
          <thead>
            <tr>
              <th>Spec</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="compare-table-label">Diameter</td><td className="compare-table-value">{fmt(spec.diameter)}</td></tr>
            <tr><td className="compare-table-label">Width</td><td className="compare-table-value">{fmt(spec.width)}</td></tr>
            <tr><td className="compare-table-label">Sidewall</td><td className="compare-table-value">{fmt(spec.sidewall)}</td></tr>
            <tr><td className="compare-table-label">Circumference</td><td className="compare-table-value">{fmt(spec.circumference)}</td></tr>
            <tr><td className="compare-table-label">Revs / mile</td><td className="compare-table-value">{spec.revsPerMile.toFixed(0)}</td></tr>
          </tbody>
        </table>

        <TireSuggestions tire={tire} />
      </div>

      <div className="card">
        <div className={`section-title-row${convertOpen ? "" : " tight"}`}>
          <div>
            <h3>Convert to a different wheel size?</h3>
            <p>Keeps the same aspect ratio and shows the speedometer effect of the swap.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleConvertClick}>
            <RefreshCw size={14} /> {convertOpen ? "Hide" : "Calculate"}
          </button>
        </div>

        {convertOpen && (
          <>
            <div className="tire-input-grid narrow">
              <div className="field">
                <label>New rim (in)</label>
                <input type="number" value={targetRim} onChange={(e) => setTargetRim(e.target.value)} />
              </div>
            </div>

            <div className="wheel-viz">
              <div className="wheel-col">
                <Tire3DVisualizer tire={tire} label={`Current · ${tire.width}/${tire.aspect}R${tire.rim}`} accent="#FF6F91" height={220} variant="calculator" />
              </div>
              <div className="wheel-col">
                <Tire3DVisualizer tire={convertedTire} label={`New · ${convertedTire.width}/${convertedTire.aspect}R${convertedTire.rim}`} accent="#8B7CF6" height={220} variant="calculator" />
              </div>
            </div>

            <div className={`speedo-banner ${Math.abs(diffPct) > 3 ? "warn" : "ok"}`}>
              New size changes overall diameter by <strong>{diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%</strong> vs. current —
              {" "}
              {Math.abs(diffPct) > 3
                ? " outside the ±3% range generally considered safe for speedometer accuracy."
                : " within the typical ±3% safe range for speedometer accuracy."}
            </div>

            <table className="compare-table">
              <thead>
                <tr><th>Spec</th><th>Current</th><th>New</th></tr>
              </thead>
              <tbody>
                <tr><td className="compare-table-label">Diameter</td><td className="compare-table-value">{fmt(spec.diameter)}</td><td className="compare-table-value">{fmt(convertedSpec.diameter)}</td></tr>
                <tr><td className="compare-table-label">Width</td><td className="compare-table-value">{fmt(spec.width)}</td><td className="compare-table-value">{fmt(convertedSpec.width)}</td></tr>
                <tr><td className="compare-table-label">Sidewall</td><td className="compare-table-value">{fmt(spec.sidewall)}</td><td className="compare-table-value">{fmt(convertedSpec.sidewall)}</td></tr>
                <tr><td className="compare-table-label">Circumference</td><td className="compare-table-value">{fmt(spec.circumference)}</td><td className="compare-table-value">{fmt(convertedSpec.circumference)}</td></tr>
                <tr><td className="compare-table-label">Revs / mile</td><td className="compare-table-value">{spec.revsPerMile.toFixed(0)}</td><td className="compare-table-value">{convertedSpec.revsPerMile.toFixed(0)}</td></tr>
              </tbody>
            </table>

            <h4 className="subheading-spaced">
              <Gauge size={14} className="icon-inline-sm" />
              Speedometer error
            </h4>
            <table className="compare-table">
              <thead>
                <tr><th>Reading (mph)</th>{speedoTable.map((r) => <th key={r.reading}>{r.reading}</th>)}</tr>
              </thead>
              <tbody>
                <tr>
                  <td className="compare-table-label">Actual speed</td>
                  {speedoTable.map((r) => <td key={r.reading} className="compare-table-value">{r.actual}</td>)}
                </tr>
              </tbody>
            </table>

            <TireSuggestions tire={convertedTire} label="new wheel size" />
          </>
        )}
      </div>

      <div className="card alternate-tire-size">
        <h3 className="mb-10">Alternate tire sizes (within 1" diameter)</h3>
        {alternates.length === 0 ? (
          <p className="text-muted">No saved presets fall within 1" of this size yet — add more in Tire Size Option.</p>
        ) : (
          <div className="preset-grid">
            {alternates.map((a) => (
              <div key={a._id} className="card preset-card cursor-pointer" onClick={() => setTire({ width: a.width, aspect: a.aspect, rim: a.rim })}>
                <div>
                  <p className="preset-label">{a.label}</p>
                  <p className="preset-size">{a.width}/{a.aspect} R{a.rim}</p>
                  <p className="preset-diameter">≈ {a.diameter.toFixed(1)}" diameter</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
