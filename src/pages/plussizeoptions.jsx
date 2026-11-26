import { Eye, Layers, Save, Search, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../components/pageheader";
import Modal from "../components/modal";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { NUMERIC_INPUT_PROPS, TIRE_MAX, onlyDigits } from "../utils/validation";
import { tireComparisonMetrics } from "../utils/tireMath";
import { sortTypeOptions } from "../utils/sortTypeOptions";
// import { useTireOptionsQuery } from "../hooks/queries/useTireOptions"; // hidden: Tire Size Option feature is switched off
import { usePlusSizeSearch, useSavePlusSizeMatch } from "../hooks/queries/usePlusSize";
import {
  useAppGuideFitment,
  useAppGuideMakes,
  useAppGuideModels,
  useAppGuideTypes,
  useAppGuideYears,
} from "../hooks/queries/useAppGuide";
// TEMPORARILY DISABLED — only used by the Height/Tread tolerance state
// below, which is itself commented out for now (see the note further
// down). Re-enable alongside that.
// import { PLUS_SIZE_HEIGHT_TOLERANCE_PCT, PLUS_SIZE_TREAD_TOLERANCE_PCT } from "../utils/constants";

const emptyOe = { width: 225, aspect: 65, rim: 17, targetRim: "" };

// The Plus Size (New rim) table lists EVERY size that fits the OE height window
// on that rim, but only this many rows are visible at once — the rest scroll
// inside the table so the whole page stays within one screen. (The matching
// max-height is derived from this number in global.css via --ps-visible-rows.)
const PLUS_SIZE_VISIBLE_ROWS = 6;

const SORT_OPTIONS = [
  { value: "combined", label: "Best overall match (height + tread)" },
  { value: "height", label: "Closest overall height" },
  { value: "tread", label: "Closest tread width" },
];

// Wheel diameters covered by the Application Guide's F17..F30 upgrade-size
// columns (F17 = 15", ... F30 = 28" — see server/models/AppGuide.js).
const UPGRADE_DIAMETERS = Array.from({ length: 14 }, (_, i) => String(15 + i));

const STAG_OPTIONS = [
  { key: "", label: "Base" },
  { key: "1", label: "Option 1" },
  { key: "2", label: "Option 2" },
  { key: "3", label: "Option 3" },
  { key: "4", label: "Option 4" },
];

// Parses tire size strings like "265/70R17", "225 65 17" into {width, aspect, rim}.
function parseTireSizeString(str) {
  if (!str) return null;
  const match = String(str).match(/(\d{3})\s*[\/\s]\s*(\d{2,3})\s*R?\s*(\d{2})/i);
  if (!match) return null;
  return { width: Number(match[1]), aspect: Number(match[2]), rim: Number(match[3]) };
}

function VehicleUpgradeSizesCard({ onUseAsOe }) {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [typeOption, setTypeOption] = useState("");

  const { data: years, isLoading: loadingYears } = useAppGuideYears();
  const { data: makes, isLoading: loadingMakes } = useAppGuideMakes(year);
  const { data: models, isLoading: loadingModels } = useAppGuideModels(year, make);
  const { data: types, isLoading: loadingTypes } = useAppGuideTypes(year, make, model);
  // Shown in natural numeric order (17, 18, 19) whatever order the sheet had.
  const sortedTypes = useMemo(() => sortTypeOptions(types), [types]);

  const [selType, selOption] = typeOption ? typeOption.split("|") : [null, null];
  const { data: fitment, isLoading: loadingFitment } = useAppGuideFitment(year, make, model, selType, selOption);

  const onYearChange = (e) => { setYear(e.target.value); setMake(""); setModel(""); setTypeOption(""); };
  const onMakeChange = (e) => { setMake(e.target.value); setModel(""); setTypeOption(""); };
  const onModelChange = (e) => { setModel(e.target.value); setTypeOption(""); };

  const step = !year ? 1 : !make ? 2 : !model ? 3 : !typeOption ? 4 : 5;

  return (
    <section className="card ps-panel ps-vehicle">
      <h3 className="mb-16">
        <Layers size={16} className="icon-inline" />
        Vehicle-specific upgrade sizes
      </h3>
      <p className="text-muted fs-13 mb-16 ps-hint">
        Look up the manufacturer-approved upgrade tire sizes for a specific vehicle from the Application Guide — by wheel
        diameter, and any staggered front/rear fitment options — separate from the tolerance search above.
      </p>

      <div className="tire-input-grid vehicle-select-grid field-mb">
        <div className="field">
          <label>Year</label>
          <select value={year} onChange={onYearChange} disabled={loadingYears}>
            <option value="">{loadingYears ? "Loading…" : "Select year"}</option>
            {(years || []).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Make</label>
          <select value={make} onChange={onMakeChange} disabled={!year || loadingMakes}>
            <option value="">{!year ? "Select year first" : loadingMakes ? "Loading…" : "Select make"}</option>
            {(makes || []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Model</label>
          <select value={model} onChange={onModelChange} disabled={!make || loadingModels}>
            <option value="">{!make ? "Select make first" : loadingModels ? "Loading…" : "Select model"}</option>
            {(models || []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Type / Option</label>
          <select value={typeOption} onChange={(e) => setTypeOption(e.target.value)} disabled={!model || loadingTypes}>
            <option value="">{!model ? "Select model first" : loadingTypes ? "Loading…" : "Select type"}</option>
            {sortedTypes.map((t) => (
              <option key={`${t.type}|${t.option}`} value={`${t.type}|${t.option || ""}`}>
                {t.type}{t.option ? ` — ${t.option}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ps-body">
      {step < 5 ? (
        <div className="empty-state-card">
          {step === 1 && "Start by selecting a year."}
          {step === 2 && "Now select a make."}
          {step === 3 && "Now select a model."}
          {step === 4 && "Now select a type to see its upgrade sizes."}
        </div>
      ) : loadingFitment ? (
        <p className="text-muted">Loading upgrade sizes…</p>
      ) : !fitment || fitment.length === 0 ? (
        <div className="empty-state-card">No Application Guide data on file for this fitment.</div>
      ) : (
        fitment.map((record) => {
          const diameterRows = UPGRADE_DIAMETERS
            .map((d) => ({ diameter: d, size: record.upgradeSizeByDiameter?.[d] }))
            .filter((row) => row.size);
          const stagRows = STAG_OPTIONS
            .map((opt) => ({
              label: opt.label,
              front: opt.key ? record[`stag${opt.key}Front`] : record.stagFront,
              rear: opt.key ? record[`stag${opt.key}Rear`] : record.stagRear,
            }))
            .filter((row) => row.front || row.rear);
          const baseParsed = parseTireSizeString(record.txtTireSize);

          return (
            <div key={record._id} className="vehicle-upgrade-box mt-16">
              <div className="modal-actions modal-actions-start mb-24">
                <p className="preset-label mb-0">
                  {record.txtTireSize ? `Base size: ${record.txtTireSize}` : "Base size on file"}
                </p>
                {baseParsed && (
                  <button type="button" className="btn btn-ghost btn-noresponsive" onClick={() => onUseAsOe(baseParsed)}>
                    <Search size={13} /> Use as OE size above
                  </button>
                )}
              </div>

              <div className="vehicle-upgrade-grid">
                <div className="wheel-diameter-table">
                  <p className="fs-11 text-muted mb-6" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                    Upgrade size by wheel diameter
                  </p>
                  {diameterRows.length === 0 ? (
                    <p className="text-muted fs-13">No diameter-specific upgrade sizes on file for this fitment.</p>
                  ) : (
                    <table className="compare-table">
                      <thead><tr><th>Diameter</th><th>Upgrade size</th></tr></thead>
                      <tbody>
                        {diameterRows.map((row) => (
                          <tr key={row.diameter}>
                            <td className="compare-table-label">{row.diameter}"</td>
                            <td className="compare-table-value">{row.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="wheel-frontrearstag-table">
                  <p className="fs-11 text-muted mb-6" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                    Staggered fitment options (front / rear)
                  </p>
                  {stagRows.length === 0 ? (
                    <p className="text-muted fs-13">No staggered fitment options on file for this fitment.</p>
                  ) : (
                    <table className="compare-table">
                      <thead><tr><th>Option</th><th>Front</th><th>Rear</th></tr></thead>
                      <tbody>
                        {stagRows.map((row) => (
                          <tr key={row.label}>
                            <td className="compare-table-label">{row.label}</td>
                            <td className="compare-table-value">{row.front || "—"}</td>
                            <td className="compare-table-value">{row.rear || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {baseParsed && (
                  <button type="button" className="btn btn-ghost btn-responsive" onClick={() => onUseAsOe(baseParsed)}>
                    <Search size={13} /> Use as OE size above
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
      </div>
    </section>
  );
}

// Every OE/tire inch value on this page (the banner, the tolerance cards,
// the results table) goes through this one formatter — 2 decimals, not 4.
// Why: the underlying formula (see tireToleranceLimits() in
// utils/tireMath.js) already rounds to 2dp before applying the ±% window,
// matching the worksheet's own "26.63 x 0.03" arithmetic — so 2dp is what
// the spec actually verifies against, and it's also as far as a manual
// calculator check reliably agrees with the code: rounding an intermediate
// step (e.g. tread width) to 4dp before the next multiplication, which is
// the natural way to check by hand, drifts from the code's full-precision
// result by a few ten-thousandths by the 3rd/4th decimal — not a bug in
// either one, just two different (and both valid) rounding paths arriving
// at very slightly different tails. Showing only the 2 decimals both paths
// agree on avoids that entirely.
const formatInches = (n) => (n == null || !Number.isFinite(Number(n)) ? "—" : Number(n).toFixed(2));

const round2 = (n) => Math.round(n * 100) / 100;

// Height / tread differences vs the OE are shown in INCHES (2dp, e.g. +3.92),
// not as a percentage. The % figures the server still sends are only used for
// ranking, never displayed. Each side is rounded to 2dp first
// (tireComparisonMetrics) and then subtracted, so the difference on screen
// always equals what you get subtracting the two displayed numbers by hand.
const formatDiffInches = (n) => {
  if (!Number.isFinite(n)) return "—";
  const fixed = n.toFixed(2);
  return n > 0 ? `+${fixed}` : fixed;
};

// Overall height / tread width / sidewall height of the OE size currently
// typed in — shown right under the OE inputs and recalculated as you type.
function OeSpecs({ specs }) {
  const items = [
    ["Overall height", specs?.overallHeight],
    ["Tread width", specs?.treadWidth],
    ["Sidewall height", specs?.sidewallHeight],
  ];
  return (
    <dl className="ps-specs" aria-label="OE size specs in inches">
      {items.map(([label, value]) => (
        <div key={label} className="ps-spec">
          <dt title={label}>{label}</dt>
          <dd>{value == null ? "—" : `${value.toFixed(2)}"`}</dd>
        </div>
      ))}
    </dl>
  );
}

// One results table for both the "Plus Size matches" box and the OE
// closest-matches box. `oe` is the OE size of the search that produced `rows`.
function ResultsTable({ rows, oe, onPreview }) {
  const oeMetrics = tireComparisonMetrics(oe);
  return (
    <table className="compare-table plus-results-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th className="plus-size-col">Size</th>
          <th title="Overall height, in inches">Overall height</th>
          <th title="Tread width, in inches">Tread width</th>
          <th title="Sidewall Height = Tread Width × Aspect Ratio, in inches">Sidewall height</th>
          <th title="Overall height minus the OE overall height, in inches">Height diff (in)</th>
          <th title="Tread width minus the OE tread width, in inches">Tread diff (in)</th>
          <th>3D</th>
          {/* <th>Save</th> — hidden, see saveMatch() in PlusSizeOptions */}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const m = tireComparisonMetrics(r);
          const heightDiff = round2(m.overallHeight - oeMetrics.overallHeight);
          const treadDiff = round2(m.treadWidth - oeMetrics.treadWidth);
          return (
            <tr key={r._id}>
              <td>
                <span className={`badge ${r.rank === 1 ? "badge-live" : "badge-model"}`}>{r.rank}</span>
              </td>
              <td className="compare-table-value plus-size-col">
                {r.label ? `${r.label} — ` : ""}{r.width} {r.aspect} {r.rim}
              </td>
              <td>{formatInches(m.overallHeight)}</td>
              <td>{formatInches(m.treadWidth)}</td>
              <td>{formatInches(m.sidewallHeight)}</td>
              <td className={heightDiff === 0 ? "text-mint" : undefined}>{formatDiffInches(heightDiff)}</td>
              <td className={treadDiff === 0 ? "text-mint" : undefined}>{formatDiffInches(treadDiff)}</td>
              <td>
                <button type="button" className="icon-btn" title="Preview in 3D" onClick={() => onPreview(r)}>
                  <Eye size={14} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// The OE size's overall height / tread width plus the lower & upper limit of
// each. Only the overall-height window decides which sizes appear in the
// table; the tread-width window is displayed for reference (a size is never
// hidden for its tread width — see /plus-size/search in server.js).
//
// The limits are taken from the search response when the server sends them
// (heightLowerLimitIn, heightUpperLimitIn, treadLowerLimitIn, treadUpperLimitIn
// — precomputed onto every oe_tiresize document). If they're absent they're
// derived from the tolerance that was actually applied to this search, using
// the same formula as tireToleranceLimits() in utils/tireMath.js:
// limit = value ± (value × pct).
function buildToleranceWindow(oe, tolerances) {
  const sent = (v) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
  const height = Number(oe?.overallHeightIn);
  const tread = Number(oe?.treadWidthIn);
  const heightPct = Number(tolerances?.heightPct);
  const treadPct = Number(tolerances?.treadPct);
  const derive = (value, pct, direction) =>
    Number.isFinite(value) && Number.isFinite(pct) ? value + direction * value * (pct / 100) : null;

  return {
    height: {
      value: height,
      pct: tolerances?.heightPct,
      lower: sent(oe?.heightLowerLimitIn) ?? derive(height, heightPct, -1),
      upper: sent(oe?.heightUpperLimitIn) ?? derive(height, heightPct, 1),
    },
    tread: {
      value: tread,
      pct: tolerances?.treadPct,
      lower: sent(oe?.treadLowerLimitIn) ?? derive(tread, treadPct, -1),
      upper: sent(oe?.treadUpperLimitIn) ?? derive(tread, treadPct, 1),
    },
  };
}

function ToleranceCard({ title, value, pct, lower, upper }) {
  return (
    <div className="tolerance-card">
      <div className="tolerance-card-head">
        <span className="tolerance-card-title">{title}</span>
        {pct != null && <span className="badge badge-model">±{pct}%</span>}
      </div>
      <p className="tolerance-card-value">{formatInches(value)}</p>
      <dl className="tolerance-limits">
        <div className="tolerance-limit">
          <dt>Lower limit</dt>
          <dd>{formatInches(lower)}</dd>
        </div>
        <div className="tolerance-limit">
          <dt>Upper limit</dt>
          <dd>{formatInches(upper)}</dd>
        </div>
      </dl>
    </div>
  );
}

function OeToleranceWindow({ oe, tolerances }) {
  const win = buildToleranceWindow(oe, tolerances);
  return (
    <div className="tolerance-window">
      <ToleranceCard title="Overall height" {...win.height} />
      <ToleranceCard title="Tread width (reference)" {...win.tread} />
    </div>
  );
}

export default function PlusSizeOptions() {
  const location = useLocation();
  // Hidden: no Tire Size Option data is fetched or checked any more.
  // const { data: presets } = useTireOptionsQuery();
  const searchMutation = usePlusSizeSearch();
  // Separate mutation for the "Plus Size" (New rim) search, so its top-3 table
  // never overwrites the OE closest-matches results below.
  const plusMutation = usePlusSizeSearch();
  const saveMutation = useSavePlusSizeMatch();

  // Arrived here via a "Saved plus-size match" suggestion chip elsewhere in
  // the app — load that OE size (and target rim) straight into the form.
  const navPrefill = location.state?.prefillOe;
  const [oe, setOe] = useState(
    navPrefill
      ? {
        width: navPrefill.width,
        aspect: navPrefill.aspect,
        rim: navPrefill.rim,
        targetRim: location.state?.prefillTargetRim || "",
      }
      : emptyOe
  );
  // Live specs of the OE size typed in (inches, 2dp) — shown next to the OE fields.
  const oeSpecs = useMemo(() => {
    const width = Number(oe.width);
    const aspect = Number(oe.aspect);
    const rim = Number(oe.rim);
    return width && aspect && rim ? tireComparisonMetrics({ width, aspect, rim }) : null;
  }, [oe.width, oe.aspect, oe.rim]);
  // 3D preview target: { source: "oe" | "plus", row, oe } — `oe` is the OE size
  // of the search that produced the row (not the live inputs), so editing the
  // fields above never changes an open or later preview of an earlier result.
  const [preview, setPreview] = useState(null);
  const togglePreview = (source, row, searchOe) =>
    setPreview((cur) => (cur && cur.source === source && cur.row._id === row._id ? null : { source, row, oe: searchOe }));
  const [savedIds, setSavedIds] = useState(new Set());

  // TEMPORARILY DISABLED — Target rim / Height tolerance / Tread width
  // tolerance / Sort results by overrides. Reason: clearing (or never
  // filling in) the Height/Tread tolerance fields left them as an empty
  // string in state, and `Number("")` is `0` in JS — not NaN, not
  // "unset" — so the search silently ran at a 0% tolerance (effectively
  // "match to the exact float only") and always came back with zero
  // results ("No saved tire sizes fall within tolerance"), no matter what
  // OE size was entered. Disabling these three controls (in step with the
  // matching override-handling in server.js's /plus-size/search, also
  // commented out there) falls back to width/aspect/rim only, letting the
  // server's own defaults (3% height / 15% tread / no rim filter /
  // combined sort) run every time, matching the original spec. Re-enable
  // by uncommenting this block, the matching JSX below, and the payload
  // fields in runSearch — once the input onChange handlers are fixed to
  // store `undefined` (not `""`) for an empty field, e.g.
  // `onChange={(e) => setHeightTolerancePct(e.target.value === "" ? undefined : e.target.value)}`.
  // const [heightTolerancePct, setHeightTolerancePct] = useState(PLUS_SIZE_HEIGHT_TOLERANCE_PCT * 100);
  // const [treadTolerancePct, setTreadTolerancePct] = useState(PLUS_SIZE_TREAD_TOLERANCE_PCT * 100);
  // const [sortBy, setSortBy] = useState("combined");

  // Hidden: "Load a saved preset" is switched off.
  // const applyPreset = (id) => {
  //   const preset = (presets || []).find((p) => p._id === id);
  //   if (preset) setOe((prev) => ({ ...prev, width: preset.width, aspect: preset.aspect, rim: preset.rim }));
  // };

  const runSearch = async (e) => {
    e.preventDefault();
    setPreview((cur) => (cur?.source === "oe" ? null : cur));
    setSavedIds(new Set());
    await searchMutation.mutateAsync({
      width: Number(oe.width),
      aspect: Number(oe.aspect),
      rim: Number(oe.rim),
      // TEMPORARILY DISABLED — see the note by the (also commented-out)
      // heightTolerancePct/treadTolerancePct/sortBy state above. Omitting
      // these from the payload entirely lets the server always fall back
      // to its own defaults (3% height / 15% tread / no rim filter /
      // combined sort), matching the original spec.
      // targetRim: oe.targetRim ? Number(oe.targetRim) : undefined,
      // heightTolerancePct: Number(heightTolerancePct),
      // treadTolerancePct: Number(treadTolerancePct),
      // sortBy,
    });
  };

  // "Plus Size" — same search/calculation as above, narrowed to the New rim.
  // Every size that fits is kept (closest first); the table shows
  // PLUS_SIZE_VISIBLE_ROWS at a time and scrolls for the rest.
  const runPlusSearch = async (e) => {
    e.preventDefault();
    if (!oe.targetRim) return;
    setPreview((cur) => (cur?.source === "plus" ? null : cur));
    await plusMutation.mutateAsync({
      width: Number(oe.width),
      aspect: Number(oe.aspect),
      rim: Number(oe.rim),
      targetRim: Number(oe.targetRim),
    });
  };

  const data = searchMutation.data;
  const results = data?.results || [];
  const plusData = plusMutation.data;
  const plusResults = plusData?.results || [];

  const saveMatch = async (r) => {
    await saveMutation.mutateAsync({
      oe: { width: Number(oe.width), aspect: Number(oe.aspect), rim: Number(oe.rim) },
      match: { label: r.label, width: r.width, aspect: r.aspect, rim: r.rim },
      tolerances: data?.tolerances,
      summary: `${oe.width}/${oe.aspect}R${oe.rim} → ${r.width}/${r.aspect}R${r.rim}${r.label ? ` (${r.label})` : ""}`,
    });
    setSavedIds((prev) => new Set(prev).add(r._id));
  };

  const useAsOe = (parsed) => {
    setOe((f) => ({ ...f, width: parsed.width, aspect: parsed.aspect, rim: parsed.rim }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="plus-size-page">
      <PageHeader
        eyebrow="Tire library"
        title="Plus Size Options"
        subtitle="Find alternate tire sizes that stay within tolerance of the OE overall diameter and tread width."
      />

      {/*
        One-frame layout (see "Plus Size Options — one-frame layout" in global.css):
        on a desktop screen this grid fills the viewport and each box scrolls
        on its own, so the page itself never scrolls. On smaller screens the
        boxes simply stack.
      */}
      <div className="ps-grid">
        <section className="card ps-panel ps-inputs">
          <form className="ps-block" onSubmit={runSearch}>
            {/* The OE library download / upload buttons now live on the Reporting & Data Export page. */}
            <h3>OE (original equipment) size</h3>

            {/* Hidden: "Load a saved preset" (Tire Size Option presets are switched off) — see applyPreset above. */}

            <div className="tire-input-grid ps-oe-fields">
              <div className="field">
                <label>Width</label>
                <input {...NUMERIC_INPUT_PROPS} maxLength={TIRE_MAX.width} value={oe.width} onChange={(e) => setOe((f) => ({ ...f, width: onlyDigits(e.target.value, TIRE_MAX.width) }))} />
              </div>
              <div className="field">
                <label>Aspect</label>
                <input {...NUMERIC_INPUT_PROPS} maxLength={TIRE_MAX.aspect} value={oe.aspect} onChange={(e) => setOe((f) => ({ ...f, aspect: onlyDigits(e.target.value, TIRE_MAX.aspect) }))} />
              </div>
              <div className="field">
                <label>Rim</label>
                <input {...NUMERIC_INPUT_PROPS} maxLength={TIRE_MAX.rim} value={oe.rim} onChange={(e) => setOe((f) => ({ ...f, rim: onlyDigits(e.target.value, TIRE_MAX.rim) }))} />
              </div>
              {/* TEMPORARILY DISABLED — Target rim (optional) and the Height / Tread width tolerance + Sort
                  results by controls. See the note above the (commented-out) tolerance state for why; restore
                  them here together with that state and the payload fields in runSearch. */}
            </div>

            <OeSpecs specs={oeSpecs} />

            <button type="submit" className="btn btn-accent" disabled={searchMutation.isPending}>
              <Search size={16} /> {searchMutation.isPending ? "Searching…" : "Find matches"}
            </button>
          </form>

          <form className="ps-block" onSubmit={runPlusSearch}>
            <h3>Plus Size</h3>
            <div className="ps-plus-row">
              <div className="field">
                <label>New rim</label>
                <input
                  {...NUMERIC_INPUT_PROPS}
                  maxLength={TIRE_MAX.rim}
                  required
                  placeholder="e.g. 20"
                  value={oe.targetRim}
                  onChange={(e) => setOe((f) => ({ ...f, targetRim: onlyDigits(e.target.value, TIRE_MAX.rim) }))}
                />
              </div>
              <button type="submit" className="btn btn-accent" disabled={plusMutation.isPending}>
                <Search size={16} /> {plusMutation.isPending ? "Searching…" : "Find matches"}
              </button>
            </div>
          </form>
        </section>

        <section className="card ps-panel ps-plus">
          <div className="ps-panel-head">
            <h3>Plus Size matches</h3>
            {plusData && plusResults.length > 0 && <span className="badge badge-model">{plusResults.length} found</span>}
          </div>

          {plusMutation.isError && (
            <div className="alert-error">
              {plusMutation.error?.response?.data?.message || "Search failed. Please try again."}
            </div>
          )}

          {plusData && (
            <>
              <p className="text-muted fs-13 ps-note">
                {plusResults.length} plus-size {plusResults.length === 1 ? "match" : "matches"} for{" "}
                <strong>{plusData.oe.width}/{plusData.oe.aspect} R{plusData.oe.rim}</strong> on a{" "}
                <strong>{plusMutation.variables?.targetRim}" rim</strong>, closest first
                {plusResults.length > PLUS_SIZE_VISIBLE_ROWS ? " — scroll the table to see all of them." : "."}
              </p>
              {plusResults.length === 0 ? (
                <div className="empty-state-card">
                  No saved tire sizes on a {plusMutation.variables?.targetRim}" rim fall within tolerance. Try a different new rim.
                </div>
              ) : (
                <div className="ps-scroll ps-scroll--rows" style={{ "--ps-visible-rows": PLUS_SIZE_VISIBLE_ROWS }}>
                  <ResultsTable
                    rows={plusResults}
                    oe={plusData.oe}
                    onPreview={(r) => togglePreview("plus", r, plusData.oe)}
                  />
                </div>
              )}
            </>
          )}
          {!plusData && !plusMutation.isError && (
            <div className="empty-state-card">
              Enter a New rim and click Find matches to see every plus-size match here.
            </div>
          )}
        </section>

        <section className="card ps-panel ps-oe-results">
          <div className="ps-panel-head">
            <h3>Closest matches to the OE size</h3>
            {data && results.length > 0 && <span className="badge badge-model">{results.length} found</span>}
          </div>

          {searchMutation.isError && (
            <div className="alert-error">
              {searchMutation.error?.response?.data?.message || "Search failed. Please try again."}
            </div>
          )}

          {data ? (
            <>
              <p className="text-muted fs-13 ps-note">
                OE size <strong>{data.oe.width}/{data.oe.aspect} R{data.oe.rim}</strong> — overall height{" "}
                <strong>{formatInches(data.oe.overallHeightIn)}"</strong>, tread width <strong>{formatInches(data.oe.treadWidthIn)}"</strong>.
                Showing matches within ±{data.tolerances.heightPct}% overall height (tread width is shown for reference, not used to filter), ranked by{" "}
                {SORT_OPTIONS.find((o) => o.value === data.sortBy || (data.sortBy || "").startsWith(o.value))?.label.toLowerCase() ||
                  "closeness to OE"}
                .
              </p>

              <OeToleranceWindow oe={data.oe} tolerances={data.tolerances} />

              {results.length === 0 ? (
                <div className="empty-state-card">
                  {/* Hidden: pointer to the Tire Size Option page (switched off) */}
                  No saved tire sizes fall within tolerance. Try widening your target rim / tolerances above.
                </div>
              ) : (
                <div className="ps-scroll ps-scroll--fill">
                  <ResultsTable
                    rows={results}
                    oe={data.oe}
                    onPreview={(r) => togglePreview("oe", r, data.oe)}
                  />
                </div>
              )}
            </>
          ) : (
            !searchMutation.isError && (
              <div className="empty-state-card inline">
                <TrendingUp size={18} />
                Enter an OE size and search your saved tire library for the closest plus-size matches.
              </div>
            )
          )}
        </section>

        {/* Always the last box on the page. */}
        <VehicleUpgradeSizesCard onUseAsOe={useAsOe} />
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `OE ${preview.oe.width}/${preview.oe.aspect}R${preview.oe.rim} vs ${preview.row.width}/${preview.row.aspect}R${preview.row.rim}` : "3D preview"}
        width={760}
      >
        {preview && (
          <div className="wheel-viz">
            <div className="wheel-col">
              <Tire3DVisualizer
                tire={{ width: preview.oe.width, aspect: preview.oe.aspect, rim: preview.oe.rim }}
                label={`OE · ${preview.oe.width}/${preview.oe.aspect}R${preview.oe.rim}`}
                accent="#FF6F91"
                height={280}
                zoomable
                variant="plus-size"
              />
            </div>
            <div className="wheel-col">
              <Tire3DVisualizer
                tire={{ width: preview.row.width, aspect: preview.row.aspect, rim: preview.row.rim }}
                label={`${preview.row.label ? `${preview.row.label} · ` : ""}${preview.row.width}/${preview.row.aspect}R${preview.row.rim}`}
                accent="#8B7CF6"
                height={280}
                zoomable
                variant="plus-size"
              />
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}