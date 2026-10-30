import { Box, Pencil, Plus, Trash2, FilterX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ConfirmDialog from "../components/confirmdialog";
import CustomerFormModal from "../components/CustomerFormModal";
import CustomerSelect from "../components/CustomerSelect";
import CursorPager from "../components/CursorPager";
import SearchAutocomplete from "../components/SearchAutocomplete";
import EditableSelect from "../components/EditableSelect";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useAuth } from "../context/authcontext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import { useCustomersQuery, useDeleteCustomer } from "../hooks/queries/useCustomers";
import {
  useCreateTireOption,
  useDeleteTireOption,
  useTireOptionSuggestions,
  useTireOptionsPage,
  useUpdateTireOption,
} from "../hooks/queries/useTireOptions";
import {
  useAddVehicleLookupMake,
  useDeleteVehicleLookupMake,
  useVehicleLookupMakes,
} from "../hooks/queries/useVehicleLookup";
import { tireDiameterInches } from "../utils/tireMath";
import { NUMERIC_INPUT_PROPS, TIRE_MAX, onlyDigits } from "../utils/validation";

const MOCK_PRESETS = [
  { _id: "t1", label: "Ford", make: "Ford", width: 225, aspect: 65, rim: 17 },
  { _id: "t2", label: "Toyota", make: "Toyota", width: 265, aspect: 70, rim: 17 },
  { _id: "t3", label: "Highway Comfort", make: "", width: 215, aspect: 60, rim: 16 },
];

// A preset has no free-text name — it's named after the entry picked from the
// "Preset name" dropdown, which is backed by the shared Vehicle Notes make
// list (saved as both `make` and `label`, since the Calculator, Comparison
// and Tech Data pages display `label`).
//
// `customer` is the _id of a customer ("" = none) — one of the shared customers,
// the same list Vehicle Notes uses. Only the link is saved with the preset.
const emptyForm = { make: "", width: 205, aspect: 55, rim: 16, customer: "" };
const emptyFilters = { search: "", exact: false, customer: "" };

export default function TireSizeOption() {
  const location = useLocation();
  const { user } = useAuth();
  // Preset create/edit/delete is for staff and admin (see
  // requireStaffOrAdminOnly on the server) — everyone else can still browse
  // the library, since the Calculator, Comparison and Plus Size pages all
  // read from it. Adding a name to the "Preset name" dropdown, and deleting
  // one from it, is for those same two roles.
  const isAdmin = user?.role === "admin";
  const canManagePresets = user?.role === "staff" || isAdmin;
  // Paginated: one page of 12 presets at a time, fetched from the server with
  // the search text (debounced) — never the whole library. See
  // hooks/queries/useCursorPagination.js.
  const [filters, setFilters] = useState(emptyFilters);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const debouncedExact = useDebouncedValue(filters.exact, 300); // true once a suggestion was picked
  const params = useMemo(
    () => ({ q: debouncedSearch.trim(), exact: debouncedExact ? "1" : "", customer: filters.customer }),
    [debouncedSearch, debouncedExact, filters.customer]
  );
  const pager = useTireOptionsPage(params);
  const { isLoading: loading, isError: presetsError, isPageChanging } = pager;
  const { suggestions, isFetching: suggesting } = useTireOptionSuggestions(debouncedSearch, !debouncedExact);
  const presets = presetsError ? MOCK_PRESETS : pager.items;
  const createMutation = useCreateTireOption();
  const updateMutation = useUpdateTireOption();
  const deleteMutation = useDeleteTireOption();

  // The "Preset name" dropdown. Same data source, same dynamic behavior as
  // the Vehicle Notes "Add / Edit vehicle" form's Make field (see
  // hooks/queries/useVehicleLookup.js) — reusing the exact EditableSelect
  // component. The name you pick is the preset's name, and it's stored on the
  // preset as `make` (and mirrored to `label`).
  //
  // Heads up: this list IS the shared Vehicle Notes make list, so it isn't a
  // private set of preset names. Adding one adds a Make there (on its own, no
  // Model/Type needed); deleting one removes that Make — and its Models and
  // Types — from the Vehicle Notes database. The confirm dialog below spells
  // that out. Both are available to staff and admin.
  const { data: vehicleMakes, isLoading: loadingVehicleMakes } = useVehicleLookupMakes();
  const addMakeMutation = useAddVehicleLookupMake();
  const deleteMakeMutation = useDeleteVehicleLookupMake();

  // Customers: staff and admin can add; only admin can edit and delete (the
  // server enforces the same). Everyone else never sees customer data, so the
  // list isn't even requested for them. This is the same shared customer list
  // (and the same add / edit / delete) as the Vehicle Notes page.
  const { data: customers, isLoading: loadingCustomers } = useCustomersQuery({ enabled: canManagePresets });
  const deleteCustomerMutation = useDeleteCustomer();
  const [customerModal, setCustomerModal] = useState({ open: false, customer: null });
  const [customerDelete, setCustomerDelete] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewPreset, setPreviewPreset] = useState(null);
  const [makeToDelete, setMakeToDelete] = useState(null);

  const filtersActive = Boolean(filters.search.trim() || filters.customer);
  const clearFilters = () => setFilters(emptyFilters);

  // Customer filter options — the customer's name, plus their email when
  // another customer shares that exact name (only email/phone are unique).
  const customerFilterOptions = useMemo(() => {
    const list = customers || [];
    const nameCount = list.reduce((acc, c) => ({ ...acc, [c.fullName.toLowerCase()]: (acc[c.fullName.toLowerCase()] || 0) + 1 }), {});
    return list.map((c) => ({
      value: c._id,
      label: nameCount[c.fullName.toLowerCase()] > 1 ? `${c.fullName} (${c.email})` : c.fullName,
    }));
  }, [customers]);

  // The customer picked in the Add / Edit form, for the read-only email/phone
  // fields — from the prefetched list, or (while that loads) the preset's own
  // populated customer.
  const selectedCustomer = useMemo(() => {
    if (!form.customer) return null;
    const fromList = (customers || []).find((c) => c._id === form.customer);
    if (fromList) return fromList;
    return editing?.customer && editing.customer._id === form.customer ? editing.customer : null;
  }, [customers, form.customer, editing]);

  // Search (preset name, size, or customer name for staff / admin) and the
  // customer filter run on the server, so `presets` is already the page to show.
  const filteredPresets = presets;
  const hasAnyPreset = (pager.total ?? 0) > 0 || presets.length > 0 || filtersActive;

  // Arrived here via a "Saved preset" suggestion chip elsewhere in the app —
  // open the add-preset form pre-loaded with that size so it's one click
  // away from being saved for real.
  useEffect(() => {
    const prefill = location.state?.prefillPreset;
    if (prefill && canManagePresets) {
      setEditing(null);
      setForm({ make: prefill.make || "", width: prefill.width, aspect: prefill.aspect, rim: prefill.rim, customer: "" });
      setFormError("");
      setFormOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    // The preset's name is what the card shows: `label`. `make` mirrors it
    // when the server stores it, but it isn't always saved, so fall back to
    // the label — otherwise the "Preset name" field opens blank.
    const presetName = p.make || p.label || "";
    // Reuse the dropdown's own spelling when the name matches a known one only
    // by letter case ("BENTLEY" vs "Bentley"), so it shows as selected.
    const knownMake = (vehicleMakes || []).find((m) => m.toLowerCase() === presetName.toLowerCase());
    // The customer arrives populated ({ _id, fullName, ... }); tolerate a bare
    // id too so the field is never left blank for a preset that has one.
    const customerId = typeof p.customer === "string" ? p.customer : p.customer?._id || "";
    setForm({ make: knownMake || presetName, width: p.width, aspect: p.aspect, rim: p.rim, customer: customerId });
    setFormError("");
    setFormOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const typedMake = String(form.make || "").trim();
    if (!typedMake || !form.width || !form.aspect || !form.rim) {
      setFormError("Choose a preset name and fill in width, aspect and rim.");
      return;
    }
    // A typed make that matches an existing one only by letter case ("ford")
    // reuses the existing spelling instead of creating a near-duplicate.
    const existingMake = (vehicleMakes || []).find((m) => m.toLowerCase() === typedMake.toLowerCase());
    const make = existingMake || typedMake;
    // customer: "" detaches the customer when editing (the server unsets it).
    const payload = { label: make, make, width: Number(form.width), aspect: Number(form.aspect), rim: Number(form.rim), customer: form.customer || "" };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setFormOpen(false);

      // Best-effort: a name that isn't in the dropdown yet was typed via
      // "+ Add new preset name…" — save it into the shared Make list so it's a
      // real option from now on. Never blocks or fails the preset save above.
      // Skipped when editing a preset without changing its name, so an older
      // preset whose name was since deleted doesn't bring it back.
      const isNewMake = !existingMake && make !== (editing?.make || editing?.label);
      if (canManagePresets && isNewMake) {
        addMakeMutation.mutate(make, { onError: () => { } });
      }
    } catch (err) {
      setFormError(err?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Staff/admin: delete a name from the "Preset name" dropdown (see
  // EditableSelect's onDeleteOption) — which is the shared Vehicle Notes make
  // list, so this removes the Make there too. If it's the one currently
  // selected it's cleared first — before the list refetches without it, which
  // the select would otherwise misread as a hand-typed value — and put back
  // if the delete fails.
  const confirmDeleteMake = async () => {
    const make = makeToDelete;
    if (!make) return;
    const wasSelected = form.make === make;
    setFormError("");
    if (wasSelected) setForm((f) => ({ ...f, make: "" }));
    try {
      await deleteMakeMutation.mutateAsync(make);
    } catch (err) {
      if (wasSelected) setForm((f) => ({ ...f, make }));
      setFormError(err?.response?.data?.message || "Couldn't delete that preset name. Please try again.");
    } finally {
      setMakeToDelete(null);
    }
  };

  // --- Customers (dropdown on the Add / Edit preset form) ---
  // A newly added customer is selected straight away; an edited one keeps the
  // current selection (and the lists refresh on their own).
  const onCustomerSaved = (saved, wasNew) => {
    if (wasNew && saved?._id) setForm((f) => ({ ...f, customer: saved._id }));
  };

  const confirmDeleteCustomer = async () => {
    if (!customerDelete) return;
    const { _id } = customerDelete;
    try {
      await deleteCustomerMutation.mutateAsync(_id);
      setForm((f) => (f.customer === _id ? { ...f, customer: "" } : f));
      setFilters((f) => (f.customer === _id ? { ...f, customer: "" } : f));
    } catch (err) {
      setFormError(err?.response?.data?.message || "Couldn't delete that customer. Please try again.");
    } finally {
      setCustomerDelete(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Tire Size Option"
        subtitle="Save the tire sizes so they're one click away."
        action={
          canManagePresets && (
            <button type="button" className="btn btn-accent" onClick={openAdd}>
              <Plus size={16} /> Add preset
            </button>
          )
        }
      />

      {!loading && hasAnyPreset && (
        <div className={`card vehicle-filter-bar mb-20${canManagePresets ? "" : " preset-search-bar"}`}>
          <SearchAutocomplete
            value={filters.search}
            onChange={(search, picked = false) => setFilters((f) => ({ ...f, search, exact: picked }))}
            suggestions={suggestions}
            loading={suggesting}
            placeholder={canManagePresets ? "Search by preset name, tire size or customer name…" : "Search by preset name or tire size…"}
            ariaLabel="Search presets"
          />
          {canManagePresets && (
            <div className="preset-filter-grid">
              <div className="field">
                <label>Customer</label>
                <select value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))}>
                  <option value="">All customers</option>
                  {customerFilterOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <button type="button" className="btn btn-ghost vehicle-filter-clear" onClick={clearFilters} disabled={!filtersActive}>
                <FilterX size={14} /> Clear filter
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading presets…</p>
      ) : filteredPresets.length === 0 ? (
        <div className="card empty-state-block">
          {filtersActive
            ? "No presets match the current filters."
            : `No tire presets yet${canManagePresets ? " — add your first one." : "."}`}
        </div>
      ) : (
        <div className={`preset-grid${isPageChanging ? " list-updating" : ""}`}>
          {filteredPresets.map((p) => (
            <div key={p._id} className="card preset-card">
              <div className="preset-info">
                <p className="preset-label">{p.label}</p>
                {p.make && p.make !== p.label && <span className="badge badge-model mb-4">{p.make}</span>}
                {p.customer && (
                  <p className="vehicle-customer fs-11 mt-4">
                    <strong>{p.customer.fullName}</strong>
                    <span className="text-muted">{[p.customer.email, p.customer.phone].filter(Boolean).join(" · ")}</span>
                  </p>
                )}
                <p className="preset-size">
                  {p.width}/{p.aspect}R{p.rim}
                </p>
                <p className="preset-diameter">≈ {tireDiameterInches(p).toFixed(1)}" diameter</p>
                <button type="button" className="tire3d-modal-trigger" onClick={() => setPreviewPreset(p)}>
                  <Box size={13} /> Preview in 3D
                </button>
              </div>
              {canManagePresets && (
                <div className="preset-actions">
                  <button type="button" className="icon-btn" onClick={() => openEdit(p)} title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(p)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!presetsError && <CursorPager pager={pager} noun="presets" />}

      <Modal open={!!previewPreset} onClose={() => setPreviewPreset(null)} title={previewPreset?.label || "3D preview"} width={420}>
        {previewPreset && (
          <>
            <Tire3DVisualizer
              tire={previewPreset}
              label={`${previewPreset.width}/${previewPreset.aspect}R${previewPreset.rim} · ≈ ${tireDiameterInches(previewPreset).toFixed(1)}" diameter`}
              accent="#FF6F91"
              height={280}
              zoomable
              variant="option-preview"
            />
            {/* <TireSuggestions tire={previewPreset} /> */}
          </>
        )}
      </Modal>

      {canManagePresets && (
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit preset" : "Add preset"} width={400}>
          <form onSubmit={submitForm}>
            {formError && (
              <div className="alert-error">
                {formError}
              </div>
            )}
            <div className="field-mb">
              <EditableSelect
                label="Preset name"
                value={form.make}
                onChange={(val) => setForm((f) => ({ ...f, make: val }))}
                options={vehicleMakes}
                loading={loadingVehicleMakes}
                placeholder="Select preset name"
                addNewLabel="+ Add new preset name…"
                customPlaceholder="e.g. Ford"
                canAddNew={canManagePresets}
                onDeleteOption={canManagePresets ? setMakeToDelete : undefined}
              />
            </div>
            <div className="preset-form-grid">
              <div className="field">
                <label htmlFor="pWidth">Width (mm)</label>
                <input id="pWidth" {...NUMERIC_INPUT_PROPS} maxLength={TIRE_MAX.width} value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: onlyDigits(e.target.value, TIRE_MAX.width) }))} />
              </div>
              <div className="field">
                <label htmlFor="pAspect">Aspect (%)</label>
                <input id="pAspect" {...NUMERIC_INPUT_PROPS} maxLength={TIRE_MAX.aspect} value={form.aspect} onChange={(e) => setForm((f) => ({ ...f, aspect: onlyDigits(e.target.value, TIRE_MAX.aspect) }))} />
              </div>
              <div className="field">
                <label htmlFor="pRim">Rim (in)</label>
                <input id="pRim" {...NUMERIC_INPUT_PROPS} maxLength={TIRE_MAX.rim} value={form.rim} onChange={(e) => setForm((f) => ({ ...f, rim: onlyDigits(e.target.value, TIRE_MAX.rim) }))} />
              </div>
            </div>

            {/* Customer — staff and admin only (this whole form is). Options
                read "Full name (email)". Staff and admin can add a customer
                from the dropdown; only admin gets the edit / delete buttons.
                Picking a customer prefills the (read-only) email and phone
                below. The customer list is shared with Vehicle Notes. */}
            <div className="field-mb">
              <CustomerSelect
                value={form.customer}
                customers={customers}
                loading={loadingCustomers}
                onChange={(id) => setForm((f) => ({ ...f, customer: id }))}
                onAdd={() => setCustomerModal({ open: true, customer: null })}
                onEdit={isAdmin ? (c) => setCustomerModal({ open: true, customer: c }) : undefined}
                onDelete={isAdmin ? (c) => setCustomerDelete(c) : undefined}
              />
              <div className="tire-input-grid cols-2 mt-10">
                <div className="field">
                  <label>Customer email</label>
                  <input type="email" value={selectedCustomer?.email || ""} placeholder="Select a customer" readOnly />
                </div>
                <div className="field">
                  <label>Customer phone</label>
                  <input type="tel" value={selectedCustomer?.phone || ""} placeholder="Select a customer" readOnly />
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-accent" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add preset"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {canManagePresets && (
        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          title="Delete preset"
          message={`Remove "${deleteTarget?.label}"? This can't be undone.`}
        />
      )}

      {/* Rendered outside the preset form on purpose: a submit inside this
          modal would otherwise bubble through the portal to the preset form. */}
      {canManagePresets && (
        <CustomerFormModal
          open={customerModal.open}
          customer={customerModal.customer}
          onClose={() => setCustomerModal((m) => ({ ...m, open: false }))}
          onSaved={(saved) => onCustomerSaved(saved, !customerModal.customer)}
        />
      )}

      {isAdmin && (
        <ConfirmDialog
          open={!!customerDelete}
          onClose={() => setCustomerDelete(null)}
          onConfirm={confirmDeleteCustomer}
          busy={deleteCustomerMutation.isPending}
          title="Delete customer"
          message={`Delete ${customerDelete?.fullName || "this customer"} (${customerDelete?.email || ""})? This customer is shared with Vehicle Notes, so they'll be removed from any vehicle notes, saved comparisons and tire presets they're attached to — the vehicles and presets themselves are kept. This can't be undone.`}
        />
      )}

      {canManagePresets && (
        <ConfirmDialog
          open={!!makeToDelete}
          onClose={() => setMakeToDelete(null)}
          onConfirm={confirmDeleteMake}
          busy={deleteMakeMutation.isPending}
          title="Delete preset name"
          message={`Delete "${makeToDelete}" from the preset name list? This list is shared with Vehicle Notes, so "${makeToDelete}" is removed from the make dropdown there — along with its models and types. Saved tire presets and vehicle notes keep their name.`}
        />
      )}
    </div>
  );
}