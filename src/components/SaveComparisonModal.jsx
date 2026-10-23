import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "./confirmdialog";
import CustomerFormModal from "./CustomerFormModal";
import CustomerSelect from "./CustomerSelect";
import EditableSelect from "./EditableSelect";
import Modal from "./modal";
import { useAuth } from "../context/authcontext";
import { NUMERIC_INPUT_PROPS, TIRE_MAX, onlyDigits } from "../utils/validation";
import { useCustomersQuery, useDeleteCustomer } from "../hooks/queries/useCustomers";
import { useCreateSavedComparison } from "../hooks/queries/useSavedComparisons";
import {
  useDeleteVehicleLookupMake,
  useDeleteVehicleLookupModel,
  useDeleteVehicleLookupType,
  useDeleteVehicleLookupYear,
  useQuickAddVehicleLookup,
  useQuickAddVehicleLookupYear,
  useVehicleLookupMakes,
  useVehicleLookupModels,
  useVehicleLookupTypes,
  useVehicleLookupYears,
} from "../hooks/queries/useVehicleLookup";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * "Save comparison" popup for the Tire Size Comparison page.
 *
 * Collects the same vehicle details as the Vehicle Notes "Add vehicle" form —
 * name, Make -> Model -> Type (cascading), Year, engine + tyre spec, a
 * multi-photo gallery and (staff / admin) a customer — with the same
 * predefined, dynamic dropdowns (EditableSelect + the Vehicle Notes database),
 * the same "+ Add new…" / delete rules, the same customer dropdown (same
 * Customer data, same add / edit / delete rules) and the same validation.
 *
 * A comparison is a plain Tire A vs Tire B, so there is ONE engine spec and ONE
 * tyre spec — no Existing / Upgraded pair.
 *
 * On submit it saves to the separate "saved comparisons" collection (not a
 * Vehicle Note), then calls `onSaveComparison(saved)` so the page can log the
 * comparison to recent activity. Mount it only while it should be open, so every
 * open starts from a fresh form.
 */
export default function SaveComparisonModal({ tireA, tireB, diffPct, onClose, onSaveComparison }) {
  const { user } = useAuth();
  // Same rule as pages/vehiclenotes.jsx: staff and admin can grow / prune the
  // predefined Make, Model, Type and Year lists (the server enforces it too).
  // All four dropdowns share this one flag so they render the same way.
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  // Customers: staff and admin can add; only admin can edit and delete (the
  // server enforces the same). Everyone else never sees customer data, so the
  // list isn't even requested for them — same as the Vehicle Notes page.
  const isAdmin = user?.role === "admin";
  const { data: customers, isLoading: loadingCustomers } = useCustomersQuery({ enabled: isStaffOrAdmin });
  const deleteCustomerMutation = useDeleteCustomer();
  const [customerModal, setCustomerModal] = useState({ open: false, customer: null });
  const [customerDelete, setCustomerDelete] = useState(null);

  const [form, setForm] = useState({
    name: "",
    make: "",
    model: "",
    type: "",
    year: "",
    gallery: [],
    customer: "", // customer _id ("" = none)
    engine: "",
    tyre: { width: "", aspect: "", rim: "" },
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  // If the comparison saved but logging it to recent activity failed, a retry
  // must not save it a second time.
  const savedRef = useRef(null);

  const createComparison = useCreateSavedComparison();
  const quickAddLookup = useQuickAddVehicleLookup();
  const quickAddLookupYear = useQuickAddVehicleLookupYear();

  // Cascading Make -> Model -> Type, plus an independent Year list — all
  // sourced from the Vehicle Notes database.
  const { data: lookupMakes, isLoading: loadingLookupMakes } = useVehicleLookupMakes();
  const { data: lookupModels, isLoading: loadingLookupModels } = useVehicleLookupModels(form.make);
  const { data: lookupTypes, isLoading: loadingLookupTypes } = useVehicleLookupTypes(form.make, form.model);
  const { data: lookupYears, isLoading: loadingLookupYears } = useVehicleLookupYears();

  // Deleting an entry from the dropdown lists. `lookupDelete` is the pending
  // confirmation: { kind, make, model, type, value }.
  const deleteLookupMake = useDeleteVehicleLookupMake();
  const deleteLookupModel = useDeleteVehicleLookupModel();
  const deleteLookupType = useDeleteVehicleLookupType();
  const deleteLookupYear = useDeleteVehicleLookupYear();
  const [lookupDelete, setLookupDelete] = useState(null);
  const lookupDeleting =
    deleteLookupMake.isPending ||
    deleteLookupModel.isPending ||
    deleteLookupType.isPending ||
    deleteLookupYear.isPending;

  // Changing an upstream field clears the downstream ones, so an invalid
  // Make / Model / Type combination can never be submitted.
  const onFormMakeChange = (value) => setForm((f) => ({ ...f, make: value, model: "", type: "" }));
  const onFormModelChange = (value) => setForm((f) => ({ ...f, model: value, type: "" }));

  // Most Make/Model combinations map to exactly one Type — auto-fill it once
  // it's the only option, without blocking manual re-selection.
  useEffect(() => {
    if (lookupTypes && lookupTypes.length === 1 && !form.type) {
      setForm((f) => (f.make && f.model && !f.type ? { ...f, type: lookupTypes[0] } : f));
    }
  }, [lookupTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTyre = (patch) => setForm((f) => ({ ...f, tyre: { ...f.tyre, ...patch } }));

  // A newly added customer is selected straight away; an edited one keeps the
  // current selection and the prefilled email / phone refresh with the list.
  const onCustomerSaved = (saved, wasNew) => {
    if (wasNew && saved?._id) setForm((f) => ({ ...f, customer: saved._id }));
  };

  const selectedCustomer = (customers || []).find((c) => c._id === form.customer) || null;

  const confirmDeleteCustomer = async () => {
    if (!customerDelete) return;
    const { _id } = customerDelete;
    try {
      await deleteCustomerMutation.mutateAsync(_id);
      setForm((f) => (f.customer === _id ? { ...f, customer: "" } : f));
    } catch (err) {
      setFormError(err?.response?.data?.message || "Couldn't delete that customer. Please try again.");
    } finally {
      setCustomerDelete(null);
    }
  };

  const onGalleryFilesChange = async (e) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    setForm((f) => ({ ...f, gallery: [...f.gallery, ...dataUrls] }));
    input.value = "";
  };

  const removeGalleryPhotoAt = (index) => {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== index) }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError("");
    // Same rule as the Vehicle Notes form (and the server).
    if (!form.name.trim() || !form.make || !form.model || !form.type) {
      setFormError("Vehicle name, make, model and type are required.");
      return;
    }

    setSaving(true);
    try {
      if (!savedRef.current) {
        // The customer field only exists for staff and admin — everyone else's
        // save must leave it out entirely (the server rejects it from them).
        const { customer, ...formWithoutCustomer } = form;
        const payload = {
          ...formWithoutCustomer,
          name: form.name.trim(),
          tireA,
          tireB,
          diffPct,
          ...(isStaffOrAdmin ? { customer } : {}),
        };
        savedRef.current = await createComparison.mutateAsync(payload);

        // Best-effort: fold a typed-in ("+ Add new…") Make/Model/Type/Year back
        // into the predefined lists, exactly like the Vehicle Notes form does.
        // Never blocks the save and never surfaces an error.
        if (isStaffOrAdmin) {
          quickAddLookup.mutate({ make: form.make, model: form.model, type: form.type }, { onError: () => { } });
          if (form.year) quickAddLookupYear.mutate(form.year, { onError: () => { } });
        }
      }
      await onSaveComparison(savedRef.current);
      onClose();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setFormError(
        savedRef.current
          ? apiMessage || "The comparison was saved, but it couldn't be added to recent activity. Please try again."
          : apiMessage || "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete one entry from the Make / Model / Type / Year dropdown data.
  // Anything on the form that's about to disappear is cleared first, and put
  // back if the delete fails — same behaviour as the Vehicle Notes form.
  const confirmDeleteLookup = async () => {
    if (!lookupDelete) return;
    const { kind, make, model, type, value } = lookupDelete;
    const previous = { make: form.make, model: form.model, type: form.type, year: form.year };
    const clearsForm =
      (kind === "make" && form.make === value) ||
      (kind === "model" && form.make === make && form.model === value) ||
      (kind === "type" && form.make === make && form.model === model && form.type === value) ||
      (kind === "year" && form.year === value);

    setFormError("");
    if (clearsForm) {
      if (kind === "make") onFormMakeChange("");
      else if (kind === "model") onFormModelChange("");
      else if (kind === "year") setForm((f) => ({ ...f, year: "" }));
      else setForm((f) => ({ ...f, type: "" }));
    }

    try {
      if (kind === "make") await deleteLookupMake.mutateAsync(value);
      else if (kind === "model") await deleteLookupModel.mutateAsync({ make, model: value });
      else if (kind === "year") await deleteLookupYear.mutateAsync(value);
      else await deleteLookupType.mutateAsync({ make, model, type: value });
    } catch (err) {
      if (clearsForm) setForm((f) => ({ ...f, ...previous }));
      setFormError(err?.response?.data?.message || `Couldn't delete that ${kind}. Please try again.`);
    } finally {
      setLookupDelete(null);
    }
  };

  const lookupDeleteMessage = (() => {
    if (!lookupDelete) return "";
    const { kind, make, model, value } = lookupDelete;
    if (kind === "make") {
      return `Delete "${value}" from the make list? Its models and types are removed from the Vehicle Notes database too. Existing vehicle notes keep their make.`;
    }
    if (kind === "model") {
      return `Delete "${value}" from ${make}? Its types are removed too. Existing vehicle notes keep their model.`;
    }
    if (kind === "year") {
      return `Delete "${value}" from the year list? It's removed from the Vehicle Notes database and from the year filters. Existing vehicle notes keep their year.`;
    }
    return `Delete the type "${value}" from ${make} ${model}? If it's the only type for this model, the model is removed too. Existing vehicle notes keep their type.`;
  })();

  const renderTyreFields = () => (
    <div className="tire-input-grid">
      {["width", "aspect", "rim"].map((key) => (
        <div className="field" key={key}>
          <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
          <input
            {...NUMERIC_INPUT_PROPS}
            maxLength={TIRE_MAX[key]}
            value={form.tyre[key]}
            onChange={(e) => updateTyre({ [key]: onlyDigits(e.target.value, TIRE_MAX[key]) })}
          />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Modal open onClose={onClose} title="Save comparison — vehicle details" width={560}>
        <form onSubmit={submitForm}>
          {formError && <div className="alert-error">{formError}</div>}

          <div className="field field-mb">
            <label>Vehicle name</label>
            <input
              className="field-mb"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ford Transit 350"
            />
            <EditableSelect
              label="Make"
              value={form.make}
              onChange={onFormMakeChange}
              options={lookupMakes}
              loading={loadingLookupMakes}
              placeholder="Select make"
              addNewLabel="+ Add new make…"
              customPlaceholder="e.g. Ford"
              canAddNew={isStaffOrAdmin}
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "make", value }) : undefined}
            />
          </div>

          <div className="tire-input-grid cols-2 field-mb">
            <EditableSelect
              label="Model"
              value={form.model}
              onChange={onFormModelChange}
              options={lookupModels}
              loading={loadingLookupModels}
              disabled={!form.make}
              placeholder={!form.make ? "Select make first" : "Select model"}
              addNewLabel="+ Add new model…"
              customPlaceholder="e.g. Transit 350"
              canAddNew={isStaffOrAdmin}
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "model", make: form.make, value }) : undefined}
            />
            <EditableSelect
              label="Type"
              value={form.type}
              onChange={(val) => setForm((f) => ({ ...f, type: val }))}
              options={lookupTypes}
              loading={loadingLookupTypes}
              disabled={!form.model}
              placeholder={!form.model ? "Select model first" : "Select type"}
              addNewLabel="+ Add new type…"
              customPlaceholder="e.g. Van / Mini Van"
              canAddNew={isStaffOrAdmin}
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "type", make: form.make, model: form.model, value }) : undefined}
            />
          </div>

          <div className="tire-input-grid cols-2 field-mb">
            <EditableSelect
              label="Year"
              value={form.year}
              onChange={(val) => setForm((f) => ({ ...f, year: val }))}
              options={lookupYears}
              loading={loadingLookupYears}
              placeholder="Select year"
              addNewLabel="+ Add new year…"
              customPlaceholder="2023"
              canAddNew={isStaffOrAdmin}
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "year", value }) : undefined}
            />
          </div>

          {/* Customer — staff and admin only, exactly like the Vehicle Notes form:
              same Customer data, options read "Full name (email)", staff and
              admin can add a customer, only admin gets edit / delete. Picking
              one prefills the (read-only) email and phone below. */}
          {isStaffOrAdmin && (
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
          )}

          <div className="field-mb-lg">
            <div className="spec-section">
              <div className="field field-mb">
                <label>Engine spec</label>
                <input
                  value={form.engine}
                  onChange={(e) => setForm((f) => ({ ...f, engine: e.target.value }))}
                  placeholder="e.g. 2.2L Duratorq TDCi Diesel"
                />
              </div>
              {renderTyreFields()}
            </div>
          </div>

          <div className="field field-mb-lg">
            <label>Image gallery</label>
            <div className="gallery-grid">
              {form.gallery.map((photo, i) => (
                <div key={`${i}-${photo.length}`} className="gallery-thumb">
                  <img src={photo} alt="gallery item" />
                  <button type="button" className="gallery-thumb-remove" onClick={() => removeGalleryPhotoAt(i)} title="Remove">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="gallery-add-tile">
                <ImagePlus size={18} />
                Add photos
                <input type="file" accept="image/*" multiple onChange={onGalleryFilesChange} hidden />
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? "Saving…" : "Save comparison"}
            </button>
          </div>
        </form>
      </Modal>

      {isStaffOrAdmin && (
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
          message={`Delete ${customerDelete?.fullName || "this customer"} (${customerDelete?.email || ""})? They'll be removed from any vehicle notes and saved comparisons they're attached to — the records themselves are kept. This can't be undone.`}
        />
      )}

      {isStaffOrAdmin && (
        <ConfirmDialog
          open={!!lookupDelete}
          onClose={() => setLookupDelete(null)}
          onConfirm={confirmDeleteLookup}
          busy={lookupDeleting}
          title={`Delete ${lookupDelete?.kind || "entry"}`}
          message={lookupDeleteMessage}
        />
      )}
    </>
  );
}
