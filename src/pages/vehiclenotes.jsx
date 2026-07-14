import { Car, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import {
  useCreateVehicleNote,
  useDeleteVehicleNote,
  useUpdateVehicleNote,
  useVehicleNotesQuery,
} from "../hooks/queries/useVehicleNotes";

const MOCK_VEHICLES = [
  { _id: "v1", name: "Ford Transit 350", type: "Cargo Van", model: "2023", image: "" },
  { _id: "v2", name: "Toyota Hilux", type: "Pickup Truck", model: "2022", image: "" },
  { _id: "v3", name: "Tata Ace", type: "Mini Truck", model: "2021", image: "" },
];

const emptyForm = { name: "", type: "", model: "", image: "" };

export default function VehicleNotes() {
  const { data: fetchedVehicles, isLoading: loading, isError: vehiclesError } = useVehicleNotesQuery();
  const vehicles = vehiclesError ? MOCK_VEHICLES : fetchedVehicles || [];
  const createMutation = useCreateVehicleNote();
  const updateMutation = useUpdateVehicleNote();
  const deleteMutation = useDeleteVehicleNote();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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
    setForm({ name: v.name, type: v.type, model: v.model, image: v.image || "" });
    setFormError("");
    setFormOpen(true);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
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

  return (
    <div>
      <PageHeader
        eyebrow="Fleet records"
        title="Vehicle Notes"
        subtitle="Keep a visual reference of every vehicle in the fleet."
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
                {v.image ? <img src={v.image} alt={v.name} /> : <Car size={30} color="#C6C9D6" />}
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit vehicle" : "Add vehicle"} width={440}>
        <form onSubmit={submitForm}>
          {formError && (
            <div className="alert-error">
              {formError}
            </div>
          )}

          <div className="field field-mb">
            <label>Vehicle image</label>
            <label className="image-upload">
              {form.image ? <img src={form.image} alt="preview" /> : <ImagePlus size={20} color="var(--color-muted)" />}
              <input type="file" accept="image/*" onChange={onFileChange} hidden />
            </label>
          </div>

          <div className="field field-mb">
            <label htmlFor="vName">Vehicle name</label>
            <input id="vName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ford Transit 350" />
          </div>

          <div className="field field-mb">
            <label htmlFor="vType">Type</label>
            <input id="vType" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Cargo Van" />
          </div>

          <div className="field field-mb-lg">
            <label htmlFor="vModel">Model / year</label>
            <input id="vModel" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="2023" />
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