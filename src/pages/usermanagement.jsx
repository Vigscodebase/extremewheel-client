import { Eye, EyeOff, Pencil, Plus, Search, ShieldCheck, Trash2, TriangleAlert, Users as UsersIcon } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import FieldError from "../components/FieldError";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import UserPermissionsPanel from "../components/userpermissionspanel";
import { useAuth } from "../context/authcontext";
import { useCreateUser, useDeleteUser, useUpdateUser, useUsersQuery } from "../hooks/queries/useUsers";
import { ROLES } from "../utils/constants";
import { formatUserLabel } from "../utils/permissions";
import { validateEmail, validateFullName, validatePassword } from "../utils/validation";

const MOCK_USERS = [
  { _id: "u1", name: "Alicia Roy", email: "alicia@fleet.io", role: "admin", createdAt: "2025-11-02" },
  { _id: "u2", name: "Ben Fedral", email: "ben@fleet.io", role: "staff", createdAt: "2026-01-14" },
  { _id: "u3", name: "Ivan Jackson", email: "ivan@fleet.io", role: "guest", createdAt: "2026-03-22" },
];

const emptyForm = { name: "", email: "", password: "", role: "guest" };
const EMPTY_USERS = [];

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");

  const { data: fetchedUsers, isLoading: loading, isError: usersError } = useUsersQuery();
  const users = usersError ? MOCK_USERS : fetchedUsers || EMPTY_USERS;
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  // Permissions tab: which user is being edited (defaults to the first non-admin),
  // and a notice shown after an email change wipes someone's permissions.
  const [permUserId, setPermUserId] = useState(null);
  const [resetNotice, setResetNotice] = useState(null);

  const permUsers = fetchedUsers || EMPTY_USERS;
  const defaultPermUserId = (permUsers.find((u) => u.role !== "admin") || permUsers[0])?._id || null;
  const selectedPermUserId = permUsers.some((u) => u._id === permUserId) ? permUserId : defaultPermUserId;

  const openPermissionsFor = (u) => {
    setPermUserId(u._id);
    setTab("access");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, query]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFieldErrors({});
    setShowPassword(false);
    setFormOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setFormError("");
    setFieldErrors({});
    setShowPassword(false);
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const validators = {
    name: (v) => validateFullName(v),
    email: (v) => validateEmail(v),
    password: (v) => validatePassword(v, { required: !editing }),
  };

  // Re-validates a field as the user types, but only once it has shown an error
  // (so a pristine field isn't flagged before the user touches it).
  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (validators[name] && fieldErrors[name] !== undefined) {
      setFieldErrors((errs) => ({ ...errs, [name]: validators[name](value) }));
    }
  };
  const onFieldBlur = (e) => {
    const { name, value } = e.target;
    if (validators[name]) setFieldErrors((errs) => ({ ...errs, [name]: validators[name](value) }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError("");
    const errs = {
      name: validators.name(form.name),
      email: validators.email(form.email),
      password: validators.password(form.password),
    };
    setFieldErrors(errs);
    if (errs.name || errs.email || errs.password) return;
    try {
      if (editing) {
        const payload = { id: editing._id, name: form.name.trim(), email: form.email.trim(), role: form.role };
        if (form.password) payload.password = form.password;
        const updated = await updateUserMutation.mutateAsync(payload);
        // Permissions belong to the email address — if it changed they were wiped.
        setResetNotice(updated?.permissionsReset ? { id: updated._id, label: formatUserLabel(updated) } : null);
      } else {
        await createUserMutation.mutateAsync({ ...form, name: form.name.trim(), email: form.email.trim() });
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const saving = createUserMutation.isPending || updateUserMutation.isPending;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUserMutation.mutateAsync(deleteTarget._id);
    } finally {
      setDeleteTarget(null);
    }
  };

  const deleting = deleteUserMutation.isPending;

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="User Management"
        subtitle="Manage accounts and control what each user can open and do"
        action={
          tab === "users" && (
            <button type="button" className="btn btn-accent" onClick={openAdd}>
              <Plus size={16} /> Add user
            </button>
          )
        }
      />

      <div className="tabbar">
        <button type="button" className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          <UsersIcon size={15} /> Users
        </button>
        <button type="button" className={tab === "access" ? "active" : ""} onClick={() => setTab("access")}>
          <ShieldCheck size={15} /> Permissions
        </button>
      </div>

      {tab === "users" && resetNotice && (
        <div className="speedo-banner warn perm-notice">
          <TriangleAlert size={14} className="icon-inline" />
          <span>
            {resetNotice.label}'s email was changed, so their permissions were reset. Grant access again in the
            Permissions tab.
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setPermUserId(resetNotice.id);
              setTab("access");
              setResetNotice(null);
            }}
          >
            Review permissions
          </button>
        </div>
      )}

      {tab === "users" ? (
        !loading && users.length === 0 ? (
          <div className="card empty-state-block">
            No users yet — add your first one.
          </div>
        ) : (
          <div className="card p-0">
            <div className="panel-head-strip">
              <div className="search-box">
                <Search size={16} color="var(--color-muted)" />
                <input placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>

            <div className="table-responsive">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="text-center p-30 text-muted">
                        Loading users…
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-30 text-muted">
                        No users match your search.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filtered.map((u) => (
                      <tr key={u._id}>
                        <td className="fw-600">{u.name}</td>
                        <td className="text-muted">{u.email}</td>
                        <td>
                          <span className={`badge badge-${u.role}`}>{u.role}</span>
                        </td>
                        <td className="text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                        <td>
                          <div className="flex-row gap-6">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => openPermissionsFor(u)}
                              title="Manage permissions"
                              aria-label={`Manage permissions for ${formatUserLabel(u)}`}
                              disabled={usersError}
                            >
                              <ShieldCheck size={15} />
                            </button>
                            <button type="button" className="icon-btn" onClick={() => openEdit(u)} title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => setDeleteTarget(u)}
                              title="Delete"
                              disabled={u._id === currentUser?._id}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      {/* Kept mounted (just hidden) so unsaved permission edits survive a tab switch. */}
      <div hidden={tab !== "access"}>
        <UserPermissionsPanel
          users={permUsers}
          loading={loading}
          error={usersError}
          selectedId={selectedPermUserId}
          onSelect={setPermUserId}
        />
      </div>

      <Modal open={formOpen} onClose={closeForm} title={editing ? "Edit user" : "Add user"} width={440}>
        <form onSubmit={submitForm} noValidate>
          {formError && (
            <div className="alert-error">
              {formError}
            </div>
          )}
          <div className="field mb-14">
            <label htmlFor="uName">Full name</label>
            <input
              id="uName"
              name="name"
              value={form.name}
              onChange={onFormChange}
              onBlur={onFieldBlur}
              placeholder="Jane Doe"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "uNameError" : undefined}
            />
            <FieldError id="uNameError" message={fieldErrors.name} />
          </div>
          <div className="field mb-14">
            <label htmlFor="uEmail">Email</label>
            <input
              id="uEmail"
              name="email"
              type="email"
              value={form.email}
              onChange={onFormChange}
              onBlur={onFieldBlur}
              placeholder="jane@company.com"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "uEmailError" : undefined}
            />
            <FieldError id="uEmailError" message={fieldErrors.email} />
            {editing && form.email.trim().toLowerCase() !== (editing.email || "").toLowerCase() && (
              <p className="field-hint warn-text">
                Changing the email resets this user's permissions — you'll need to grant them again.
              </p>
            )}
          </div>
          <div className="field mb-14">
            <label htmlFor="uPassword">{editing ? "New password (optional)" : "Password"}</label>
            <div style={{ position: "relative" }}>
              <input
                id="uPassword"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={onFormChange}
                onBlur={onFieldBlur}
                aria-invalid={!!fieldErrors.password}
                placeholder="••••••••"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Toggle password visibility"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-muted)",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <FieldError message={fieldErrors.password} />
            <PasswordStrengthMeter password={form.password} />
          </div>
          <div className="field field-mb-lg">
            <label htmlFor="uRole">Role</label>
            <select id="uRole" name="role" value={form.role} onChange={onFormChange}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <p className="field-hint">
              Admin has full access. For Staff and Guest, what they can open and do is set per user in the Permissions tab.
            </p>
          </div>
          <div className="flex-end gap-10">
            <button type="button" className="btn btn-ghost" onClick={closeForm}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add user"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete user"
        message={`This will permanently remove ${deleteTarget ? formatUserLabel(deleteTarget) : "this user"}'s account and its permissions. This can't be undone.`}
        busy={deleting}
      />
    </div>
  );
}