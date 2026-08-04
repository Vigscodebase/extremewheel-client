import { Eye, Save, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useTireOptionsQuery } from "../hooks/queries/useTireOptions";
import { usePlusSizeSearch, useSavePlusSizeMatch } from "../hooks/queries/usePlusSize";
import { PLUS_SIZE_HEIGHT_TOLERANCE_PCT, PLUS_SIZE_TREAD_TOLERANCE_PCT } from "../utils/constants";

const emptyOe = { width: 225, aspect: 65, rim: 17, targetRim: "" };

const SORT_OPTIONS = [
  { value: "combined", label: "Best overall match (height + tread)" },
  { value: "height", label: "Closest overall height" },
  { value: "tread", label: "Closest tread width" },
];

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
    </div>
  );
}
