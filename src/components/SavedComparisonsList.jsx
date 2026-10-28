import { ArrowUp, ChevronLeft, ChevronRight, FilterX, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../context/authcontext";
import { useSavedComparisonsQuery } from "../hooks/queries/useSavedComparisons";

const PAGE_SIZE = 10;

// Same filter set as the Vehicle Notes page: search + Make, Model, Type,
// Customer (staff / admin only) and a Year from / Year to range.
const emptyFilters = { search: "", make: "", model: "", type: "", customer: "", yearFrom: "", yearTo: "" };

const tireLabel = (t) => (t?.width ? `${t.width}/${t.aspect} R${t.rim}` : "—");

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

/**
 * "Saved comparisons" — the details listing at the end of the Tire Size
 * Comparison page. Shows every comparison saved from the "Save comparison"
 * popup, with the same search bar + filter bar (and the same look) as the
 * Vehicle Notes page.
 *
 * The filter dropdowns are built from the saved comparisons themselves, so
 * they only ever offer values that will actually match something, and they
 * work for everyone who can open the page (the Make / Model / Type / Year
 * lookup lists need Vehicle Notes or Save-comparison access). Make -> Model ->
 * Type still cascade exactly like Vehicle Notes: changing an upstream filter
 * clears whichever downstream filter is no longer a valid combination.
 *
 * Each row has an "Apply" button that loads that saved comparison's Tire A and
 * Tire B into the comparison at the top of the page (`onApply(tireA, tireB, row)`).
 *
 * Customer name / email / phone are personal data: the server only sends them
 * to staff and admin, so the Customer search term, filter and column exist
 * for those roles only.
 */
export default function SavedComparisonsList({ onApply }) {
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  const { data, isLoading, isError } = useSavedComparisonsQuery();
  const comparisons = useMemo(() => data || [], [data]);

  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);

  // Any filter change goes back to the first page of results.
  const patchFilters = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  // --- Filter option lists, derived from what has actually been saved ---
  const makeOptions = useMemo(() => uniqueSorted(comparisons.map((c) => c.make)), [comparisons]);

  // Model options need a Make, Type options need a Make + Model (as on Vehicle Notes).
  const modelOptions = useMemo(
    () => (filters.make ? uniqueSorted(comparisons.filter((c) => c.make === filters.make).map((c) => c.model)) : []),
    [comparisons, filters.make]
  );
  const typeOptions = useMemo(
    () =>
      filters.make && filters.model
        ? uniqueSorted(comparisons.filter((c) => c.make === filters.make && c.model === filters.model).map((c) => c.type))
        : [],
    [comparisons, filters.make, filters.model]
  );

  const yearOptions = useMemo(
    () =>
      [...new Set(comparisons.map((c) => Number(c.year)).filter((y) => Number.isFinite(y) && y > 0))].sort((a, b) => a - b),
    [comparisons]
  );

  // Customer options — the customer's name, plus their email when another
  // customer shares that exact name (only email / phone are unique).
  const customerOptions = useMemo(() => {
    const byId = new Map();
    comparisons.forEach((c) => {
      if (c.customer?._id) byId.set(c.customer._id, c.customer);
    });
    const list = [...byId.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
    const nameCount = list.reduce((acc, c) => ({ ...acc, [c.fullName.toLowerCase()]: (acc[c.fullName.toLowerCase()] || 0) + 1 }), {});
    return list.map((c) => ({
      value: c._id,
      label: nameCount[c.fullName.toLowerCase()] > 1 ? `${c.fullName} (${c.email})` : c.fullName,
    }));
  }, [comparisons]);

  const filtersActive = Boolean(
    filters.search.trim() || filters.make || filters.model || filters.type || filters.customer || filters.yearFrom || filters.yearTo
  );

  // Filtering keeps the API's order (newest first).
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return comparisons.filter((c) => {
      // Search box: vehicle name, make, model, type or customer name.
      if (q) {
        const haystack = [c.name, c.make, c.model, c.type, c.customer?.fullName];
        if (!haystack.some((field) => field && String(field).toLowerCase().includes(q))) return false;
      }
      if (filters.customer && c.customer?._id !== filters.customer) return false;
      if (filters.make && c.make !== filters.make) return false;
      if (filters.model && c.model !== filters.model) return false;
      if (filters.type && c.type !== filters.type) return false;
      const y = Number(c.year);
      if (filters.yearFrom && (!Number.isFinite(y) || y < Number(filters.yearFrom))) return false;
      if (filters.yearTo && (!Number.isFinite(y) || y > Number(filters.yearTo))) return false;
      return true;
    });
  }, [comparisons, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages); // e.g. a save/delete elsewhere shrank the list
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);

  return (
    <section className="saved-comparisons" aria-labelledby="saved-comparisons-title">
      <div className="section-title-row">
        <div>
          <h3 id="saved-comparisons-title">Saved comparisons</h3>
          <p>
            {isLoading
              ? "Loading…"
              : filtersActive
                ? `${filtered.length} of ${comparisons.length} saved comparison${comparisons.length === 1 ? "" : "s"}`
                : `${comparisons.length} saved comparison${comparisons.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="card vehicle-filter-bar mb-20">
        <div className="search-box vehicle-search">
          <Search size={16} color="var(--color-muted)" />
          <input
            type="search"
            placeholder={isStaffOrAdmin ? "Search by vehicle name, make, model, type or customer name…" : "Search by vehicle name, make, model or type…"}
            value={filters.search}
            onChange={(e) => patchFilters({ search: e.target.value })}
            aria-label="Search saved comparisons"
          />
        </div>
        <div className={`vehicle-filter-grid${isStaffOrAdmin ? " with-customer" : ""}`}>
          <div className="field">
            <label>Make</label>
            <select value={filters.make} onChange={(e) => patchFilters({ make: e.target.value, model: "", type: "" })}>
              <option value="">All makes</option>
              {makeOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Model</label>
            <select value={filters.model} onChange={(e) => patchFilters({ model: e.target.value, type: "" })}>
              <option value="">All models</option>
              {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={filters.type} onChange={(e) => patchFilters({ type: e.target.value })}>
              <option value="">All types</option>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {isStaffOrAdmin && (
            <div className="field">
              <label>Customer</label>
              <select value={filters.customer} onChange={(e) => patchFilters({ customer: e.target.value })}>
                <option value="">All customers</option>
                {customerOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label>Year from</label>
            <select value={filters.yearFrom} onChange={(e) => patchFilters({ yearFrom: e.target.value })}>
              <option value="">Any</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Year to</label>
            <select value={filters.yearTo} onChange={(e) => patchFilters({ yearTo: e.target.value })}>
              <option value="">Any</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-ghost vehicle-filter-clear" onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={14} /> Clear filter
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted">Loading saved comparisons…</p>
      ) : isError ? (
        <div className="card empty-state-card text-muted">Couldn't load the saved comparisons. Please try again.</div>
      ) : comparisons.length === 0 ? (
        <div className="card empty-state-card text-muted">No saved comparisons yet — use “Save comparison” above to add one.</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state-card text-muted">No saved comparisons match the current filters.</div>
      ) : (
        <div className="card saved-comparisons-card">
          <div className="table-responsive">
            <table className="user-table saved-comparisons-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Year</th>
                  {isStaffOrAdmin && <th>Customer</th>}
                  <th>Tire A</th>
                  <th>Tire B</th>
                  <th>Speedo diff</th>
                  <th>Saved on</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const diff = c.comparison?.diffPct;
                  const hasDiff = Number.isFinite(diff);
                  return (
                    <tr key={c._id}>
                      <td>
                        <p className="saved-vehicle-name">{c.name}</p>
                        <div className="saved-vehicle-tags">
                          <span className="badge badge-live">{c.make}</span>
                          <span className="badge badge-model">{c.model}</span>
                          <span className="badge badge-model">{c.type}</span>
                        </div>
                      </td>
                      <td className="text-muted">{c.year || "—"}</td>
                      {isStaffOrAdmin && (
                        <td>
                          {c.customer ? (
                            <p className="vehicle-customer fs-11">
                              <strong>{c.customer.fullName}</strong>
                              <span className="text-muted">{[c.customer.email, c.customer.phone].filter(Boolean).join(" · ")}</span>
                            </p>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      )}
                      <td className="fw-600 saved-nowrap">{tireLabel(c.comparison?.tireA)}</td>
                      <td className="fw-600 saved-nowrap">{tireLabel(c.comparison?.tireB)}</td>
                      <td className="saved-nowrap">
                        {hasDiff ? (
                          <span className={`saved-diff ${Math.abs(diff) > 3 ? "warn" : "ok"}`}>
                            {diff >= 0 ? "+" : ""}{diff.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-muted saved-nowrap">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost saved-apply-btn"
                          onClick={() => onApply?.(c.comparison.tireA, c.comparison.tireB, c)}
                          disabled={!onApply || !c.comparison?.tireA || !c.comparison?.tireB}
                          title="Load these two tires into the comparison above"
                          aria-label={`Apply ${c.name} to the current comparison`}
                        >
                          <ArrowUp size={14} /> Apply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="saved-pagination">
              <span className="text-muted fs-11">
                Showing {firstIndex + 1}–{Math.min(firstIndex + PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="saved-pagination-controls">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="fs-11">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
