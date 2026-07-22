import { Box, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import {
  useCreateTireOption,
  useDeleteTireOption,
  useTireOptionsQuery,
  useUpdateTireOption,
} from "../hooks/queries/useTireOptions";
import { tireDiameterInches } from "../utils/tireMath";

const MOCK_PRESETS = [
  { _id: "t1", label: "Factory Standard", width: 225, aspect: 65, rim: 17 },
  { _id: "t2", label: "Off-Road Package", width: 265, aspect: 70, rim: 17 },
  { _id: "t3", label: "Highway Comfort", width: 215, aspect: 60, rim: 16 },
];

const emptyForm = { label: "", width: 205, aspect: 55, rim: 16 };

export default function TireSizeOption() {
  const { data: fetchedPresets, isLoading: loading, isError: presetsError } = useTireOptionsQuery();
  const presets = presetsError ? MOCK_PRESETS : fetchedPresets || [];
  const createMutation = useCreateTireOption();
  const updateMutation = useUpdateTireOption();
  const deleteMutation = useDeleteTireOption();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewPreset, setPreviewPreset] = useState(null);

  const saving = createMutation.isPending || updateMutation.isPending;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm(p);
    setFormError("");
    setFormOpen(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.label || !form.width || !form.aspect || !form.rim) {
      setFormError("Fill in every field.");
      return;
    }
    const payload = { ...form, width: Number(form.width), aspect: Number(form.aspect), rim: Number(form.rim) };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setFormOpen(false);
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

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Tire Size Option"
        subtitle="Save the tire sizes so they're one click away in the comparison tool."
        action={
          <button type="button" className="btn btn-accent" onClick={openAdd}>
            <Plus size={16} /> Add preset
          </button>
        }
      />

      {loading ? (
        <p className="text-muted">Loading presets…</p>
      ) : presets.length === 0 ? (
        <div className="card empty-state-block">
          No tire presets yet — add your first one.
        </div>
      ) : (
        <div className="preset-grid">
          {presets.map((p) => (
            <div key={p._id} className="card preset-card">
              <div>
                <p className="preset-label">{p.label}</p>
                <p className="preset-size">
                  {p.width}/{p.aspect} R{p.rim}
                </p>
                <p className="preset-diameter">≈ {tireDiameterInches(p).toFixed(1)}" diameter</p>
                <button type="button" className="tire3d-modal-trigger" onClick={() => setPreviewPreset(p)}>
                  <Box size={13} /> Preview in 3D
                </button>
              </div>
              <div className="preset-actions">
                <button type="button" className="icon-btn" onClick={() => openEdit(p)} title="Edit">
                  <Pencil size={14} />
                </button>
                <button type="button" className="icon-btn danger" onClick={() => setDeleteTarget(p)} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!previewPreset} onClose={() => setPreviewPreset(null)} title={previewPreset?.label || "3D preview"} width={420}>
        {previewPreset && (
          <Tire3DVisualizer
            tire={previewPreset}
            label={`${previewPreset.width}/${previewPreset.aspect}R${previewPreset.rim} · ≈ ${tireDiameterInches(previewPreset).toFixed(1)}" diameter`}
            accent="#FF6F91"
            height={280}
            zoomable
          />
        )}
      </Modal>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit preset" : "Add preset"} width={400}>
        <form onSubmit={submitForm}>
          {formError && (
            <div className="alert-error">
              {formError}
            </div>
          )}
          <div className="field field-mb">
            <label htmlFor="pLabel">Preset name</label>
            <input id="pLabel" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Factory Standard" />
          </div>
          <div className="preset-form-grid">
            <div className="field">
              <label htmlFor="pWidth">Width (mm)</label>
              <input id="pWidth" type="number" value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="pAspect">Aspect (%)</label>
              <input id="pAspect" type="number" value={form.aspect} onChange={(e) => setForm((f) => ({ ...f, aspect: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="pRim">Rim (in)</label>
              <input id="pRim" type="number" value={form.rim} onChange={(e) => setForm((f) => ({ ...f, rim: e.target.value }))} />
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete preset"
        message={`Remove "${deleteTarget?.label}"? This can't be undone.`}
      />
    </div>
  );
}