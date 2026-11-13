import { Camera, Car, Eye, FilterX, ImagePlus, Images, Loader2, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthImage from "../components/AuthImage";
import ConfirmDialog from "../components/confirmdialog";
import CustomerFormModal from "../components/CustomerFormModal";
import CustomerSelect from "../components/CustomerSelect";
import CursorPager from "../components/CursorPager";
import SearchAutocomplete from "../components/SearchAutocomplete";
import SaveStatusTray from "../components/SaveStatusTray";
import EditableSelect from "../components/EditableSelect";
import Lightbox from "../components/lightbox";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import { useAuth } from "../context/authcontext";
import { usePermissions } from "../context/permissioncontext";
import useDebouncedValue from "../hooks/useDebouncedValue";
import useVehicleNoteSaves, { saveErrorMessage } from "../hooks/useVehicleNoteSaves";
import { PERM } from "../utils/permissions";
import { SHOW_CHIP_MODIFICATION, SHOW_CHIP_SUBMODEL } from "../utils/vehicleNoteDisplay";
import { NUMERIC_INPUT_PROPS, TIRE_MAX, onlyDigits } from "../utils/validation";
import { useCustomersQuery, useDeleteCustomer } from "../hooks/queries/useCustomers";
import {
  useAddVehicleGalleryPhoto,
  useAddVehicleStaffNote,
  useDeleteVehicleNote,
  useRemoveVehicleGalleryPhoto,
  useRemoveVehicleStaffNote,
  useVehicleNoteSuggestions,
  useVehicleNotesPage,
} from "../hooks/queries/useVehicleNotes";
import {
  useDeleteVehicleLookupMake,
  useDeleteVehicleLookupModel,
  useDeleteVehicleLookupOption,
  useDeleteVehicleLookupType,
  useDeleteVehicleLookupYear,
  useQuickAddVehicleLookup,
  useQuickAddVehicleLookupOption,
  useQuickAddVehicleLookupYear,
  useVehicleLookupMakes,
  useVehicleLookupModels,
  useVehicleLookupOptions,
  useVehicleLookupTypes,
  useVehicleLookupYears,
} from "../hooks/queries/useVehicleLookup";

// Fields that are still stored (and still sent on save) but hidden on this page:
// the filter bar, the search box and the Add / Edit form. Flip a flag to bring
// the control back; the server side search is switched off separately
// (see the "HIDDEN" notes in server.js).
const SHOW_TYPE = false;
const SHOW_CUSTOMER = false;

// Predefined Modification choices (checkboxes in the form and the filter).
// The values are what is stored; keep in sync with MODIFICATION_OPTIONS in
// server/models/VehicleNote.js.
const MODIFICATION_CHOICES = [
  { value: "lifted", label: "Lifted" },
  { value: "lowered", label: "Lowered" },
  { value: "stock", label: "Stock" },
];
const modificationLabel = (value) => MODIFICATION_CHOICES.find((c) => c.value === value)?.label || value;

// "205/55R16", "205-55-16" or "205 55 16" -> "205 55 16" (the tblAppGuide format).
// Returns the text unchanged when it isn't three numbers, so it can be fixed.
function normalizeTireSize(raw) {
  const nums = String(raw ?? "").match(/\d+/g) || [];
  return nums.length === 3 ? nums.join(" ") : String(raw ?? "").trim();
}

// "" when fine (or empty), otherwise a message for the form.
function tireSizeProblem(raw, label) {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  const nums = (text.match(/\d+/g) || []).map(Number);
  const [w, a, r] = nums;
  const ok = nums.length === 3 && w >= 105 && w <= 495 && a >= 20 && a <= 95 && r >= 10 && r <= 30;
  return ok ? "" : `${label} must be width, aspect and rim, e.g. 205 55 16.`;
}

function offsetProblem(raw, label) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const n = Number(raw);
  return Number.isInteger(n) && n >= -200 && n <= 200 ? "" : `${label} must be a whole number between -200 and 200 (mm).`;
}

// The Submodel / Tire size / Wheel offset dropdowns. Front and rear share one list
// for tire sizes and one for offsets (see models/VehicleLookupOption.js on the
// server). `fields` are the form fields that draw from each list.
const OPTION_LISTS = {
  submodel: { label: "submodel", fields: ["submodel"] },
  "tire-size": { label: "tire size", fields: ["frontTireSize", "rearTireSize"] },
  "wheel-offset": { label: "wheel offset", fields: ["frontWheelOffset", "rearWheelOffset"] },
};

// What the typed-in ("+ Add new…") boxes of the tire size / offset dropdowns accept.
const cleanTireSizeInput = (text) => text.replace(/[^\d\s/\-rRzZ]/g, "").slice(0, 14);
const cleanOffsetInput = (text) => text.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "").slice(0, 4);

// Card date: the same date and time the detail page shows, just short —
// "12 Nov, 3:45 PM" (the year is added once it isn't the current one).
function formatStamp(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return "";
  const thisYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    ...(thisYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  submodel: "",
  frontTireSize: "",
  rearTireSize: "",
  frontWheelOffset: "",
  rearWheelOffset: "",
  modification: [],
  description: "",
  image: "",
  beforeImage: "",
  afterImage: "",
  gallery: [],
  staffNotes: [],
  eventDate: "",
  customer: "", // customer _id ("" = none)
  existingSpec: { engine: "", tyre: { width: "", aspect: "", rim: "" } },
  upgradedSpec: { engine: "", tyre: { width: "", aspect: "", rim: "" } },
};

const emptyFilters = { search: "", exact: false, pick: "", make: "", model: "", type: "", customer: "", modification: [], yearFrom: "", yearTo: "" };

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Photos are stored as base64 data URLs inside the vehicle's MongoDB document.
// Raw phone / camera photos are several MB each, so a vehicle with a handful of
// photos made a ~22 MB request: it never finished uploading before the 15 s
// axios timeout (so the save looked stuck on "Saving…" and then failed), and it
// would also exceed MongoDB's 16 MB per-document limit. Downscale and re-encode
// every photo before it goes into the form — a 1600 px JPEG is ~150–400 KB and
// looks identical at the sizes the app displays.
const MAX_PHOTO_EDGE = 1600;
const PHOTO_QUALITY = 0.82;

async function fileToDataUrl(file) {
  const original = await readAsDataUrl(file);
  // Only raster photos are re-encoded; anything else (or any failure) falls
  // back to the original so a photo is never lost.
  if (!file.type?.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return original;
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = original;
    });
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // JPEG has no transparency
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
    return compressed.length < original.length ? compressed : original;
  } catch {
    return original;
  }
}

function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function VehicleNotes() {
  const { user } = useAuth();
  // Per-user permissions for this page's buttons (granted by email, not role).
  // Edit also covers adding / removing gallery photos, since both change the vehicle.
  const { can } = usePermissions();
  const canAdd = can(PERM.VEHICLE_ADD);
  const canEdit = can(PERM.VEHICLE_EDIT);
  const canDelete = can(PERM.VEHICLE_DELETE);
  const navigate = useNavigate();
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
  // Customers: staff and admin can add; only admin can edit and delete (the
  // server enforces the same). Everyone else never sees customer data, so the
  // list isn't even requested for them.
  const isAdmin = user?.role === "admin";
  const { data: customers, isLoading: loadingCustomers } = useCustomersQuery({ enabled: isStaffOrAdmin && SHOW_CUSTOMER });
  const deleteCustomerMutation = useDeleteCustomer();
  const [customerModal, setCustomerModal] = useState({ open: false, customer: null });
  const [customerDelete, setCustomerDelete] = useState(null);
  // Paginated: one page of 20 cards at a time, fetched from the server with the
  // search text (debounced) and filters — never every vehicle at once. See
  // hooks/queries/useCursorPagination.js.
  const [filters, setFilters] = useState(emptyFilters);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  // A suggestion that was clicked is applied immediately. Debouncing it too left
  // the OLD results (everything matching what had been typed so far) on screen
  // for 300 ms after the click, which looked like "it also shows other items".
  const picked = filters.exact;
  const effectiveSearch = picked ? filters.search : debouncedSearch;
  const listParams = useMemo(
    () => ({
      q: effectiveSearch.trim(),
      exact: picked ? "1" : "",
      pick: picked ? filters.pick : "",
      make: filters.make,
      model: filters.model,
      type: SHOW_TYPE ? filters.type : "",
      customer: SHOW_CUSTOMER && isStaffOrAdmin ? filters.customer : "",
      modification: filters.modification.join(","),
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
    }),
    [effectiveSearch, picked, filters.pick, filters.make, filters.model, filters.type, filters.customer, filters.modification, filters.yearFrom, filters.yearTo, isStaffOrAdmin]
  );
  const pager = useVehicleNotesPage(listParams);
  const { isLoading: loading, isError: vehiclesError, isPageChanging } = pager;
  const { suggestions, isFetching: suggesting } = useVehicleNoteSuggestions(debouncedSearch, !picked);
  const vehicles = vehiclesError ? MOCK_VEHICLES : pager.items;
  // Saving runs in the background (Redis queue → worker → live updates over
  // WebSocket): the form only waits for the upload, then closes, and the tray
  // at the bottom shows progress. See hooks/useVehicleNoteSaves.js.
  const saveJobs = useVehicleNoteSaves({ enabled: canAdd || canEdit });
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(null);
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

  // Predefined Make/Model/Type dropdown data (cascading) — sourced from the
  // "Vehicle Notes database" (downloaded / uploaded from Reporting & Data Export). Model options
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
  // Submodel / Tire size / Wheel offset: flat predefined lists, managed exactly
  // like Year (staff and admin can add new values and delete existing ones).
  const { data: submodelOptions, isLoading: loadingSubmodels } = useVehicleLookupOptions("submodel");
  const { data: tireSizeOptions, isLoading: loadingTireSizes } = useVehicleLookupOptions("tire-size");
  const { data: wheelOffsetOptions, isLoading: loadingWheelOffsets } = useVehicleLookupOptions("wheel-offset");
  const quickAddLookup = useQuickAddVehicleLookup();
  const quickAddLookupYear = useQuickAddVehicleLookupYear();
  const quickAddLookupOption = useQuickAddVehicleLookupOption();

  // Deleting an entry from the Make / Model / Type / Year dropdowns.
  // `lookupDelete` is the pending confirmation: { kind, make, model, type, value }.
  const deleteLookupMake = useDeleteVehicleLookupMake();
  const deleteLookupModel = useDeleteVehicleLookupModel();
  const deleteLookupType = useDeleteVehicleLookupType();
  const deleteLookupYear = useDeleteVehicleLookupYear();
  const deleteLookupOption = useDeleteVehicleLookupOption();
  // For a Submodel / Tire size / Wheel offset entry: { kind: "option", list, value }.
  const [lookupDelete, setLookupDelete] = useState(null);
  const lookupDeleting =
    deleteLookupMake.isPending ||
    deleteLookupModel.isPending ||
    deleteLookupType.isPending ||
    deleteLookupYear.isPending ||
    deleteLookupOption.isPending;

  // Grid filters — Make, Model (cascades from Make) and a yearly Date Range.
  // Year options are derived from the vehicles actually on file, so a newly
  // added vehicle's year automatically becomes selectable without any
  // extra bookkeeping.

  const saving = submitting;
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

  const selectedCustomer = useMemo(() => {
    if (!form.customer) return null;
    const fromList = (customers || []).find((c) => c._id === form.customer);
    if (fromList) return fromList;
    return editing?.customer && editing.customer._id === form.customer ? editing.customer : null;
  }, [customers, form.customer, editing]);

  const filtersActive = Boolean(
    filters.search.trim() || filters.make || filters.model || filters.modification.length || filters.yearFrom || filters.yearTo ||
    (SHOW_TYPE && filters.type) || (SHOW_CUSTOMER && filters.customer)
  );

  const toggleFilterModification = (value) =>
    setFilters((f) => ({
      ...f,
      modification: f.modification.includes(value) ? f.modification.filter((m) => m !== value) : [...f.modification, value],
    }));

  const clearFilters = () => setFilters(emptyFilters);

  // The search box calls this with (text, picked, suggestion). `picked` is true
  // when the text came from clicking a suggestion — then we also remember WHAT
  // was clicked (a vehicle name, make, model, year or customer) so the server
  // shows exactly that, not everything sharing a word with it.
  const onSearchChange = (search, picked = false, suggestion) => {
    setFilters((f) => ({ ...f, search, exact: picked, pick: picked ? suggestion?.kind || "" : "" }));
  };

  // Make -> Model -> Type cascades here exactly like it does on the
  // Add/Edit vehicle form: changing an upstream filter clears whatever
  // downstream filter would no longer be a valid combination.
  const onFilterMakeChange = (e) => setFilters((f) => ({ ...f, make: e.target.value, model: "", type: "" }));
  const onFilterModelChange = (e) => setFilters((f) => ({ ...f, model: e.target.value, type: "" }));

  // Search + every filter run on the server (newest first), so `vehicles` is
  // already exactly the page of cards to show.
  const filteredVehicles = vehicles;

  // Saves still in flight: new vehicles get a placeholder card at the top of the
  // list, edited ones get a "Saving…" tag and can't be edited / deleted again
  // until they finish (two saves of one vehicle could otherwise land out of order).
  const pendingCreates = filtersActive
    ? []
    : saveJobs.saves.filter(
      (j) =>
        j.kind === "create" && !j.hidden && j.status !== "failed" &&
        !filteredVehicles.some((v) => v._id === j.vehicleId)
    );
  const savingVehicleIds = new Set(
    saveJobs.saves
      .filter((j) => j.kind === "update" && (j.status === "sending" || j.status === "queued" || j.status === "processing"))
      .map((j) => j.editId)
  );

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
      type: v.type || "",
      model: v.model,
      year: v.year || "",
      submodel: v.submodel || "",
      frontTireSize: v.frontTireSize || "",
      rearTireSize: v.rearTireSize || "",
      // Strings, so they match the (text) values of the offset dropdown list.
      frontWheelOffset: String(v.frontWheelOffset ?? ""),
      rearWheelOffset: String(v.rearWheelOffset ?? ""),
      modification: v.modification || [],
      description: v.description || "",
      image: v.image || "",
      beforeImage: v.beforeImage || "",
      afterImage: v.afterImage || "",
      gallery: v.gallery || [],
      staffNotes: v.staffNotes || [],
      eventDate: toDateInputValue(v.eventDate),
      customer: v.customer?._id || "",
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

  // Modification checkboxes. "Stock" means unmodified, so it can't be ticked
  // together with Lifted / Lowered (and ticking those clears Stock).
  const toggleFormModification = (value) =>
    setForm((f) => {
      const has = f.modification.includes(value);
      if (has) return { ...f, modification: f.modification.filter((m) => m !== value) };
      const next = value === "stock" ? ["stock"] : [...f.modification.filter((m) => m !== "stock"), value];
      return { ...f, modification: next };
    });

  // Setter for one form field fed by a plain dropdown value (EditableSelect hands
  // back the chosen / typed string directly).
  const setField = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  // A typed-in tire size is tidied up ("205/55R16" -> "205 55 16") when the box loses focus.
  const tidyTireSize = (field) => () => setForm((f) => ({ ...f, [field]: normalizeTireSize(f[field]) }));

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
    // Type is hidden now, so it is no longer required.
    if (!form.name || !form.make || !form.model) {
      setFormError("Vehicle name, make and model are required.");
      return;
    }
    const fitmentError =
      tireSizeProblem(form.frontTireSize, "Front tire size") ||
      tireSizeProblem(form.rearTireSize, "Rear tire size") ||
      offsetProblem(form.frontWheelOffset, "Front wheel offset") ||
      offsetProblem(form.rearWheelOffset, "Rear wheel offset");
    if (fitmentError) {
      setFormError(fitmentError);
      return;
    }
    // The customer field only exists for staff and admin — everyone else's
    // save must leave it out entirely (the server rejects it from them).
    // (The customer control is hidden now, but an existing customer is still
    // sent back unchanged so editing a vehicle never detaches it.)
    const { customer, ...formWithoutCustomer } = form;
    const payload = {
      ...(isStaffOrAdmin ? { ...formWithoutCustomer, customer } : formWithoutCustomer),
      frontTireSize: normalizeTireSize(form.frontTireSize),
      rearTireSize: normalizeTireSize(form.rearTireSize),
    };
    // The card thumbnail defaults to the "before" photo. Don't send (and store)
    // the same multi-hundred-KB data URL twice — the list and detail pages
    // already fall back to beforeImage when `image` is empty.
    if (payload.image && payload.image === payload.beforeImage) payload.image = "";
    // What to do once the save has really finished (not merely been accepted):
    // best-effort, fold whatever Make/Model/Type/Year was just saved back into
    // the predefined lists. Upserts server-side, so this is a no-op when they
    // were picked from the dropdown already — it only matters when "+ Add new…"
    // was used. Never surfaces an error to the person — the vehicle note itself
    // saved successfully regardless of what happens here. Running it only after
    // a successful save means a failed save never leaves stray list entries.
    // Additions are staff/admin, and skipped when editing a vehicle without
    // changing the value — otherwise saving an older vehicle would quietly
    // bring back a Make/Model/Type/Year someone has since deleted.
    const lookupUnchanged =
      editing &&
      form.make === (editing.make || "") &&
      form.model === (editing.model || "") &&
      form.type === (editing.type || "");
    const yearUnchanged = editing && form.year === (editing.year || "");
    const { make, model, type, year } = form;
    // Type is hidden, so a brand-new make / model has no type to file it under:
    // it goes into the Vehicle Notes database as "Uncategorized" so it still
    // shows up in the dropdowns. A model that already exists is left alone.
    const modelKnown = (lookupModels || []).includes(model);
    const afterSave = () => {
      if (isStaffOrAdmin && !lookupUnchanged && (type || !modelKnown)) {
        quickAddLookup.mutate({ make, model, type: type || "Uncategorized" }, { onError: () => { } });
      }
      if (isStaffOrAdmin && year && !yearUnchanged) {
        quickAddLookupYear.mutate(year, { onError: () => { } });
      }
      // Same for the Submodel / Tire size / Wheel offset lists: a value that was
      // typed in via "+ Add new…" becomes a dropdown option. Values that are in the
      // list already, or that an edited vehicle already had, are skipped.
      if (isStaffOrAdmin) {
        const known = { submodel: submodelOptions, "tire-size": tireSizeOptions, "wheel-offset": wheelOffsetOptions };
        const wanted = new Map();
        Object.entries(OPTION_LISTS).forEach(([list, { fields }]) => {
          fields.forEach((field) => {
            const value = String(payload[field] ?? "").trim();
            const before = String(editing?.[field] ?? "").trim();
            if (!value || (editing && value === before) || (known[list] || []).includes(value)) return;
            wanted.set(`${list}|${value}`, { kind: list, value });
          });
        });
        wanted.forEach((entry) => quickAddLookupOption.mutate(entry, { onError: () => { } }));
      }
    };

    setSubmitting(true);
    setUploadPct(0);
    try {
      // Resolves as soon as the server has accepted the save (the upload is the
      // only wait). Writing it to the database happens in the background and is
      // reported by the tray.
      await saveJobs.submit({
        kind: editing ? "update" : "create",
        id: editing?._id,
        payload,
        label: form.name,
        formSnapshot: form,
        editingSnapshot: editing,
        onUploadProgress: setUploadPct,
        onDone: afterSave,
      });
      setFormOpen(false);
    } catch (err) {
      setFormError(saveErrorMessage(err));
    } finally {
      setSubmitting(false);
      setUploadPct(null);
    }
  };

  // A save that failed for a reason only the person can fix (e.g. photos too
  // large): bring the form back exactly as it was, with everything filled in.
  const reopenFailedSave = (save) => {
    if (!save.formSnapshot) return;
    setEditing(save.editingSnapshot || null);
    setForm(save.formSnapshot);
    setFormError(save.message || "");
    setFormOpen(true);
    saveJobs.dismiss(save.clientRef);
  };

  // --- Customers (dropdown on the Add / Edit vehicle form) ---
  // A newly added customer is selected straight away; an edited one keeps the
  // current selection and the prefilled email / phone refresh with the list.
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
    const { kind, make, model, type, value, list } = lookupDelete;
    const optionFields = kind === "option" ? OPTION_LISTS[list].fields.filter((f) => form[f] === value) : [];
    const previous = {
      make: form.make, model: form.model, type: form.type, year: form.year,
      ...Object.fromEntries(optionFields.map((f) => [f, form[f]])),
    };
    const clearsForm =
      (kind === "option" && optionFields.length > 0) ||
      (kind === "make" && form.make === value) ||
      (kind === "model" && form.make === make && form.model === value) ||
      (kind === "type" && form.make === make && form.model === model && form.type === value) ||
      (kind === "year" && form.year === value);

    setFormError("");
    if (clearsForm) {
      if (kind === "option") setForm((f) => ({ ...f, ...Object.fromEntries(optionFields.map((field) => [field, ""])) }));
      else if (kind === "make") onFormMakeChange("");
      else if (kind === "model") onFormModelChange("");
      else if (kind === "year") setForm((f) => ({ ...f, year: "" }));
      else setForm((f) => ({ ...f, type: "" }));
    }

    try {
      if (kind === "option") await deleteLookupOption.mutateAsync({ kind: list, value });
      else if (kind === "make") await deleteLookupMake.mutateAsync(value);
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
      setFormError(err?.response?.data?.message || `Couldn't delete that ${kind === "option" ? OPTION_LISTS[list].label : kind}. Please try again.`);
    } finally {
      setLookupDelete(null);
    }
  };

  const lookupDeleteMessage = (() => {
    if (!lookupDelete) return "";
    const { kind, make, model, value, list } = lookupDelete;
    if (kind === "option") {
      const { label } = OPTION_LISTS[list];
      const shared = OPTION_LISTS[list].fields.length > 1 ? " It's removed from both the front and rear lists." : "";
      return `Delete "${value}" from the ${label} list?${shared} Existing vehicle notes keep their ${label}.`;
    }
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

  // Every photo in the popup as ONE ordered list — before, after, then the gallery —
  // so a click on any of them opens the viewer and the arrows step through all.
  const galleryPhotos = (() => {
    if (!galleryVehicle) return [];
    const name = galleryVehicle.name || "Vehicle";
    const list = [];
    if (galleryVehicle.beforeImage) list.push({ key: "before", src: galleryVehicle.beforeImage, label: `${name} — before` });
    if (galleryVehicle.afterImage) list.push({ key: "after", src: galleryVehicle.afterImage, label: `${name} — after` });
    (galleryVehicle.gallery || []).forEach((src, i) => list.push({ key: `gallery-${i}`, src, label: `${name} — photo ${i + 1}` }));
    return list;
  })();
  const galleryImages = galleryPhotos.map(({ src, label }) => ({ src, label }));
  const openGalleryPhoto = (key) => {
    const idx = galleryPhotos.findIndex((p) => p.key === key);
    if (idx >= 0) setLightboxIndex(idx);
  };

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
          canAdd ? (
            <button type="button" className="btn btn-accent" onClick={openAdd}>
              <Plus size={16} /> Add vehicle
            </button>
          ) : null
        }
      />

      <div className="card vehicle-filter-bar vn-filter-bar mb-16">
        <SearchAutocomplete
          value={filters.search}
          onChange={onSearchChange}
          suggestions={suggestions}
          loading={suggesting}
          placeholder="Search by vehicle name, make, model, submodel, year or modification…"
          ariaLabel="Search vehicles"
        />
        <div className="vn-filter-grid">
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
          {/* HIDDEN: Type filter (SHOW_TYPE). */}
          {SHOW_TYPE && (
            <div className="field">
              <label>Type</label>
              <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
                <option value="">All types</option>
                {filterTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          {/* HIDDEN: Customer filter (SHOW_CUSTOMER). */}
          {SHOW_CUSTOMER && isStaffOrAdmin && (
            <div className="field">
              <label>Customer</label>
              <select value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))}>
                <option value="">All customers</option>
                {customerFilterOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}
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
          <fieldset className="vn-mod-filter">
            <legend>Modification</legend>
            <div className="vn-check-row">
              {MODIFICATION_CHOICES.map((c) => (
                <label key={c.value} className="vn-check">
                  <input
                    type="checkbox"
                    checked={filters.modification.includes(c.value)}
                    onChange={() => toggleFilterModification(c.value)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="button" className="btn btn-ghost vn-filter-clear" onClick={clearFilters} disabled={!filtersActive}>
            <FilterX size={14} /> Clear
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading vehicles…</p>
      ) : filteredVehicles.length === 0 && pendingCreates.length === 0 ? (
        <div className="card empty-state-card text-muted">
          {filtersActive
            ? "No vehicles match the current filters."
            : canAdd ? "No vehicles yet — add your first one." : "No vehicles yet."}
        </div>
      ) : (
        <>
          {pager.searchMode === "text" && (
            <p className="text-muted fs-11 search-note">No exact matches — showing related results.</p>
          )}
          <div className={`vehicle-grid vn-grid${isPageChanging ? " list-updating" : ""}`}>
            {pendingCreates.map((j) => (
              <div key={j.clientRef} className="card vehicle-card vn-card vehicle-card-pending" aria-busy="true">
                <div className="vehicle-image vn-thumb" />
                <div className="vn-body">
                  {/* <p className="vn-name">{j.label}</p> */}
                  <p className="vehicle-pending-note">
                    {j.status === "done" ? "Saved" : <><Loader2 size={13} className="save-spin" /> Saving this vehicle…</>}
                  </p>
                </div>
              </div>
            ))}
            {filteredVehicles.map((v) => {
              const edited = Boolean(v.descriptionUpdatedAt);
              const stamp = edited ? v.descriptionUpdatedAt : v.createdAt;
              return (
                <div key={v._id} className={`card vehicle-card vn-card${savingVehicleIds.has(v._id) ? " is-saving" : ""}`}>
                  {savingVehicleIds.has(v._id) && (
                    <span className="vehicle-saving-tag"><Loader2 size={12} className="save-spin" /> Saving…</span>
                  )}
                  <div className="vn-thumb">
                    {v.image || v.beforeImage ? <AuthImage src={v.image || v.beforeImage} alt={v.name} /> : <Car size={28} color="#C6C9D6" />}
                    {/* Modification sits on the photo (like a badge) so the chip row below stays on one line.
                        Hidden for now (SHOW_CHIP_MODIFICATION in utils/vehicleNoteDisplay.js). */}
                    {SHOW_CHIP_MODIFICATION && (v.modification || []).length > 0 && (
                      <div className="vn-thumb-tags">
                        {v.modification.map((m) => (
                          <span key={m} className={`vn-chip vn-chip-mod is-${m}`}>{modificationLabel(m)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="vn-body">
                    {/* <p className="vn-name" title={v.name}>{v.name}</p> */}
                    <div className="vn-chips">
                      {v.year && <span className="vn-chip vn-chip-year">{v.year}</span>}
                      {v.make && <span className="vn-chip vn-chip-make">{v.make}</span>}
                      {v.model && <span className="vn-chip">{v.model}</span>}
                      {/* Hidden for now (SHOW_CHIP_SUBMODEL in utils/vehicleNoteDisplay.js). */}
                      {SHOW_CHIP_SUBMODEL && v.submodel && <span className="vn-chip">{v.submodel}</span>}
                    </div>
                    <p className={`vn-desc${v.description ? "" : " is-empty"}`} title={v.description || undefined}>
                      {v.description || "No description yet."}
                    </p>
                    <div className="vn-foot">
                      {/* <span className="vn-date" title={stamp ? new Date(stamp).toLocaleString() : undefined}>
                        {edited ? "Updated" : "Created"} {formatStamp(stamp)}
                      </span> */}
                      <div className="vn-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => navigate(`/vehicle-notes/${v._id}`)}
                          title="View details"
                          aria-label={`View details for ${v.name}`}
                        >
                          <Eye size={14} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(v)}
                            title={savingVehicleIds.has(v._id) ? "Saving — available again in a moment" : "Edit"}
                            aria-label={`Edit ${v.name}`}
                            disabled={savingVehicleIds.has(v._id)}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => setDeleteTarget(v)}
                            title="Delete"
                            aria-label={`Delete ${v.name}`}
                            disabled={savingVehicleIds.has(v._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {(v.gallery?.length > 0 || v.beforeImage || v.afterImage) && (
                          <button type="button" className="icon-btn" onClick={() => openGallery(v)} title="Gallery" aria-label={`Open gallery for ${v.name}`}>
                            <Images size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!vehiclesError && <CursorPager pager={pager} noun="vehicles" />}
        </>
      )}

      <Modal open={formOpen} onClose={() => { if (!saving) setFormOpen(false); }} title={editing ? "Edit vehicle" : "Add vehicle"} width={720}>
        <form onSubmit={submitForm}>
          {formError && (
            <div className="alert-error">
              {formError}
            </div>
          )}

          <div className="field field-mb">
            <label>Vehicle name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ford Transit 350" />
          </div>

          {/* Make -> Model: cascading, predefined dropdowns sourced from the
              Vehicle Notes database (managed from Reporting & Data Export).
              Staff and admin get a "+ Add new…" option for values not in the
              list yet and a delete button on every option; everyone else picks
              from the list only. */}
          <div className="tire-input-grid cols-2 field-mb">
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
          </div>

          {/* HIDDEN: Type (SHOW_TYPE). The value an existing vehicle already has
              is kept and sent back unchanged on save. */}
          {SHOW_TYPE && (
            <div className="field-mb">
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
          )}

          {/* Year is the same kind of predefined, dynamic dropdown as Make/Model
              (same EditableSelect, same "+ Add new…" and per-option delete for
              staff and admin) — it just doesn't cascade off anything.
              Submodel is the trim / sub-model from tblAppGuide (BASE, PREMIUM…) and,
              like the tire sizes and wheel offsets below, is a predefined dropdown
              with the same add-new / delete rules. */}
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
            <EditableSelect
              label="Submodel"
              value={form.submodel}
              onChange={setField("submodel")}
              options={submodelOptions}
              loading={loadingSubmodels}
              placeholder="Select submodel"
              addNewLabel="+ Add new submodel…"
              customPlaceholder="e.g. BASE, PREMIUM, TYPE-S"
              canAddNew={isStaffOrAdmin}
              keepDropdownWhenEmpty
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "option", list: "submodel", value }) : undefined}
              inputProps={{ maxLength: 80 }}
            />
          </div>

          <div className="tire-input-grid cols-2 field-mb">
            <div className="field">
              <label>Event date</label>
              <input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
            </div>
            <fieldset className="vn-fieldset">
              <legend>Modification</legend>
              <div className="vn-check-row">
                {MODIFICATION_CHOICES.map((c) => (
                  <label key={c.value} className="vn-check">
                    <input
                      type="checkbox"
                      checked={form.modification.includes(c.value)}
                      onChange={() => toggleFormModification(c.value)}
                    />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Fitment — same data as the Stagfront / Stagrear and front / rear
              offset columns of tblAppGuide-Templatenew.xlsx. All four are
              predefined dropdowns like Make / Model / Year: staff and admin get
              "+ Add new…" and a delete button on every option, everyone else
              picks from the list. Front and rear share one tire size list and
              one offset list. */}
          <div className="tire-input-grid cols-2 field-mb">
            <EditableSelect
              label="Front tire size"
              value={form.frontTireSize}
              onChange={setField("frontTireSize")}
              options={tireSizeOptions}
              loading={loadingTireSizes}
              placeholder="Select front tire size"
              addNewLabel="+ Add new tire size…"
              customPlaceholder="205 55 16"
              canAddNew={isStaffOrAdmin}
              keepDropdownWhenEmpty
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "option", list: "tire-size", value }) : undefined}
              transformInput={cleanTireSizeInput}
              onCustomBlur={tidyTireSize("frontTireSize")}
              inputProps={{ inputMode: "text", autoComplete: "off" }}
            />
            <EditableSelect
              label="Rear tire size"
              value={form.rearTireSize}
              onChange={setField("rearTireSize")}
              options={tireSizeOptions}
              loading={loadingTireSizes}
              placeholder="Select rear tire size"
              addNewLabel="+ Add new tire size…"
              customPlaceholder="225 50 16"
              canAddNew={isStaffOrAdmin}
              keepDropdownWhenEmpty
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "option", list: "tire-size", value }) : undefined}
              transformInput={cleanTireSizeInput}
              onCustomBlur={tidyTireSize("rearTireSize")}
              inputProps={{ inputMode: "text", autoComplete: "off" }}
            />
            <EditableSelect
              label="Front wheel offset"
              value={form.frontWheelOffset}
              onChange={setField("frontWheelOffset")}
              options={wheelOffsetOptions}
              loading={loadingWheelOffsets}
              placeholder="Select front wheel offset"
              addNewLabel="+ Add new offset…"
              customPlaceholder="e.g. 35"
              canAddNew={isStaffOrAdmin}
              keepDropdownWhenEmpty
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "option", list: "wheel-offset", value }) : undefined}
              transformInput={cleanOffsetInput}
              inputProps={{ inputMode: "numeric", autoComplete: "off" }}
            />
            <EditableSelect
              label="Rear wheel offset"
              value={form.rearWheelOffset}
              onChange={setField("rearWheelOffset")}
              options={wheelOffsetOptions}
              loading={loadingWheelOffsets}
              placeholder="Select rear wheel offset"
              addNewLabel="+ Add new offset…"
              customPlaceholder="e.g. 40"
              canAddNew={isStaffOrAdmin}
              keepDropdownWhenEmpty
              onDeleteOption={isStaffOrAdmin ? (value) => setLookupDelete({ kind: "option", list: "wheel-offset", value }) : undefined}
              transformInput={cleanOffsetInput}
              inputProps={{ inputMode: "numeric", autoComplete: "off" }}
            />
          </div>

          <div className="field field-mb">
            <label htmlFor="vn-description">Description</label>
            <textarea
              id="vn-description"
              className="vn-textarea"
              rows={4}
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the vehicle, the work done or anything worth remembering…"
            />
            <span className="vn-counter">{form.description.length}/2000</span>
          </div>

          {/* HIDDEN: Customer (SHOW_CUSTOMER) — staff and admin only. Options read
              "Full name (email)". Staff and admin can add a customer from the
              dropdown; only admin gets the edit / delete buttons. Picking a
              customer prefills the (read-only) email and phone below. An
              existing vehicle keeps the customer it already has. */}
          {SHOW_CUSTOMER && isStaffOrAdmin && (
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

          <div className="field field-mb-lg">
            <label>Before &amp; after photos</label>
            <div className="before-after-grid">
              <label className="image-upload">
                {form.beforeImage ? <AuthImage src={form.beforeImage} alt="before preview" /> : (
                  <span className="image-upload-placeholder">
                    <Camera size={18} color="var(--color-muted)" />
                    <span className="text-muted fs-11">Before</span>
                  </span>
                )}
                <input type="file" accept="image/*" onChange={onSingleFileChange("beforeImage")} hidden />
              </label>
              <label className="image-upload">
                {form.afterImage ? <AuthImage src={form.afterImage} alt="after preview" /> : (
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
              {/* <div className="field field-mb">
                <label>Engine spec</label>
                <input
                  value={form.existingSpec.engine}
                  onChange={(e) => updateSpec("existingSpec")({ engine: e.target.value })}
                  placeholder="e.g. 2.2L Duratorq TDCi Diesel"
                />
              </div> */}
              <div className="tire-input-grid">
                <div className="field">
                  <label>Width</label>
                  <input
                    {...NUMERIC_INPUT_PROPS}
                    maxLength={TIRE_MAX.width}
                    value={form.existingSpec.tyre.width}
                    onChange={(e) => updateSpec("existingSpec")({ tyre: { width: onlyDigits(e.target.value, TIRE_MAX.width) } })}
                  />
                </div>
                <div className="field">
                  <label>Aspect</label>
                  <input
                    {...NUMERIC_INPUT_PROPS}
                    maxLength={TIRE_MAX.aspect}
                    value={form.existingSpec.tyre.aspect}
                    onChange={(e) => updateSpec("existingSpec")({ tyre: { aspect: onlyDigits(e.target.value, TIRE_MAX.aspect) } })}
                  />
                </div>
                <div className="field">
                  <label>Rim</label>
                  <input
                    {...NUMERIC_INPUT_PROPS}
                    maxLength={TIRE_MAX.rim}
                    value={form.existingSpec.tyre.rim}
                    onChange={(e) => updateSpec("existingSpec")({ tyre: { rim: onlyDigits(e.target.value, TIRE_MAX.rim) } })}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "24px 0" }} />

            <div className="spec-section">
              <h4 className="spec-section-title mb-10" style={{ color: "var(--color-pink)" }}>Upgraded (after)</h4>
              {/* <div className="field field-mb">
                <label>Engine spec</label>
                <input
                  value={form.upgradedSpec.engine}
                  onChange={(e) => updateSpec("upgradedSpec")({ engine: e.target.value })}
                  placeholder="e.g. 2.0L EcoBlue Bi-Turbo Diesel"
                />
              </div> */}
              <div className="tire-input-grid">
                <div className="field">
                  <label>Width</label>
                  <input
                    {...NUMERIC_INPUT_PROPS}
                    maxLength={TIRE_MAX.width}
                    value={form.upgradedSpec.tyre.width}
                    onChange={(e) => updateSpec("upgradedSpec")({ tyre: { width: onlyDigits(e.target.value, TIRE_MAX.width) } })}
                  />
                </div>
                <div className="field">
                  <label>Aspect</label>
                  <input
                    {...NUMERIC_INPUT_PROPS}
                    maxLength={TIRE_MAX.aspect}
                    value={form.upgradedSpec.tyre.aspect}
                    onChange={(e) => updateSpec("upgradedSpec")({ tyre: { aspect: onlyDigits(e.target.value, TIRE_MAX.aspect) } })}
                  />
                </div>
                <div className="field">
                  <label>Rim</label>
                  <input
                    {...NUMERIC_INPUT_PROPS}
                    maxLength={TIRE_MAX.rim}
                    value={form.upgradedSpec.tyre.rim}
                    onChange={(e) => updateSpec("upgradedSpec")({ tyre: { rim: onlyDigits(e.target.value, TIRE_MAX.rim) } })}
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
                  <AuthImage src={photo} alt="gallery item" />
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
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving
                ? uploadPct != null && uploadPct < 100 ? `Uploading… ${uploadPct}%` : "Sending…"
                : editing ? "Save changes" : "Add vehicle"}
            </button>
          </div>
          {saving && (
            <div className="save-upload-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadPct ?? 0}>
              <span style={{ width: `${uploadPct ?? 0}%` }} />
            </div>
          )}
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
                  {/* Both open in the full-size viewer (which stacks above this popup). */}
                  {galleryVehicle.beforeImage ? (
                    <button type="button" className="gallery-thumb wide" onClick={() => openGalleryPhoto("before")} aria-label="View before photo full size">
                      <AuthImage src={galleryVehicle.beforeImage} alt="before" />
                    </button>
                  ) : (
                    <div className="gallery-thumb wide is-empty"><span className="text-muted fs-11">No before photo</span></div>
                  )}
                  {galleryVehicle.afterImage ? (
                    <button type="button" className="gallery-thumb wide" onClick={() => openGalleryPhoto("after")} aria-label="View after photo full size">
                      <AuthImage src={galleryVehicle.afterImage} alt="after" />
                    </button>
                  ) : (
                    <div className="gallery-thumb wide is-empty"><span className="text-muted fs-11">No after photo</span></div>
                  )}
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
                  <div key={photo} className="gallery-thumb" onClick={() => openGalleryPhoto(`gallery-${i}`)}>
                    <AuthImage src={photo} alt={`gallery ${i + 1}`} />
                    {canEdit && (
                      <button
                        type="button"
                        className="gallery-thumb-remove"
                        onClick={(e) => { e.stopPropagation(); removeGalleryPhotoAt(photo); }}
                        title="Remove"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <label className="gallery-add-tile">
                    <ImagePlus size={18} />
                    Add
                    <input type="file" accept="image/*" onChange={onQuickAddGalleryPhoto} hidden />
                  </label>
                )}
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

      {SHOW_CUSTOMER && isStaffOrAdmin && (
        <CustomerFormModal
          open={customerModal.open}
          customer={customerModal.customer}
          onClose={() => setCustomerModal((m) => ({ ...m, open: false }))}
          onSaved={(saved) => onCustomerSaved(saved, !customerModal.customer)}
        />
      )}

      {SHOW_CUSTOMER && isAdmin && (
        <ConfirmDialog
          open={!!customerDelete}
          onClose={() => setCustomerDelete(null)}
          onConfirm={confirmDeleteCustomer}
          busy={deleteCustomerMutation.isPending}
          title="Delete customer"
          // message={`Delete ${customerDelete?.fullName || "this customer"} (${customerDelete?.email || ""})? They'll be removed from any vehicle notes and tire presets they're attached to — the vehicles and presets themselves are kept. This can't be undone.`} // hidden: wording mentioned Tire Size Option presets
          message={`Delete ${customerDelete?.fullName || "this customer"} (${customerDelete?.email || ""})? They'll be removed from any vehicle notes they're attached to — the vehicles themselves are kept. This can't be undone.`}
        />
      )}

      {isStaffOrAdmin && (
        <ConfirmDialog
          open={!!lookupDelete}
          onClose={() => setLookupDelete(null)}
          onConfirm={confirmDeleteLookup}
          busy={lookupDeleting}
          title={`Delete ${lookupDelete?.kind === "option" ? OPTION_LISTS[lookupDelete.list].label : lookupDelete?.kind || "entry"}`}
          message={lookupDeleteMessage}
        />
      )}

      <SaveStatusTray
        saves={saveJobs.saves}
        onDismiss={saveJobs.dismiss}
        onRetry={saveJobs.retry}
        onReopen={reopenFailedSave}
      />
    </div>
  );
}