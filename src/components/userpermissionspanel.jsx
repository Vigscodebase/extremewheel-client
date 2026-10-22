import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { usePermissions } from "../context/permissioncontext";
import { useUpdateUserPermissions } from "../hooks/queries/useUsers";
import {
  ALL_EDITABLE_KEYS,
  PERMISSION_GROUPS,
  ancestorsOf,
  descendantsOf,
  formatUserLabel,
} from "../utils/permissions";
import ConfirmDialog from "./confirmdialog";

const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));

/**
 * Edits ONE user's permissions at a time. Permissions belong to the user's
 * (unique) email — the picker shows "Full name (email)" so it is always clear
 * whose access is being changed, and the save is sent with that email so the
 * server can refuse it if the address was changed in the meantime.
 *
 * Page permissions come first; the buttons / tiles / tabs inside a page are
 * nested under it. Granting an element switches its page on, and switching a
 * page off removes everything inside it, so the list can never contradict
 * itself (the server enforces the same rule).
 */
export default function UserPermissionsPanel({ users, loading, error, selectedId, onSelect }) {
  const { notifyPermissionsChanged } = usePermissions();
  const saveMutation = useUpdateUserPermissions();

  const [draft, setDraft] = useState(null); // { userId, keys: Set } — unsaved edits
  const [pendingId, setPendingId] = useState(null); // switching away from unsaved edits
  const [saveError, setSaveError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || "")),
    [users]
  );

  const selected = users.find((u) => u._id === selectedId) || null;
  const isAdminUser = selected?.role === "admin";

  // What the user has right now: an element only counts if its page is granted
  // too, mirroring how the server evaluates it. Admins always hold everything.
  const savedKeys = useMemo(() => {
    const stored = new Set(selected?.permissions || []);
    if (isAdminUser) return new Set(ALL_EDITABLE_KEYS);
    return new Set(ALL_EDITABLE_KEYS.filter((k) => stored.has(k) && ancestorsOf(k).every((a) => stored.has(a))));
  }, [selected, isAdminUser]);

  const hasDraft = draft?.userId === selectedId;
  const keys = hasDraft ? draft.keys : savedKeys;
  const dirty = hasDraft && !sameSet(draft.keys, savedKeys);

  const edit = (next) => {
    setJustSaved(false);
    setSaveError("");
    setDraft({ userId: selectedId, keys: next });
  };

  const toggle = (key) => {
    const next = new Set(keys);
    if (next.has(key)) {
      next.delete(key);
      descendantsOf(key).forEach((k) => next.delete(k));
    } else {
      next.add(key);
      ancestorsOf(key).forEach((k) => next.add(k));
    }
    edit(next);
  };

  const requestSelect = (id) => {
    if (id === selectedId) return;
    if (dirty) {
      setPendingId(id);
      return;
    }
    setDraft(null);
    setJustSaved(false);
    setSaveError("");
    onSelect(id);
  };

  const confirmSwitch = () => {
    setDraft(null);
    setJustSaved(false);
    setSaveError("");
    onSelect(pendingId);
    setPendingId(null);
  };

  const save = async () => {
    if (!selected || !dirty) return;
    setSaveError("");
    try {
      await saveMutation.mutateAsync({
        id: selected._id,
        email: selected.email,
        permissions: [...keys],
      });
      setDraft(null);
      setJustSaved(true);
      notifyPermissionsChanged();
    } catch (err) {
      setSaveError(err?.response?.data?.message || "Couldn't save permissions. Please try again.");
    }
  };

  if (loading) return <div className="card p-22 text-muted">Loading users…</div>;
  if (error) {
    return <div className="card p-22 alert-error">Couldn't load users, so permissions can't be edited right now.</div>;
  }
  if (users.length === 0) return <div className="card empty-state-block">No users yet — add your first one.</div>;

  const grantedCount = keys.size;

  return (
    <div className="card p-22">
      <p className="text-muted fs-13-5 mb-18">
        Permissions are granted to each user's email address. If a user's email is changed, their permissions are reset
        and must be granted again. Admin accounts always have full access.
      </p>

      <div className="field perm-picker">
        <label htmlFor="permUser">User</label>
        <select id="permUser" value={selectedId || ""} onChange={(e) => requestSelect(e.target.value)}>
          {sortedUsers.map((u) => (
            <option key={u._id} value={u._id}>
              {formatUserLabel(u)}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          <div className="perm-user-head">
            <div className="perm-user-id">
              <span className="perm-avatar">{(selected.name || selected.email || "?").charAt(0).toUpperCase()}</span>
              <div>
                <p className="perm-user-name">
                  {selected.name || selected.email} <span className={`badge badge-${selected.role}`}>{selected.role}</span>
                </p>
                <p className="perm-user-email">{selected.email}</p>
              </div>
            </div>
            <div className="perm-user-tools">
              <span className="perm-count">
                {grantedCount} of {ALL_EDITABLE_KEYS.length} granted
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={isAdminUser}
                onClick={() => edit(new Set(ALL_EDITABLE_KEYS))}
              >
                Select all
              </button>
              <button type="button" className="btn btn-ghost" disabled={isAdminUser} onClick={() => edit(new Set())}>
                Clear all
              </button>
            </div>
          </div>

          {isAdminUser && (
            <div className="speedo-banner ok">
              <ShieldCheck size={14} className="icon-inline" /> Admin accounts always have full access, so there is
              nothing to configure here.
            </div>
          )}

          <div className="perm-groups">
            {PERMISSION_GROUPS.map(({ page, elements }) => {
              const pageOn = keys.has(page.key);
              return (
                <fieldset className="perm-group" key={page.key}>
                  <label className="perm-row perm-page">
                    <input
                      type="checkbox"
                      checked={pageOn}
                      disabled={isAdminUser}
                      onChange={() => toggle(page.key)}
                    />
                    <span>{page.label}</span>
                  </label>
                  {elements.length > 0 && (
                    <>
                      <span className="perm-caption">{page.key === "dashboard" ? "Tiles" : "Controls"}</span>
                      {elements.map((el) => (
                        <label
                          key={el.key}
                          className={`perm-row perm-el depth-${el.depth}${pageOn ? "" : " dim"}`}
                        >
                          <input
                            type="checkbox"
                            checked={keys.has(el.key)}
                            disabled={isAdminUser}
                            onChange={() => toggle(el.key)}
                          />
                          <span>{el.label}</span>
                        </label>
                      ))}
                    </>
                  )}
                </fieldset>
              );
            })}
          </div>

          {saveError && <div className="alert-error mt-16">{saveError}</div>}

          <div className="perm-savebar">
            <span className="perm-savestate">
              {dirty ? "Unsaved changes" : justSaved ? "Permissions saved" : ""}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => {
                setDraft(null);
                setSaveError("");
              }}
            >
              <RotateCcw size={15} /> Discard
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saveMutation.isPending}>
              <Save size={16} /> {saveMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingId}
        onClose={() => setPendingId(null)}
        onConfirm={confirmSwitch}
        title="Discard unsaved changes?"
        message={`You have unsaved permission changes for ${formatUserLabel(selected)}. Switching users will discard them.`}
        confirmLabel="Discard"
      />
    </div>
  );
}
