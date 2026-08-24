import { Camera, Car, ImagePlus, Images, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
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

const MOCK_VEHICLES = [
  { _id: "v1", name: "Ford Transit 350", type: "Cargo Van", model: "2023", image: "", beforeImage: "", afterImage: "", gallery: [] },
  { _id: "v2", name: "Toyota Hilux", type: "Pickup Truck", model: "2022", image: "", beforeImage: "", afterImage: "", gallery: [] },
  { _id: "v3", name: "Tata Ace", type: "Mini Truck", model: "2021", image: "", beforeImage: "", afterImage: "", gallery: [] },
];

const emptyForm = {
  name: "",
  type: "",
  model: "",
  image: "",
  beforeImage: "",
  afterImage: "",
  gallery: [],
  staffNotes: [],
  eventDate: "",
  existingSpec: { engine: "", tyre: { width: "", aspect: "", rim: "" } },
  upgradedSpec: { engine: "", tyre: { width: "", aspect: "", rim: "" } },
};

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

  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;
  const currentEditingVehicle = editing ? vehicles.find((v) => v._id === editing._id) || editing : null;

  const notesToRender = editing ? (currentEditingVehicle?.staffNotes || []) : (form.staffNotes || []);

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
      type: v.type,
      model: v.model,
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
    if (!form.name || !form.type || !form.model) {
      setFormError("Vehicle name, type and model are required.");
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, ...form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setFormOpen(false);
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

      {loading ? (
        <p className="text-muted">Loading vehicles…</p>
      ) : vehicles.length === 0 ? (
        <div className="card empty-state-card text-muted">
          No vehicles yet — add your first one.
        </div>
      ) : (
        <div className="vehicle-grid">
          {vehicles.map((v) => (
            <div key={v._id} className="card vehicle-card">
              <div className="vehicle-image">
                {v.image || v.beforeImage ? <img src={v.image || v.beforeImage} alt={v.name} /> : <Car size={30} color="#C6C9D6" />}
              </div>
              <div className="vehicle-body">
                <p className="vehicle-name">{v.name}</p>
                <div className="vehicle-tags">
                  <span className="badge badge-live">{v.type}</span>
                  <span className="badge badge-model">{v.model}</span>
                </div>
                <p className="text-muted fs-11 mt-4">
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
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ford Transit 350" />
          </div>

          <div className="tire-input-grid field-mb">
            <div className="field">
              <label>Type</label>
              <input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Cargo Van" />
            </div>
            <div className="field">
              <label>Model / year</label>
              <input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="2023" />
            </div>
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
    </div>
  );
}