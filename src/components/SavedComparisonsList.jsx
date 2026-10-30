import { ArrowUp, FilterX } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../context/authcontext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useCustomersQuery } from "../hooks/queries/useCustomers";
import {
  useSavedComparisonFacets,
  useSavedComparisonSuggestions,
  useSavedComparisonsPage,
} from "../hooks/queries/useSavedComparisons";
import CursorPager from "./CursorPager";
import SearchAutocomplete from "./SearchAutocomplete";

// Same filter set as the Vehicle Notes page: search + Make, Model, Type,
// Customer (staff / admin only) and a Year from / Year to range.
const emptyFilters = { search: "", exact: false, make: "", model: "", type: "", customer: "", yearFrom: "", yearTo: "" };

const tireLabel = (t) => (t?.width ? `${t.width}/${t.aspect} R${t.rim}` : "—");

/**
 * "Saved comparisons" — the details listing at the end of the Tire Size
 * Comparison page. Shows every comparison saved from the "Save comparison"
 * popup, with the same search bar + filter bar (and the same look) as the
 * Vehicle Notes page.
 *
 * The table is paginated on the server (10 rows per page, cursor based) and the
 * search box has type-ahead suggestions, so only the rows on screen are ever
 * fetched. The filter dropdowns come from the server's /facets endpoint — the
 * values actually saved — so they only offer values that will match something.
 * Make -> Model -> Type still cascade exactly like Vehicle Notes: changing an
 * upstream filter clears whichever downstream filter is no longer valid.
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

  const [filters, setFilters] = useState(emptyFilters);

  // The search text updates on every keystroke; the list and the suggestions
  // follow it once typing pauses.
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const debouncedExact = useDebouncedValue(filters.exact, 300); // true once a suggestion was picked
  const params = useMemo(
    () => ({
      q: debouncedSearch.trim(),
      exact: debouncedExact ? "1" : "",
      make: filters.make,
      model: filters.model,
      type: filters.type,
      customer: isStaffOrAdmin ? filters.customer : "",
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
    }),
    [debouncedSearch, debouncedExact, filters.make, filters.model, filters.type, filters.customer, filters.yearFrom, filters.yearTo, isStaffOrAdmin]
  );

  const pager = useSavedComparisonsPage(params);
  const { items: visible, isLoading, isError, isPageChanging, total } = pager;
  const { suggestions, isFetching: suggesting } = useSavedComparisonSuggestions(debouncedSearch, !debouncedExact);

  // Filter option lists (Make / Model / Type cascade, years on file).
  const { data: facets } = useSavedComparisonFacets({ make: filters.make, model: filters.model });
  const makeOptions = facets?.makes ?? [];
  const modelOptions = filters.make ? facets?.models ?? [] : [];
  const typeOptions = filters.make && filters.model ? facets?.types ?? [] : [];
  const yearOptions = facets?.years ?? [];

  // Customers (staff / admin only) — the same shared list Vehicle Notes uses.
  // The customer's name, plus their email when another customer shares that exact name.
  const { data: customers } = useCustomersQuery({ enabled: isStaffOrAdmin });
  const customerOptions = useMemo(() => {
    const list = customers || [];
    const nameCount = list.reduce((acc, c) => ({ ...acc, [c.fullName.toLowerCase()]: (acc[c.fullName.toLowerCase()] || 0) + 1 }), {});
    return list.map((c) => ({
      value: c._id,
      label: nameCount[c.fullName.toLowerCase()] > 1 ? `${c.fullName} (${c.email})` : c.fullName,
    }));
  }, [customers]);

  // Any filter change goes back to the first page of results (the pager does
  // that by itself when the params change).
  const patchFilters = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const clearFilters = () => setFilters(emptyFilters);

  const filtersActive = Boolean(
    filters.search.trim() || filters.make || filters.model || filters.type || filters.customer || filters.yearFrom || filters.yearTo
  );

  return (
    <section className="saved-comparisons" aria-labelledby="saved-comparisons-title">
      <div className="section-title-row">
        <div>
          <h3 id="saved-comparisons-title">Saved comparisons</h3>
          <p>
            {isLoading
              ? "Loading…"
              : total != null
                ? `About ${total.toLocaleString()} saved comparison${total === 1 ? "" : "s"}`
                : visible.length > 0
                  ? `Page ${pager.page} · ${visible.length} shown${pager.hasNext ? " · more available" : ""}`
                  : ""}
          </p>
        </div>
      </div>

      <div className="card vehicle-filter-bar mb-20">
        <SearchAutocomplete
          value={filters.search}
          onChange={(search, picked = false) => patchFilters({ search, exact: picked })}
          suggestions={suggestions}
          loading={suggesting}
          placeholder={isStaffOrAdmin ? "Search by vehicle name, make, model, type, tire size or customer name…" : "Search by vehicle name, make, model, type or tire size…"}
          ariaLabel="Search saved comparisons"
        />
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
      ) : visible.length === 0 ? (
        <div className="card empty-state-card text-muted">
          {filtersActive ? "No saved comparisons match the current filters." : "No saved comparisons yet — use “Save comparison” above to add one."}
        </div>
      ) : (
        <div className="card saved-comparisons-card">
          {pager.searchMode === "text" && (
            <p className="text-muted fs-11 search-note p-14">No exact matches — showing related results.</p>
          )}
          <div className={`table-responsive${isPageChanging ? " list-updating" : ""}`}>
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

          <CursorPager pager={pager} noun="comparisons" />
        </div>
      )}
    </section>
  );
}
