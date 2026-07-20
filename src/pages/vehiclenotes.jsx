import { Camera, Car, ImagePlus, Images, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
import Lightbox from "../components/lightbox";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import {
  useAddVehicleGalleryPhoto,
  useCreateVehicleNote,
  useDeleteVehicleNote,
  useRemoveVehicleGalleryPhoto,
  useUpdateVehicleNote,
  useVehicleNotesQuery,
} from "../hooks/queries/useVehicleNotes";

const MOCK_VEHICLES = [
  { _id: "v1", name: "Ford Transit 350", type: "Cargo Van", model: "2023", image: "", beforeImage: "", afterImage: "", gallery: [] },
  { _id: "v2", name: "Toyota Hilux", type: "Pickup Truck", model: "2022", image: "", beforeImage: "", afterImage: "", gallery: [] },
  { _id: "v3", name: "Tata Ace", type: "Mini Truck", model: "2021", image: "", beforeImage: "", afterImage: "", gallery: [] },
];

const emptyForm = { name: "", type: "", model: "", image: "", beforeImage: "", afterImage: "", gallery: [] };

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VehicleNotes() {
  const { data: fetchedVehicles, isLoading: loading, isError: vehiclesError } = useVehicleNotesQuery();
  const vehicles = vehiclesError ? MOCK_VEHICLES : fetchedVehicles || [];
  const createMutation = useCreateVehicleNote();
  const updateMutation = useUpdateVehicleNote();
  const deleteMutation = useDeleteVehicleNote();
  const addGalleryPhoto = useAddVehicleGalleryPhoto();
  const removeGalleryPhoto = useRemoveVehicleGalleryPhoto();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Gallery viewer: which vehicle's gallery is open + which photo index is
  // showing in the lightbox (null = lightbox closed).
  const [galleryVehicle, setGalleryVehicle] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const saving = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;

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
    });
    setFormError("");
    setFormOpen(true);
  };

  const onSingleFileChange = (field) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    // Use the "before" photo as the card thumbnail when no explicit
    // thumbnail has been set yet — keeps existing card layout working.
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
        eyebrow="Fleet records"
        title="Vehicle Notes"
        subtitle="Keep a visual reference of every vehicle in the fleet — including before/after photos and a full image gallery."
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
                  <span className="badge badge-live">
                    {v.type}
                  </span>
                  <span className="badge badge-model">
                    {v.model}
                  </span>
                </div>
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit vehicle" : "Add vehicle"} width={520}>
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
          </div>

          <div className="field field-mb-lg">
            <label>Before &amp; after photos</label>
            <div className="before-after-grid">
              <label className="image-upload">
                {form.beforeImage ? <img src={form.beforeImage} alt="before preview" /> : (
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <Camera size={18} color="var(--color-muted)" />
                    <span style={{ fontSize: 11, color: "var(--color-muted)" }}>Before</span>
                  </span>
                )}
                <input type="file" accept="image/*" onChange={onSingleFileChange("beforeImage")} hidden />
              </label>
              <label className="image-upload">
                {form.afterImage ? <img src={form.afterImage} alt="after preview" /> : (
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <Camera size={18} color="var(--color-muted)" />
                    <span style={{ fontSize: 11, color: "var(--color-muted)" }}>After</span>
                  </span>
                )}
                <input type="file" accept="image/*" onChange={onSingleFileChange("afterImage")} hidden />
              </label>
            </div>
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
                  <div className="gallery-thumb" style={{ aspectRatio: "4/3" }}>
                    {galleryVehicle.beforeImage ? <img src={galleryVehicle.beforeImage} alt="before" /> : <span className="text-muted" style={{ fontSize: 11 }}>No before photo</span>}
                  </div>
                  <div className="gallery-thumb" style={{ aspectRatio: "4/3" }}>
                    {galleryVehicle.afterImage ? <img src={galleryVehicle.afterImage} alt="after" /> : <span className="text-muted" style={{ fontSize: 11 }}>No after photo</span>}
                  </div>
                </div>
              </div>
            )}

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
