import { Camera, Car, Download, FileSpreadsheet, FilterX, ImagePlus, Images, MessageSquare, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
import EditableSelect from "../components/EditableSelect";
import Lightbox from "../components/lightbox";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import { useAuth } from "../context/authcontext";
import {
  useAddVehicleGalleryPhoto,
  useAddVehicleStaffNote,
  useCreateVehicleNote,
  useDeleteVehicleNote,
  useRemoveVehicleGalleryPhoto,
  useRemoveVehicleStaffNote,
  useUpdateVehicleNote,
  useVehicleNotesQuery,
} from "../hooks/queries/useVehicleNotes";
import {
  useDeleteVehicleLookupMake,
  useDeleteVehicleLookupModel,
  useDeleteVehicleLookupType,
  useDeleteVehicleLookupYear,
  useDownloadVehicleLookupXlsx,
  useImportVehicleLookupXlsx,
  useQuickAddVehicleLookup,
  useQuickAddVehicleLookupYear,
  useVehicleLookupMakes,
  useVehicleLookupModels,
  useVehicleLookupTypes,
  useVehicleLookupYears,
} from "../hooks/queries/useVehicleLookup";

const MOCK_VEHICLES = [
  { _id: "v1", name: "Ford Transit 350", make: "Ford", type: "Van / Mini Van", model: "Transit 350", year: "2023", image: "", beforeImage: "", afterImage: "", gallery: [] },
  { _id: "v2", name: "Toyota Hilux", make: "Toyota", type: "Trucks / SUV", model: "Hilux", year: "2022", image: "", beforeImage: "", afterImage: "", gallery: [] },
  { _id: "v3", name: "Tata Ace", make: "Tata", type: "Trucks / SUV", model: "Ace", year: "2021", image: "", beforeImage: "", afterImage: "", gallery: [] },
];

const emptyForm = {
  name: "",
  make: "",
  type: "",
  model: "",
  year: "",
  image: "",
  beforeImage: "",
  afterImage: "",
  gallery: [],
  staffNotes: [],
  eventDate: "",
  existingSpec: { engine: "", tyre: { width: "", aspect: "", rim: "" } },
  upgradedSpec: { engine: "", tyre: { width: "", aspect: "", rim: "" } },
};

const emptyFilters = { make: "", model: "", type: "", yearFrom: "", yearTo: "" };

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function VehicleNotes() {
  const { user } = useAuth();
  // Who can grow/prune the predefined dropdown lists (the server enforces the
  // same rule): staff and admin, for all four of Make, Model, Type and Year.
  // "+ Add new…" and the per-option delete button on every one of those
  // dropdowns are gated on `isStaffOrAdmin`.
  //
  // Keep all four on the same flag. EditableSelect only renders its custom
  // dropdown when an onDeleteOption handler is passed and falls back to a
  // native <select> otherwise, so gating one field differently from the rest
  // doesn't just change what that field can do — it visibly changes what it
  // looks like, and the form ends up with a browser-styled select sitting
  // next to three app-styled ones.
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";
  const { data: fetchedVehicles, isLoading: loading, isError: vehiclesError } = useVehicleNotesQuery();
  const vehicles = vehiclesError ? MOCK_VEHICLES : fetchedVehicles || [];
  const createMutation = useCreateVehicleNote();
  const updateMutation = useUpdateVehicleNote();
  const deleteMutation = useDeleteVehicleNote();
  const addGalleryPhoto = useAddVehicleGalleryPhoto();
  const removeGalleryPhoto = useRemoveVehicleGalleryPhoto();
  const addStaffNote = useAddVehicleStaffNote();
  const removeStaffNote = useRemoveVehicleStaffNote();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newNoteText, setNewNoteText] = useState("");

  const [galleryVehicle, setGalleryVehicle] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);

  // Predefined Make/Model/Type dropdown data (cascading) — sourced from the
  // "Vehicle Notes database" (see database card below). Model options
  // depend on the selected Make, Type options depend on Make + Model. Year
  // is independent (see models/VehicleLookupYear.js) but is otherwise the
  // same kind of list. All four support typing a brand new value via
  // EditableSelect's "+ Add new…" option, for the roles allowed to (see the
  // role note at the top of this component).
  const { data: lookupMakes, isLoading: loadingLookupMakes } = useVehicleLookupMakes();
  const { data: lookupModels, isLoading: loadingLookupModels } = useVehicleLookupModels(form.make);
  const { data: filterModels } = useVehicleLookupModels(filters.make);
  const { data: lookupTypes, isLoading: loadingLookupTypes } = useVehicleLookupTypes(form.make, form.model);
  // Filter bar's Type dropdown — same cascading Make -> Model -> Type chain
  // as the Add/Edit vehicle form above, just keyed off the filter state
  // instead of the form state, and sourced from the same Vehicle Notes
  // database so it's always dynamic and up to date.
  const { data: filterTypes } = useVehicleLookupTypes(filters.make, filters.model);
  const { data: lookupYears, isLoading: loadingLookupYears } = useVehicleLookupYears();
  const quickAddLookup = useQuickAddVehicleLookup();
  const quickAddLookupYear = useQuickAddVehicleLookupYear();

  // Deleting an entry from the Make / Model / Type / Year dropdowns.
  // `lookupDelete` is the pending confirmation: { kind, make, model, type, value }.
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

  // Vehicle Notes database (Make/Model/Type master list) upload/download —
  // same round-trip pattern as the Tech Data CSV tab, just for .xlsx.
  const downloadLookup = useDownloadVehicleLookupXlsx();
  const importLookup = useImportVehicleLookupXlsx();
  const [dbImportResult, setDbImportResult] = useState(null);
  const [dbImportError, setDbImportError] = useState("");
  const dbFileInputRef = useRef(null);

  // Grid filters — Make, Model (cascades from Make) and a yearly Date Range.
  // Year options are derived from the vehicles actually on file, so a newly
  // added vehicle's year automatically becomes selectable without any
  // extra bookkeeping.

  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;
  const currentEditingVehicle = editing ? vehicles.find((v) => v._id === editing._id) || editing : null;

  const notesToRender = editing ? (currentEditingVehicle?.staffNotes || []) : (form.staffNotes || []);


  // --- Filter option lists, derived from the predefined Excel database ---
  const filterMakeOptions = lookupMakes || [];
  const filterModelOptions = filterModels || [];
  const filterTypeOptions = filterTypes || [];

  const filterYearOptions = useMemo(
    () =>
      (lookupYears || [])
        .map(Number)
        .filter((y) => Number.isFinite(y))
        .sort((a, b) => a - b),
    [lookupYears]
  );

  const filtersActive = Boolean(filters.make || filters.model || filters.type || filters.yearFrom || filters.yearTo);

  const clearFilters = () => setFilters(emptyFilters);

  // Make -> Model -> Type cascades here exactly like it does on the
  // Add/Edit vehicle form: changing an upstream filter clears whatever
  // downstream filter would no longer be a valid combination.
  const onFilterMakeChange = (e) => setFilters((f) => ({ ...f, make: e.target.value, model: "", type: "" }));
  const onFilterModelChange = (e) => setFilters((f) => ({ ...f, model: e.target.value, type: "" }));

  // Filtering preserves the API's existing sort order (newest first) —
  // only narrows which cards show, same grid + edit button as always.
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.make && v.make !== filters.make) return false;
      if (filters.model && v.model !== filters.model) return false;
      if (filters.type && v.type !== filters.type) return false;
      const y = Number(v.year);
      if (filters.yearFrom && (!Number.isFinite(y) || y < Number(filters.yearFrom))) return false;
      if (filters.yearTo && (!Number.isFinite(y) || y > Number(filters.yearTo))) return false;
      return true;
    });
  }, [vehicles, filters]);

  // --- Vehicle Notes database (Make/Model/Type master list) upload ---
  const onDbFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDbImportError("");
    setDbImportResult(null);
    try {
      const result = await importLookup.mutateAsync(file);
      setDbImportResult(result);
    } catch (err) {
      setDbImportError(err?.response?.data?.message || "Import failed. Check the file format and try again.");
    } finally {
      e.target.value = "";
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({
      name: v.name,
      make: v.make || "",
      type: v.type,
      model: v.model,
      year: v.year || "",
      image: v.image || "",
      beforeImage: v.beforeImage || "",
      afterImage: v.afterImage || "",
      gallery: v.gallery || [],
      staffNotes: v.staffNotes || [],
      eventDate: toDateInputValue(v.eventDate),
      existingSpec: {
        engine: v.existingSpec?.engine || "",
        tyre: {
          width: v.existingSpec?.tyre?.width ?? "",
          aspect: v.existingSpec?.tyre?.aspect ?? "",
          rim: v.existingSpec?.tyre?.rim ?? "",
        },
      },
      upgradedSpec: {
        engine: v.upgradedSpec?.engine || "",
        tyre: {
          width: v.upgradedSpec?.tyre?.width ?? "",
          aspect: v.upgradedSpec?.tyre?.aspect ?? "",
          rim: v.upgradedSpec?.tyre?.rim ?? "",
        },
      },
    });
    setFormError("");
    setFormOpen(true);
  };

  const updateSpec = (which) => (patch) => {
    setForm((f) => ({
      ...f,
      [which]: {
        ...f[which],
        ...patch,
        tyre: { ...f[which].tyre, ...(patch.tyre || {}) },
      },
    }));
  };

  // Make -> Model -> Type is a cascading, dynamic dropdown chain sourced
  // from the Vehicle Notes database — changing an upstream field clears the
  // downstream selections so an invalid combination can never be submitted.
  // Takes a plain value (not an event) since EditableSelect calls onChange
  // directly with the selected/typed string.
  const onFormMakeChange = (value) => setForm((f) => ({ ...f, make: value, model: "", type: "" }));
  const onFormModelChange = (value) => setForm((f) => ({ ...f, model: value, type: "" }));

  // Most Make/Model combinations map to exactly one Type in the database
  // (e.g. only one row for BMW X3) — auto-fill it as a convenience once
  // it's the only option, without blocking manual re-selection if there's
  // more than one.
  useEffect(() => {
    if (lookupTypes && lookupTypes.length === 1 && !form.type) {
      setForm((f) => (f.make && f.model && !f.type ? { ...f, type: lookupTypes[0] } : f));
    }
  }, [lookupTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSingleFileChange = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((f) => ({ ...f, [field]: dataUrl, ...(field === "beforeImage" && !f.image ? { image: dataUrl } : {}) }));
  };

  const onGalleryFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    setForm((f) => ({ ...f, gallery: [...f.gallery, ...dataUrls] }));
    e.target.value = "";
  };

  const removeFormGalleryPhoto = (photo) => {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((g) => g !== photo) }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.make || !form.model || !form.type) {
      setFormError("Vehicle name, make, model and type are required.");
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, ...form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setFormOpen(false);

      // Best-effort: fold whatever Make/Model/Type/Year was just saved back
      // into the predefined lists. Upserts server-side, so this is a no-op
      // when they were picked from the dropdown already — it only matters
      // when "+ Add new…" was used. Never blocks the save above, and never
      // surfaces an error to the person — the vehicle note itself already
      // saved successfully regardless of what happens here.
      // Additions are staff/admin, and skipped when editing a vehicle without
      // changing the value — otherwise saving an older vehicle would quietly
      // bring back a Make/Model/Type/Year someone has since deleted.
      const lookupUnchanged =
        editing &&
        form.make === (editing.make || "") &&
        form.model === (editing.model || "") &&
        form.type === (editing.type || "");
      const yearUnchanged = editing && form.year === (editing.year || "");
      if (isStaffOrAdmin && !lookupUnchanged) {
        quickAddLookup.mutate(
          { make: form.make, model: form.model, type: form.type },
          { onError: () => { } }
        );
      }
      if (isStaffOrAdmin && form.year && !yearUnchanged) {
        quickAddLookupYear.mutate(form.year, { onError: () => { } });
      }
    } catch (err) {
      setFormError(err?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Delete one entry from the Make / Model / Type / Year dropdown data.
  // Vehicle notes already saved keep the values they were saved with.
  // Anything on the form that's about to disappear is cleared first — before
  // the lists refetch without it, which the dropdown would otherwise misread
  // as a hand-typed value — and put back if the delete fails.
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

      // The filter bar draws from the same lists — drop a filter whose value
      // no longer exists so it can't keep silently narrowing the grid. Year
      // feeds both ends of the date range, so check them separately.
      setFilters((f) => {
        if (kind === "make" && f.make === value) return { ...f, make: "", model: "", type: "" };
        if (kind === "model" && f.make === make && f.model === value) return { ...f, model: "", type: "" };
        if (kind === "type" && f.make === make && f.model === model && f.type === value) return { ...f, type: "" };
        if (kind === "year") {
          const next = { ...f };
          if (String(f.yearFrom) === String(value)) next.yearFrom = "";
          if (String(f.yearTo) === String(value)) next.yearTo = "";
          return next;
        }
        return f;
      });
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

  const openGallery = (v) => {
    setGalleryVehicle(v);
    setLightboxIndex(null);
  };

  const galleryImages = (galleryVehicle?.gallery || []).map((src, i) => ({
    src,
    label: `${galleryVehicle?.name || "Vehicle"} — photo ${i + 1}`,
  }));

  const onQuickAddGalleryPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !galleryVehicle) return;
    const dataUrl = await fileToDataUrl(file);
    const updated = await addGalleryPhoto.mutateAsync({ id: galleryVehicle._id, image: dataUrl });
    setGalleryVehicle(updated);
    e.target.value = "";
  };

  const removeGalleryPhotoAt = async (photo) => {
    if (!galleryVehicle) return;
    const updated = await removeGalleryPhoto.mutateAsync({ id: galleryVehicle._id, image: photo });
    setGalleryVehicle(updated);
    setLightboxIndex(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Extremewheel records"
        title="Vehicle Notes"
        subtitle="Keep a visual reference of every vehicle in the extremewheel - including before/after photos and a full image gallery."
        action={
          <button type="button" className="btn btn-accent" onClick={openAdd}>
            <Plus size={16} /> Add vehicle
          </button>
        }
      />

      {isStaffOrAdmin && user.role !== "guest" && (
        <div className="card vehicle-db-card mb-20">
          <h3 className="mb-4">
            <FileSpreadsheet size={16} className="icon-inline" />
            Vehicle Notes database
          </h3>
          <p className="text-muted mb-16">
            Download the current Make / Model / Type reference table as .xlsx, edit it, and re-upload — the Add / Edit vehicle
            dropdowns above stay in sync automatically.
          </p>
          <div className="modal-actions modal-actions-start gap-12">
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => downloadLookup.mutate()}
              disabled={downloadLookup.isPending}
            >
              <Download size={16} /> {downloadLookup.isPending ? "Preparing…" : "Download database"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => dbFileInputRef.current?.click()} disabled={importLookup.isPending}>
              <Upload size={16} /> {importLookup.isPending ? "Uploading…" : "Upload database"}
            </button>
            <input
              ref={dbFileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={onDbFileChosen}
            />
          </div>
          {dbImportError && <div className="alert-error mt-16">{dbImportError}</div>}
          {dbImportResult && (
            <div className="card empty-state-card mt-16 text-left">
              Imported {dbImportResult.processed} row(s), skipped {dbImportResult.skipped} incomplete row(s), out of{" "}
              {dbImportResult.total} total.
            </div>
          )}
        </div>
      )}

      <div className="card vehicle-filter-bar mb-20">
        <div className="vehicle-filter-grid">
          <div className="field">
            <label>Make</label>
            <select value={filters.make} onChange={onFilterMakeChange}>
              <option value="">All makes</option>
              {filterMakeOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Model</label>
            <select value={filters.model} onChange={onFilterModelChange}>
              <option value="">All models</option>
              {filterModelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
              <option value="">All types</option>
              {filterTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Year from</label>
            <select value={filters.yearFrom} onChange={(e) => setFilters((f) => ({ ...f, yearFrom: e.target.value }))}>
              <option value="">Any</option>
              {filterYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Year to</label>
            <select value={filters.yearTo} onChange={(e) => setFilters((f) => ({ ...f, yearTo: e.target.value }))}>
              <option value="">Any</option>
              {filterYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-ghost vehicle-filter-clear" onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={14} /> Clear filter
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading vehicles…</p>
      ) : vehicles.length === 0 ? (
        <div className="card empty-state-card text-muted">
          No vehicles yet — add your first one.
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="card empty-state-card text-muted">
          No vehicles match the current filters.
        </div>
      ) : (
        <div className="vehicle-grid">
          {filteredVehicles.map((v) => (
            <div key={v._id} className="card vehicle-card">
              <div className="vehicle-image">
                {v.image || v.beforeImage ? <img src={v.image || v.beforeImage} alt={v.name} /> : <Car size={30} color="#C6C9D6" />}
              </div>
              <div className="vehicle-body">
                <p className="vehicle-name">{v.name}</p>
                <div className="vehicle-tags">
                  <span className="badge badge-live">{v.make}</span>
                  <span className="badge badge-model">{v.model}</span>
                  <span className="badge badge-model">{v.type}</span>
                </div>
                <p className="text-muted fs-11 mt-4">
                  {v.year ? `Year: ${v.year}` : "No year set"}
                  {" · "}
                  {v.eventDate ? `Event date: ${new Date(v.eventDate).toLocaleDateString()}` : "No event date set"}
                  {" · "}Added {new Date(v.createdAt).toLocaleDateString()}
                </p>
                {(v.existingSpec?.engine || v.existingSpec?.tyre?.width || v.upgradedSpec?.engine || v.upgradedSpec?.tyre?.width) && (
                  <div className="spec-compare-grid compact">
                    <div className="spec-compare-col">
                      <p className="spec-compare-col-title">Existing</p>
                      <p className="suggestion-spec-row"><span>Engine</span>{v.existingSpec?.engine || "—"}</p>
                      <p className="suggestion-spec-row">
                        <span>Tyre</span>
                        {v.existingSpec?.tyre?.width ? `${v.existingSpec.tyre.width}/${v.existingSpec.tyre.aspect} R${v.existingSpec.tyre.rim}` : "—"}
                      </p>
                    </div>
                    <div className="spec-compare-col upgraded">
                      <p className="spec-compare-col-title">Upgraded</p>
                      <p className="suggestion-spec-row"><span>Engine</span>{v.upgradedSpec?.engine || "—"}</p>
                      <p className="suggestion-spec-row">
                        <span>Tyre</span>
                        {v.upgradedSpec?.tyre?.width ? `${v.upgradedSpec.tyre.width}/${v.upgradedSpec.tyre.aspect} R${v.upgradedSpec.tyre.rim}` : "—"}
                      </p>
                    </div>
                  </div>
                )}
                {(v.gallery?.length > 0 || v.beforeImage || v.afterImage) && (
                  <button type="button" className="vehicle-gallery-btn" onClick={() => openGallery(v)}>
                    <Images size={13} />
                    View gallery{v.gallery?.length ? ` (${v.gallery.length})` : ""}
                  </button>
                )}
              </div>
              <div className="vehicle-actions">
                <button type="button" className="icon-btn" onClick={() => openEdit(v)} title="Edit">
                  <Pencil size={14} />
                </button>
                <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(v)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit vehicle" : "Add vehicle"} width={560}>
        <form onSubmit={submitForm}>
          {formError && (
            <div className="alert-error">
              {formError}
            </div>
          )}

          <div className="field field-mb">
            <label>Vehicle name</label>
            <input className="field-mb" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ford Transit 350" />
            <EditableSelect
              label="Make"
              value={form.make}
              onChange={(val) => onFormMakeChange(val)}
              options={lookupMakes}
              loading={loadingLookupMakes}
              placeholder="Select make"
              addNewLabel="+ Add new make…"
              customPlaceholder="e.g. Ford"
              canAddNew={isStaffOrAdmin}
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "make", value }) : undefined}
            />
          </div>

          {/* Make -> Model -> Type: cascading, predefined dropdowns sourced from
              the Vehicle Notes database (see the database card above the grid).
              Staff and admin get a "+ Add new…" option for values not in the
              list yet and a delete button on every option; everyone else picks
              from the list only. */}
          <div className="tire-input-grid cols-2 field-mb">
            <EditableSelect
              label="Model"
              value={form.model}
              onChange={(val) => onFormModelChange(val)}
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

          {/* Year is the same kind of predefined, dynamic dropdown as
              Make/Model/Type above — same EditableSelect, same "+ Add new…"
              and per-option delete for staff and admin — it just doesn't
              cascade off anything, so it's always enabled. */}
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
            <div className="field">
              <label>Event date</label>
              <input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
            </div>
          </div>

          <div className="field field-mb-lg">
            <label>Before &amp; after photos</label>
            <div className="before-after-grid">
              <label className="image-upload">
                {form.beforeImage ? <img src={form.beforeImage} alt="before preview" /> : (
                  <span className="image-upload-placeholder">
                    <Camera size={18} color="var(--color-muted)" />
                    <span className="text-muted fs-11">Before</span>
                  </span>
                )}
                <input type="file" accept="image/*" onChange={onSingleFileChange("beforeImage")} hidden />
              </label>
              <label className="image-upload">
                {form.afterImage ? <img src={form.afterImage} alt="after preview" /> : (
                  <span className="image-upload-placeholder">
                    <Camera size={18} color="var(--color-muted)" />
                    <span className="text-muted fs-11">After</span>
                  </span>
                )}
                <input type="file" accept="image/*" onChange={onSingleFileChange("afterImage")} hidden />
              </label>
            </div>
          </div>

          <div className="field-mb-lg">
            <div className="spec-section">
              <h4 className="spec-section-title mb-10">Existing (before)</h4>
              <div className="field field-mb">
                <label>Engine spec</label>
                <input
                  value={form.existingSpec.engine}
                  onChange={(e) => updateSpec("existingSpec")({ engine: e.target.value })}
                  placeholder="e.g. 2.2L Duratorq TDCi Diesel"
                />
              </div>
              <div className="tire-input-grid">
                <div className="field">
                  <label>Width</label>
                  <input
                    type="number"
                    value={form.existingSpec.tyre.width}
                    onChange={(e) => updateSpec("existingSpec")({ tyre: { width: e.target.value } })}
                  />
                </div>
                <div className="field">
                  <label>Aspect</label>
                  <input
                    type="number"
                    value={form.existingSpec.tyre.aspect}
                    onChange={(e) => updateSpec("existingSpec")({ tyre: { aspect: e.target.value } })}
                  />
                </div>
                <div className="field">
                  <label>Rim</label>
                  <input
                    type="number"
                    value={form.existingSpec.tyre.rim}
                    onChange={(e) => updateSpec("existingSpec")({ tyre: { rim: e.target.value } })}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "24px 0" }} />

            <div className="spec-section">
              <h4 className="spec-section-title mb-10" style={{ color: "var(--color-pink)" }}>Upgraded (after)</h4>
              <div className="field field-mb">
                <label>Engine spec</label>
                <input
                  value={form.upgradedSpec.engine}
                  onChange={(e) => updateSpec("upgradedSpec")({ engine: e.target.value })}
                  placeholder="e.g. 2.0L EcoBlue Bi-Turbo Diesel"
                />
              </div>
              <div className="tire-input-grid">
                <div className="field">
                  <label>Width</label>
                  <input
                    type="number"
                    value={form.upgradedSpec.tyre.width}
                    onChange={(e) => updateSpec("upgradedSpec")({ tyre: { width: e.target.value } })}
                  />
                </div>
                <div className="field">
                  <label>Aspect</label>
                  <input
                    type="number"
                    value={form.upgradedSpec.tyre.aspect}
                    onChange={(e) => updateSpec("upgradedSpec")({ tyre: { aspect: e.target.value } })}
                  />
                </div>
                <div className="field">
                  <label>Rim</label>
                  <input
                    type="number"
                    value={form.upgradedSpec.tyre.rim}
                    onChange={(e) => updateSpec("upgradedSpec")({ tyre: { rim: e.target.value } })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="field field-mb-lg">
            <label>
              <MessageSquare size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Internal staff notes &amp; comments
            </label>
            {!isStaffOrAdmin ? (
              <p className="text-muted fs-11">Only staff and admin accounts can view or add internal notes.</p>
            ) : (
              <>
                <div className="staff-notes-list">
                  {notesToRender.length === 0 ? (
                    <p className="text-muted fs-11">No internal notes yet.</p>
                  ) : (
                    notesToRender
                      .slice()
                      .reverse()
                      .map((n, i) => (
                        <div key={n._id || i} className="staff-note-row">
                          <div>
                            <p className="staff-note-text">{n.text}</p>
                            <p className="staff-note-meta">
                              {n.authorName || "Staff"} · {n.createdAt ? new Date(n.createdAt).toLocaleString() : "Just now"}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Delete note"
                            onClick={() => {
                              if (editing && n._id) {
                                removeStaffNote.mutateAsync({ id: editing._id, noteId: n._id });
                              } else {
                                setForm((f) => ({ ...f, staffNotes: f.staffNotes.filter((sn) => sn._id !== n._id) }));
                              }
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
                <div className="staff-note-add-row">
                  <input
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add an internal note or comment…"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!newNoteText.trim() || addStaffNote.isPending}
                    onClick={async () => {
                      if (editing) {
                        await addStaffNote.mutateAsync({ id: editing._id, text: newNoteText.trim() });
                      } else {
                        setForm((f) => ({
                          ...f,
                          staffNotes: [
                            ...(f.staffNotes || []),
                            {
                              _id: Date.now().toString(),
                              text: newNoteText.trim(),
                              authorName: user?.name || "You",
                              createdAt: new Date().toISOString(),
                            },
                          ],
                        }));
                      }
                      setNewNoteText("");
                    }}
                  >
                    {addStaffNote.isPending ? "Adding…" : "Add note"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="field field-mb-lg">
            <label>Image gallery</label>
            <div className="gallery-grid">
              {form.gallery.map((photo) => (
                <div key={photo} className="gallery-thumb">
                  <img src={photo} alt="gallery item" />
                  <button type="button" className="gallery-thumb-remove" onClick={() => removeFormGalleryPhoto(photo)} title="Remove">
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
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add vehicle"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Gallery viewer — before/after pair + full photo gallery with lightbox preview */}
      <Modal open={!!galleryVehicle} onClose={() => setGalleryVehicle(null)} title={galleryVehicle ? `${galleryVehicle.name} — gallery` : ""} width={520}>
        {galleryVehicle && (
          <div>
            {(galleryVehicle.beforeImage || galleryVehicle.afterImage) && (
              <div className="field field-mb-lg">
                <label>Before / after</label>
                <div className="before-after-grid">
                  <div className="gallery-thumb wide">
                    {galleryVehicle.beforeImage ? <img src={galleryVehicle.beforeImage} alt="before" /> : <span className="text-muted fs-11">No before photo</span>}
                  </div>
                  <div className="gallery-thumb wide">
                    {galleryVehicle.afterImage ? <img src={galleryVehicle.afterImage} alt="after" /> : <span className="text-muted fs-11">No after photo</span>}
                  </div>
                </div>
              </div>
            )}

            {/* {(galleryVehicle.existingSpec?.engine || galleryVehicle.existingSpec?.tyre?.width || galleryVehicle.upgradedSpec?.engine || galleryVehicle.upgradedSpec?.tyre?.width) && (
              <div className="field field-mb-lg">
                <label>Existing vs. upgraded specification</label>
                <div className="spec-compare-grid">
                  <div className="spec-compare-col">
                    <p className="spec-compare-col-title">Existing</p>
                    <p className="suggestion-spec-row"><span>Engine</span>{galleryVehicle.existingSpec?.engine || "—"}</p>
                    <p className="suggestion-spec-row">
                      <span>Tyre</span>
                      {galleryVehicle.existingSpec?.tyre?.width
                        ? `${galleryVehicle.existingSpec.tyre.width}/${galleryVehicle.existingSpec.tyre.aspect} R${galleryVehicle.existingSpec.tyre.rim}`
                        : "—"}
                    </p>
                  </div>
                  <div className="spec-compare-col upgraded">
                    <p className="spec-compare-col-title">Upgraded</p>
                    <p className="suggestion-spec-row"><span>Engine</span>{galleryVehicle.upgradedSpec?.engine || "—"}</p>
                    <p className="suggestion-spec-row">
                      <span>Tyre</span>
                      {galleryVehicle.upgradedSpec?.tyre?.width
                        ? `${galleryVehicle.upgradedSpec.tyre.width}/${galleryVehicle.upgradedSpec.tyre.aspect} R${galleryVehicle.upgradedSpec.tyre.rim}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )} */}

            {/* {isStaffOrAdmin && galleryVehicle.staffNotes?.length > 0 && (
              <div className="field field-mb-lg">
                <label>
                  <MessageSquare size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                  Internal staff notes
                </label>
                <div className="staff-notes-list">
                  {galleryVehicle.staffNotes.slice().reverse().map((n) => (
                    <div key={n._id} className="staff-note-row">
                      <div>
                        <p className="staff-note-text">{n.text}</p>
                        <p className="staff-note-meta">
                          {n.authorName || "Staff"} · {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            <div className="field">
              <label>Gallery ({galleryVehicle.gallery?.length || 0})</label>
              <div className="gallery-grid">
                {(galleryVehicle.gallery || []).map((photo, i) => (
                  <div key={photo} className="gallery-thumb" onClick={() => setLightboxIndex(i)}>
                    <img src={photo} alt={`gallery ${i + 1}`} />
                    <button
                      type="button"
                      className="gallery-thumb-remove"
                      onClick={(e) => { e.stopPropagation(); removeGalleryPhotoAt(photo); }}
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="gallery-add-tile">
                  <ImagePlus size={18} />
                  Add
                  <input type="file" accept="image/*" onChange={onQuickAddGalleryPhoto} hidden />
                </label>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Lightbox
        images={galleryImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete vehicle"
        message={`Remove ${deleteTarget?.name || "this vehicle"} from your records? This can't be undone.`}
        busy={deleting}
      />

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
    </div>
  );
}