import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import axios from "../utils/axiosInstance";
import { tireDiameterInches } from "../utils/tireMath";

const MOCK_PRESETS = [
  { _id: "t1", label: "Factory Standard", width: 225, aspect: 65, rim: 17 },
  { _id: "t2", label: "Off-Road Package", width: 265, aspect: 70, rim: 17 },
  { _id: "t3", label: "Highway Comfort", width: 215, aspect: 60, rim: 16 },
];

const emptyForm = { label: "", width: 205, aspect: 55, rim: 16 };

export default function TireSizeOption() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let ignore = false;
    axios
      .get("api/tire-options")
      .then(({ data }) => !ignore && setPresets(data.options || data || []))
      .catch(() => !ignore && setPresets(MOCK_PRESETS))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, []);

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
    setSaving(true);
    const payload = { ...form, width: Number(form.width), aspect: Number(form.aspect), rim: Number(form.rim) };
    try {
      if (editing) {
        await axios.put(`api/tire-options/${editing._id}`, payload);
        setPresets((list) => list.map((p) => (p._id === editing._id ? { ...p, ...payload } : p)));
      } else {
        const { data } = await axios.post("api/tire-options", payload);
        setPresets((list) => [data.option || { ...payload, _id: `local-${Date.now()}` }, ...list]);
      }
      setFormOpen(false);
    } catch {
      if (editing) {
        setPresets((list) => list.map((p) => (p._id === editing._id ? { ...p, ...payload } : p)));
      } else {
        setPresets((list) => [{ ...payload, _id: `local-${Date.now()}` }, ...list]);
      }
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`api/tire-options/${deleteTarget._id}`);
    } catch {
      /* remove locally regardless */
    } finally {
      setPresets((list) => list.filter((p) => p._id !== deleteTarget._id));
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Tire Size Option"
        subtitle="Save the tire sizes your fleet uses so they're one click away in the comparison tool."
        action={
          <button type="button" className="btn btn-accent" onClick={openAdd}>
            <Plus size={16} /> Add preset
          </button>
        }
      />

      {loading ? (
        <p className="text-muted">Loading presets…</p>
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