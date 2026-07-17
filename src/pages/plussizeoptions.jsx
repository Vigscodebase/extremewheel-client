import { Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import PageHeader from "../components/pageheader";
import { useTireOptionsQuery } from "../hooks/queries/useTireOptions";
import { usePlusSizeSearch } from "../hooks/queries/usePlusSize";

const emptyOe = { width: 225, aspect: 65, rim: 17, targetRim: "" };

export default function PlusSizeOptions() {
  const { data: presets } = useTireOptionsQuery();
  const searchMutation = usePlusSizeSearch();

  const [oe, setOe] = useState(emptyOe);
  const [searched, setSearched] = useState(false);

  const applyPreset = (id) => {
    const preset = (presets || []).find((p) => p._id === id);
    if (preset) setOe((prev) => ({ ...prev, width: preset.width, aspect: preset.aspect, rim: preset.rim }));
  };

  const runSearch = async (e) => {
    e.preventDefault();
    setSearched(true);
    await searchMutation.mutateAsync({
      width: Number(oe.width),
      aspect: Number(oe.aspect),
      rim: Number(oe.rim),
      targetRim: oe.targetRim ? Number(oe.targetRim) : undefined,
    });
  };

  const data = searchMutation.data;
  const results = data?.results || [];

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Plus Size Options"
        subtitle="Find alternate tire sizes that stay within tolerance of the OE overall diameter and tread width."
      />

      <form className="card tire-form" onSubmit={runSearch}>
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

        <div className="modal-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
          <button type="submit" className="btn btn-accent" disabled={searchMutation.isPending}>
            <Search size={16} /> {searchMutation.isPending ? "Searching…" : "Find matches"}
          </button>
        </div>
      </form>

      {searchMutation.isError && (
        <div className="alert-error" style={{ marginTop: 16 }}>
          {searchMutation.error?.response?.data?.message || "Search failed. Please try again."}
        </div>
      )}

      {data && (
        <div className="card compare-result-card" style={{ marginTop: 20 }}>
          <div className="speedo-banner ok">
            OE size <strong>{oe.width}/{oe.aspect} R{oe.rim}</strong> — overall height{" "}
            <strong>{data.oe.overallHeightIn}"</strong>, tread width <strong>{data.oe.treadWidthIn}"</strong>. Showing matches
            within ±{data.tolerances.heightPct}% height and ±{data.tolerances.treadPct}% tread width.
          </div>

          {results.length === 0 ? (
            <div className="empty-state-card">
              No saved tire sizes fall within tolerance. Add more sizes on the Tire Size Option page, or widen your target rim.
            </div>
          ) : (
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Overall height</th>
                  <th>Tread width</th>
                  <th>Height diff</th>
                  <th>Tread diff</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id}>
                    <td className="compare-table-value">
                      {r.label} — {r.width}/{r.aspect} R{r.rim}
                    </td>
                    <td>{r.overallHeightIn}"</td>
                    <td>{r.treadWidthIn}"</td>
                    <td style={{ color: Math.abs(r.heightDiffPct) < 0.01 ? "var(--color-mint)" : undefined }}>
                      {r.heightDiffPct >= 0 ? "+" : ""}{r.heightDiffPct}%
                    </td>
                    <td>{r.treadDiffPct >= 0 ? "+" : ""}{r.treadDiffPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!searched && (
        <div className="card empty-state-card" style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
          <TrendingUp size={18} />
          Enter an OE size above and search your saved tire library for the closest plus-size matches.
        </div>
      )}
    </div>
  );
}
