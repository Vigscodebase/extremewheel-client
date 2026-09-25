import { Box, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ConfirmDialog from "../components/confirmdialog";
import EditableSelect from "../components/EditableSelect";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import TireSuggestions from "../components/TireSuggestions";
import { useAuth } from "../context/authcontext";
import {
  useCreateTireOption,
  useDeleteTireOption,
  useTireOptionsQuery,
  useUpdateTireOption,
} from "../hooks/queries/useTireOptions";
import {
  useAddVehicleLookupMake,
  useDeleteVehicleLookupMake,
  useVehicleLookupMakes,
} from "../hooks/queries/useVehicleLookup";
import { tireDiameterInches } from "../utils/tireMath";

const MOCK_PRESETS = [
  { _id: "t1", label: "Ford", make: "Ford", width: 225, aspect: 65, rim: 17 },
  { _id: "t2", label: "Toyota", make: "Toyota", width: 265, aspect: 70, rim: 17 },
  { _id: "t3", label: "Highway Comfort", make: "", width: 215, aspect: 60, rim: 16 },
];

// A preset has no free-text name — it's named after the entry picked from the
// "Preset name" dropdown, which is backed by the shared Vehicle Notes make
// list (saved as both `make` and `label`, since the Calculator, Comparison
// and Tech Data pages display `label`).
const emptyForm = { make: "", width: 205, aspect: 55, rim: 16 };

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
  const { data: fetchedPresets, isLoading: loading, isError: presetsError } = useTireOptionsQuery();
  const presets = presetsError ? MOCK_PRESETS : fetchedPresets || [];
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

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewPreset, setPreviewPreset] = useState(null);
  const [makeToDelete, setMakeToDelete] = useState(null);

  // Arrived here via a "Saved preset" suggestion chip elsewhere in the app —
  // open the add-preset form pre-loaded with that size so it's one click
  // away from being saved for real.
  useEffect(() => {
    const prefill = location.state?.prefillPreset;
    if (prefill && canManagePresets) {
      setEditing(null);
      setForm({ make: prefill.make || "", width: prefill.width, aspect: prefill.aspect, rim: prefill.rim });
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
    // Older presets were saved with a custom name and an optional make — only
    // the make carries over; saving names the preset after it, so it lands in
    // the "Preset name" field.
    setForm({ make: p.make || "", width: p.width, aspect: p.aspect, rim: p.rim });
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
    const payload = { label: make, make, width: Number(form.width), aspect: Number(form.aspect), rim: Number(form.rim) };
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
      const isNewMake = !existingMake && make !== editing?.make;
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

  return (
    <div>
      <PageHeader
        eyebrow="Tire library"
        title="Tire Size Option"
        subtitle="Save the tire sizes so they're one click away in the comparison tool."
        action={
          canManagePresets && (
            <button type="button" className="btn btn-accent" onClick={openAdd}>
              <Plus size={16} /> Add preset
            </button>
          )
        }
      />

      {loading ? (
        <p className="text-muted">Loading presets…</p>
      ) : presets.length === 0 ? (
        <div className="card empty-state-block">
          No tire presets yet{canManagePresets ? " — add your first one." : "."}
        </div>
      ) : (
        <div className="preset-grid">
          {presets.map((p) => (
            <div key={p._id} className="card preset-card">
              <div className="preset-info">
                <p className="preset-label">{p.label}</p>
                {p.make && p.make !== p.label && <span className="badge badge-model mb-4">{p.make}</span>}
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