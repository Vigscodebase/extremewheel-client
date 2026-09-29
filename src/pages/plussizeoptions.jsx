import { Download, Eye, Layers, Save, Search, TrendingUp, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../components/pageheader";
import Modal from "../components/modal";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useAuth } from "../context/authcontext";
import { useTireOptionsQuery } from "../hooks/queries/useTireOptions";
import {
  useDownloadOeTireSizeXlsx,
  useImportOeTireSizeXlsx,
  usePlusSizeSearch,
  useSavePlusSizeMatch,
} from "../hooks/queries/usePlusSize";
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

  const [selType, selOption] = typeOption ? typeOption.split("|") : [null, null];
  const { data: fitment, isLoading: loadingFitment } = useAppGuideFitment(year, make, model, selType, selOption);

  const onYearChange = (e) => { setYear(e.target.value); setMake(""); setModel(""); setTypeOption(""); };
  const onMakeChange = (e) => { setMake(e.target.value); setModel(""); setTypeOption(""); };
  const onModelChange = (e) => { setModel(e.target.value); setTypeOption(""); };

  const step = !year ? 1 : !make ? 2 : !model ? 3 : !typeOption ? 4 : 5;

  return (
    <div className="card mt-20">
      <h3 className="mb-16">
        <Layers size={16} className="icon-inline" />
        Vehicle-specific upgrade sizes
      </h3>
      <p className="text-muted fs-13 mb-16">
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
            {(types || []).map((t) => (
              <option key={`${t.type}|${t.option}`} value={`${t.type}|${t.option || ""}`}>
                {t.type}{t.option ? ` — ${t.option}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

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
  );
}

// Same 4-decimal format the green summary banner (and the server's
// oe_tiresize rounding) uses, so the numbers below the banner read identically.
const formatInches = (n) => (n == null || !Number.isFinite(Number(n)) ? "—" : Number(n).toFixed(4));

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
  const { user } = useAuth();
  const canManageOeLibrary = user?.role === "staff" || user?.role === "admin";
  const { data: presets } = useTireOptionsQuery();
  const searchMutation = usePlusSizeSearch();
  const saveMutation = useSavePlusSizeMatch();
  const importOeMutation = useImportOeTireSizeXlsx();
  const downloadOeMutation = useDownloadOeTireSizeXlsx();
  const oeFileInputRef = useRef(null);

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
  const [searched, setSearched] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
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

  const applyPreset = (id) => {
    const preset = (presets || []).find((p) => p._id === id);
    if (preset) setOe((prev) => ({ ...prev, width: preset.width, aspect: preset.aspect, rim: preset.rim }));
  };

  const runSearch = async (e) => {
    e.preventDefault();
    setSearched(true);
    setPreviewResult(null);
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

  const data = searchMutation.data;
  const results = data?.results || [];

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

  const onOeFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    await importOeMutation.mutateAsync(file);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Plus Size Options"
        subtitle="Find alternate tire sizes that stay within tolerance of the OE overall diameter and tread width."
      />

      <form className="card tire-plus-form" onSubmit={runSearch}>
        <div className="oe-library-header mb-16">
          <h3 className="mb-0">OE (original equipment) size</h3>
          <div className="oe-library-actions">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={downloadOeMutation.isPending}
              onClick={() => downloadOeMutation.mutate()}
              title="Download the OE tire size library as .xlsx"
            >
              <Download size={14} /> {downloadOeMutation.isPending ? "Downloading…" : "Download OE library"}
            </button>
            {canManageOeLibrary && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={importOeMutation.isPending}
                  onClick={() => oeFileInputRef.current?.click()}
                  title="Upload a Width / Aspect / Rim .xlsx to append to the OE tire size library"
                >
                  <Upload size={14} /> {importOeMutation.isPending ? "Uploading…" : "Upload OE sizes"}
                </button>
                <input
                  ref={oeFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={onOeFileSelected}
                />
              </>
            )}
          </div>
        </div>

        {importOeMutation.isSuccess && (
          <div className="speedo-banner ok">
            Added {importOeMutation.data.inserted} new size{importOeMutation.data.inserted === 1 ? "" : "s"} to the OE library
            {importOeMutation.data.duplicates ? ` (${importOeMutation.data.duplicates} already on file, skipped)` : ""}
            {importOeMutation.data.skipped ? `, ${importOeMutation.data.skipped} row${importOeMutation.data.skipped === 1 ? "" : "s"} couldn't be read` : ""}.
          </div>
        )}
        {importOeMutation.isError && (
          <div className="alert-error mb-16">
            {importOeMutation.error?.response?.data?.message || "Upload failed. Please check the file and try again."}
          </div>
        )}

        <div className="field field-mb">
          <label>Load a saved preset</label>
          <select onChange={(e) => e.target.value && applyPreset(e.target.value)} defaultValue="">
            <option value="">Custom size…</option>
            {(presets || []).map((p) => (
              <option key={p._id} value={p._id}>
                {p.label} — {p.width}/{p.aspect} R{p.rim}
              </option>
            ))}
          </select>
        </div>

        <div className="tire-input-grid">
          <div className="field">
            <label>Width</label>
            <input type="number" value={oe.width} onChange={(e) => setOe((f) => ({ ...f, width: e.target.value }))} />
          </div>
          <div className="field">
            <label>Aspect</label>
            <input type="number" value={oe.aspect} onChange={(e) => setOe((f) => ({ ...f, aspect: e.target.value }))} />
          </div>
          <div className="field">
            <label>Rim</label>
            <input type="number" value={oe.rim} onChange={(e) => setOe((f) => ({ ...f, rim: e.target.value }))} />
          </div>
          {/*
            TEMPORARILY DISABLED — Target rim (optional). See the note by
            the commented-out heightTolerancePct/treadTolerancePct/sortBy
            state near the top of this component for why: an empty-field
            round-trip bug in its two sibling tolerance fields was making
            every search return zero matches, so all three (plus Sort
            results by below) are disabled together for now, and the
            search always runs OE width/aspect/rim only, against every
            rim in oe_tiresize. Re-enable by restoring this block, the
            state above, and the payload fields in runSearch.
          <div className="field">
            <label>Target rim (optional)</label>
            <input
              type="number"
              placeholder="e.g. 18"
              value={oe.targetRim}
              onChange={(e) => setOe((f) => ({ ...f, targetRim: e.target.value }))}
            />
          </div>
          */}
        </div>

        {/*
          TEMPORARILY DISABLED — Height tolerance / Tread width tolerance /
          Sort results by. Root cause: clearing (or never filling in)
          Height/Tread tolerance left them as "" in state, and
          Number("") === 0 in JS — not NaN, not "no override" — so the
          search silently ran at a 0% tolerance and always came back with
          "No saved tire sizes fall within tolerance", regardless of the OE
          size entered. Disabled here in step with the matching
          override-handling in server.js's /plus-size/search (also
          commented out there), so every search now falls back to the
          server's own defaults (3% height / 15% tread / combined sort)
          every time. Re-enable by restoring this block, the state near
          the top of this component, and the payload fields in runSearch —
          once the onChange handlers below are fixed to store `undefined`
          (not `""`) for an empty field, e.g.
          `onChange={(e) => setHeightTolerancePct(e.target.value === "" ? undefined : e.target.value)}`,
          and runSearch only sends a tolerance field when it's actually set.
        <div className="field-mb-lg mt-16">
          <label className="fs-11 text-muted" style={{ display: "block", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Configurable height &amp; tread width tolerance
          </label>
          <div className="tire-input-grid">
            <div className="field">
              <label>Height tolerance (±%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={heightTolerancePct}
                onChange={(e) => setHeightTolerancePct(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Tread width tolerance (±%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={treadTolerancePct}
                onChange={(e) => setTreadTolerancePct(e.target.value)}
              />
            </div>
            <div className="field sort-results-field">
              <label>Sort results by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        */}

        <div className="modal-actions modal-actions-start mt-8">
          <button type="submit" className="btn btn-accent" disabled={searchMutation.isPending}>
            <Search size={16} /> {searchMutation.isPending ? "Searching…" : "Find matches"}
          </button>
        </div>
      </form>

      {searchMutation.isError && (
        <div className="alert-error mt-16">
          {searchMutation.error?.response?.data?.message || "Search failed. Please try again."}
        </div>
      )}

      {data && (
        <div className="card compare-result-card mt-20">
          <div className="speedo-banner ok">
            OE size <strong>{oe.width}/{oe.aspect} R{oe.rim}</strong> — overall height{" "}
            <strong>{data.oe.overallHeightIn}"</strong>, tread width <strong>{data.oe.treadWidthIn}"</strong>. Showing matches
            within ±{data.tolerances.heightPct}% overall height (tread width is shown for reference, not used to filter), ranked by{" "}
            {SORT_OPTIONS.find((o) => o.value === data.sortBy || (data.sortBy || "").startsWith(o.value))?.label.toLowerCase() ||
              "closeness to OE"}
            .
          </div>

          <OeToleranceWindow oe={data.oe} tolerances={data.tolerances} />

          {results.length === 0 ? (
            <div className="empty-state-card">
              No saved tire sizes fall within tolerance. Add more sizes on the Tire Size Option page, or widen your target rim /
              tolerances above.
            </div>
          ) : (
            <div className="table-responsive">
            <table className="compare-table plus-results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th className="plus-size-col">Size</th>
                  <th>Overall height</th>
                  <th>Tread width</th>
                  <th>Height diff</th>
                  <th>Tread diff</th>
                  <th>3D</th>
                  {/* <th>Save</th> */}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <span className={`badge ${r.rank === 1 ? "badge-live" : "badge-model"}`}>{r.rank}</span>
                    </td>
                    <td className="compare-table-value plus-size-col">
                      {r.label ? `${r.label} — ` : ""}{r.width} {r.aspect} {r.rim}
                    </td>
                    <td>{r.overallHeightIn}</td>
                    <td>{r.treadWidthIn}</td>
                    <td className={Math.abs(r.heightDiffPct) < 0.01 ? "text-mint" : undefined}>
                      {r.heightDiffPct >= 0 ? "+" : ""}{r.heightDiffPct}%
                    </td>
                    <td>{r.treadDiffPct >= 0 ? "+" : ""}{r.treadDiffPct}%</td>
                    <td>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Preview in 3D"
                        onClick={() => setPreviewResult(previewResult?._id === r._id ? null : r)}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                    {/* <td>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Save this match"
                        disabled={saveMutation.isPending || savedIds.has(r._id)}
                        onClick={() => saveMatch(r)}
                      >
                        <Save size={14} className={savedIds.has(r._id) ? "text-mint" : undefined} />
                      </button>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {/* <TireSuggestions tire={{ width: Number(oe.width), aspect: Number(oe.aspect), rim: Number(oe.rim) }} label="OE size" />
          {previewResult && <TireSuggestions tire={previewResult} label={previewResult.label} />} */}
        </div>
      )}

      <Modal
        open={!!previewResult}
        onClose={() => setPreviewResult(null)}
        title={previewResult ? `OE ${oe.width}/${oe.aspect}R${oe.rim} vs ${previewResult.width}/${previewResult.aspect}R${previewResult.rim}` : "3D preview"}
        width={760}
      >
        {previewResult && (
          <div className="wheel-viz">
            <div className="wheel-col">
              <Tire3DVisualizer
                tire={{ width: oe.width, aspect: oe.aspect, rim: oe.rim }}
                label={`OE · ${oe.width}/${oe.aspect}R${oe.rim}`}
                accent="#FF6F91"
                height={280}
                zoomable
                variant="plus-size"
              />
            </div>
            <div className="wheel-col">
              <Tire3DVisualizer
                tire={{ width: previewResult.width, aspect: previewResult.aspect, rim: previewResult.rim }}
                label={`${previewResult.label ? `${previewResult.label} · ` : ""}${previewResult.width}/${previewResult.aspect}R${previewResult.rim}`}
                accent="#8B7CF6"
                height={280}
                zoomable
                variant="plus-size"
              />
            </div>
          </div>
        )}
      </Modal>


      {!searched && (
        <div className="card empty-state-card inline mt-20">
          <TrendingUp size={18} />
          Enter an OE size above and search your saved tire library for the closest plus-size matches.
        </div>
      )}

      <VehicleUpgradeSizesCard onUseAsOe={useAsOe} />
    </div>
  );
}