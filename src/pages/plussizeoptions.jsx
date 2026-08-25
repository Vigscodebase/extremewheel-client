import { Eye, Layers, Save, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useTireOptionsQuery } from "../hooks/queries/useTireOptions";
import { usePlusSizeSearch, useSavePlusSizeMatch } from "../hooks/queries/usePlusSize";
import {
  useAppGuideFitment,
  useAppGuideMakes,
  useAppGuideModels,
  useAppGuideTypes,
  useAppGuideYears,
} from "../hooks/queries/useAppGuide";
import { PLUS_SIZE_HEIGHT_TOLERANCE_PCT, PLUS_SIZE_TREAD_TOLERANCE_PCT } from "../utils/constants";

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
      <h3 className="mb-4">
        <Layers size={16} className="icon-inline" />
        Vehicle-specific upgrade sizes
      </h3>
      <p className="text-muted mb-16">
        Look up the manufacturer-approved upgrade tire sizes for a specific vehicle from the Application Guide — by wheel
        diameter, and any staggered front/rear fitment options — separate from the tolerance search above.
      </p>

      <div className="tire-input-grid field-mb">
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
              <div className="modal-actions modal-actions-start mb-10">
                <p className="preset-label mb-0">
                  {record.txtTireSize ? `Base size: ${record.txtTireSize}` : "Base size on file"}
                </p>
                {baseParsed && (
                  <button type="button" className="btn btn-ghost" onClick={() => onUseAsOe(baseParsed)}>
                    <Search size={13} /> Use as OE size above
                  </button>
                )}
              </div>

              <div className="vehicle-upgrade-grid">
                <div>
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
                <div>
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
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function PlusSizeOptions() {
  const location = useLocation();
  const { data: presets } = useTireOptionsQuery();
  const searchMutation = usePlusSizeSearch();
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
  const [searched, setSearched] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());

  // Configurable height / tread-width tolerance — defaults to the server's
  // configured values, but can be widened/narrowed per search without
  // touching the server.
  const [heightTolerancePct, setHeightTolerancePct] = useState(PLUS_SIZE_HEIGHT_TOLERANCE_PCT * 100);
  const [treadTolerancePct, setTreadTolerancePct] = useState(PLUS_SIZE_TREAD_TOLERANCE_PCT * 100);
  const [sortBy, setSortBy] = useState("combined");

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
      targetRim: oe.targetRim ? Number(oe.targetRim) : undefined,
      heightTolerancePct: Number(heightTolerancePct),
      treadTolerancePct: Number(treadTolerancePct),
      sortBy,
    });
  };

  const data = searchMutation.data;
  const results = data?.results || [];

  const saveMatch = async (r) => {
    await saveMutation.mutateAsync({
      oe: { width: Number(oe.width), aspect: Number(oe.aspect), rim: Number(oe.rim) },
      match: { label: r.label, width: r.width, aspect: r.aspect, rim: r.rim },
      tolerances: data?.tolerances,
      summary: `${oe.width}/${oe.aspect}R${oe.rim} → ${r.label} (${r.width}/${r.aspect}R${r.rim})`,
    });
    setSavedIds((prev) => new Set(prev).add(r._id));
  };

  const useAsOe = (parsed) => {
    setOe((f) => ({ ...f, width: parsed.width, aspect: parsed.aspect, rim: parsed.rim }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Plus Size Options"
        subtitle="Find alternate tire sizes that stay within tolerance of the OE overall diameter and tread width."
      />

      <form className="card tire-plus-form" onSubmit={runSearch}>
        <h3>OE (original equipment) size</h3>

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
          <div className="field">
            <label>Target rim (optional)</label>
            <input
              type="number"
              placeholder="e.g. 18"
              value={oe.targetRim}
              onChange={(e) => setOe((f) => ({ ...f, targetRim: e.target.value }))}
            />
          </div>
        </div>

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
            <div className="field">
              <label>Sort results by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

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
            within ±{data.tolerances.heightPct}% height and ±{data.tolerances.treadPct}% tread width, ranked by{" "}
            {SORT_OPTIONS.find((o) => o.value === data.sortBy || (data.sortBy || "").startsWith(o.value))?.label.toLowerCase() ||
              "closeness to OE"}
            .
          </div>

          {results.length === 0 ? (
            <div className="empty-state-card">
              No saved tire sizes fall within tolerance. Add more sizes on the Tire Size Option page, or widen your target rim /
              tolerances above.
            </div>
          ) : (
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Size</th>
                  <th>Overall height</th>
                  <th>Tread width</th>
                  <th>Height diff</th>
                  <th>Tread diff</th>
                  <th>3D</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <span className={`badge ${r.rank === 1 ? "badge-live" : "badge-model"}`}>#{r.rank}</span>
                    </td>
                    <td className="compare-table-value">
                      {r.label} — {r.width}/{r.aspect} R{r.rim}
                    </td>
                    <td>{r.overallHeightIn}"</td>
                    <td>{r.treadWidthIn}"</td>
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
                    <td>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Save this match"
                        disabled={saveMutation.isPending || savedIds.has(r._id)}
                        onClick={() => saveMatch(r)}
                      >
                        <Save size={14} className={savedIds.has(r._id) ? "text-mint" : undefined} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {previewResult && (
            <div className="wheel-viz mt-20">
              <div className="wheel-col">
                <Tire3DVisualizer
                  tire={{ width: oe.width, aspect: oe.aspect, rim: oe.rim }}
                  label={`OE · ${oe.width}/${oe.aspect}R${oe.rim}`}
                  accent="#FF6F91"
                  height={230}
                  variant="plus-size"
                />
              </div>
              <div className="wheel-col">
                <Tire3DVisualizer
                  tire={{ width: previewResult.width, aspect: previewResult.aspect, rim: previewResult.rim }}
                  label={`${previewResult.label} · ${previewResult.width}/${previewResult.aspect}R${previewResult.rim}`}
                  accent="#8B7CF6"
                  height={230}
                  variant="plus-size"
                />
              </div>
            </div>
          )}

          <TireSuggestions tire={{ width: Number(oe.width), aspect: Number(oe.aspect), rim: Number(oe.rim) }} label="OE size" />
          {previewResult && <TireSuggestions tire={previewResult} label={previewResult.label} />}
        </div>
      )}

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
