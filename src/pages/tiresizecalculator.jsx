import { Calculator, Gauge, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "../components/pageheader";
import { useLogTireComparison } from "../hooks/queries/useActivity";
import {
  sidewallHeightInches,
  speedoDifferencePct,
  speedometerErrorTable,
  tireOverallHeightInches,
  tireWidthInches,
} from "../utils/tireMath";

const SPEED_READINGS = [20, 30, 40, 50, 60, 70, 80, 90];

function specRows(tire) {
  return {
    overallHeight: tireOverallHeightInches(tire),
    width: tireWidthInches(tire),
    sidewall: sidewallHeightInches(tire),
  };
}

const fmt = (inches) => `${inches.toFixed(2)}"`;

export default function TireSizeCalculator() {
  const logComparison = useLogTireComparison();

  const [tire, setTire] = useState({ width: 265, aspect: 70, rim: 17 });
  const [convertOpen, setConvertOpen] = useState(true);
  const [targetRim, setTargetRim] = useState(18);
  const [logged, setLogged] = useState(false);

  const spec = useMemo(() => specRows(tire), [tire]);

  // Keep the same sidewall aspect ratio and recompute against the new rim.
  const convertedTire = useMemo(() => ({ ...tire, rim: Number(targetRim) || tire.rim }), [tire, targetRim]);
  const convertedSpec = useMemo(() => specRows(convertedTire), [convertedTire]);
  const diffPct = useMemo(() => speedoDifferencePct(tire, convertedTire), [tire, convertedTire]);
  const speedoTable = useMemo(() => speedometerErrorTable(tire, convertedTire, SPEED_READINGS), [tire, convertedTire]);

  const updateTire = (key) => (e) => {
    setTire((t) => ({ ...t, [key]: Number(e.target.value) }));
    setLogged(false);
  };

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

  const outOfRange = Math.abs(diffPct) > 3;

  return (
    <div className="tsc">
      <PageHeader
        eyebrow="Tire library"
        title="Tire Size Calculator"
        subtitle="Calculate metric tire specs and convert to a different wheel size."
      />

      <div className="tsc-layout">
        {/* ───────── Left: input + specs ───────── */}
        <section className="tsc-card">
          <h3 className="tsc-card-title">
            <Calculator size={16} />
            Input Tire Size
          </h3>

          <div className="tsc-input-row">
            <div className="tsc-field">
              <label htmlFor="tsc-width">Width</label>
              <input id="tsc-width" type="number" value={tire.width} onChange={updateTire("width")} />
            </div>
            <div className="tsc-field">
              <label htmlFor="tsc-aspect">Aspect</label>
              <input id="tsc-aspect" type="number" value={tire.aspect} onChange={updateTire("aspect")} />
            </div>
            <div className="tsc-field">
              <label htmlFor="tsc-rim">Rim</label>
              <input id="tsc-rim" type="number" value={tire.rim} onChange={updateTire("rim")} />
            </div>
          </div>

          <div className="tsc-table-wrap">
            <table className="tsc-table tsc-table-2">
              <thead>
                <tr><th>Spec</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr><td>Overall Height</td><td className="tsc-value">{fmt(spec.overallHeight)}</td></tr>
                <tr><td>Width</td><td className="tsc-value">{fmt(spec.width)}</td></tr>
                <tr><td>Sidewall</td><td className="tsc-value">{fmt(spec.sidewall)}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ───────── Right: convert to a different wheel size ───────── */}
        <section className="tsc-card">
          <div className="tsc-card-head">
            <div>
              <h3>Convert to a different wheel size?</h3>
              <p>Keeps the same aspect ratio and shows the speedometer effect of the swap.</p>
            </div>
            {/* <button type="button" className="btn btn-ghost" onClick={handleConvertClick} aria-expanded={convertOpen}>
              <RefreshCw size={14} />
              {convertOpen ? "Hide" : "Show"}
            </button> */}
          </div>

          {convertOpen && (
            <>
              <div className="tsc-rim-row">
                <label className="tsc-rim-label" htmlFor="tsc-new-rim">New rim</label>
                <input
                  id="tsc-new-rim"
                  className="tsc-rim-input"
                  type="number"
                  value={targetRim}
                  onChange={(e) => setTargetRim(e.target.value)}
                />
                <div className={`tsc-banner ${outOfRange ? "warn" : "ok"}`} role="status">
                  <p>
                    New size changes overall diameter by <strong>{diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%</strong> vs. current —{" "}
                    {outOfRange
                      ? "outside the ±3% range generally considered safe for speedometer accuracy."
                      : "within the typical ±3% safe range for speedometer accuracy."}
                  </p>
                </div>
              </div>

              <div className="tsc-table-wrap">
                <table className="tsc-table tsc-table-3">
                  <thead>
                    <tr><th>Spec</th><th>Current</th><th>New</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Overall Height</td>
                      <td className="tsc-value">{fmt(spec.overallHeight)}</td>
                      <td className="tsc-value">{fmt(convertedSpec.overallHeight)}</td>
                    </tr>
                    <tr>
                      <td>Width</td>
                      <td className="tsc-value">{fmt(spec.width)}</td>
                      <td className="tsc-value">{fmt(convertedSpec.width)}</td>
                    </tr>
                    <tr>
                      <td>Sidewall</td>
                      <td className="tsc-value">{fmt(spec.sidewall)}</td>
                      <td className="tsc-value">{fmt(convertedSpec.sidewall)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 className="tsc-subheading">
                <Gauge size={14} />
                Speedometer Error
              </h4>

              <div className="tsc-table-wrap">
                <table className="tsc-table tsc-table-speedo">
                  <thead>
                    <tr>
                      <th>Reading (mph)</th>
                      {speedoTable.map((r) => <th key={r.reading}>{r.reading}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Actual speed</td>
                      {speedoTable.map((r) => <td key={r.reading} className="tsc-value">{r.actual}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
