import { Pencil, Plus, Save, Search, ShieldCheck, Trash2, Users as UsersIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../components/confirmdialog";
import Modal from "../components/modal";
import PageHeader from "../components/pageheader";
import { useAuth } from "../context/authcontext";
import { usePermissions } from "../context/permissioncontext";
import { useCreateUser, useDeleteUser, useUpdateUser, useUsersQuery } from "../hooks/queries/useUsers";
import { PAGES, ROLES } from "../utils/constants";

const MOCK_USERS = [
  { _id: "u1", name: "Alicia Roy", email: "alicia@fleet.io", role: "admin", createdAt: "2025-11-02" },
  { _id: "u2", name: "Ben Fedral", email: "ben@fleet.io", role: "staff", createdAt: "2026-01-14" },
  { _id: "u3", name: "Ivan Jackson", email: "ivan@fleet.io", role: "guest", createdAt: "2026-03-22" },
];

const emptyForm = { name: "", email: "", password: "", role: "guest" };

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { permissions, savePermissions } = usePermissions();

  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");

  const { data: fetchedUsers, isLoading: loading, isError: usersError } = useUsersQuery();
  const users = usersError ? MOCK_USERS : fetchedUsers || [];
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [matrix, setMatrix] = useState(permissions);
  const [matrixDirty, setMatrixDirty] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);

  useEffect(() => setMatrix(permissions), [permissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, query]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const onFormChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submitForm = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.email || (!editing && !form.password)) {
      setFormError("Name, email and password are required.");
      return;
    }
    try {
      if (editing) {
        const payload = { id: editing._id, name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await updateUserMutation.mutateAsync(payload);
      } else {
        await createUserMutation.mutateAsync(form);
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

  const toggleMatrix = (role, pageKey) => {
    if (role === "admin") return;
    setMatrix((prev) => {
      const current = new Set(prev[role] || []);
      current.has(pageKey) ? current.delete(pageKey) : current.add(pageKey);
      return { ...prev, [role]: Array.from(current) };
    });
    setMatrixDirty(true);
  };

  const saveMatrix = async () => {
    setSavingMatrix(true);
    await savePermissions(matrix);
    setSavingMatrix(false);
    setMatrixDirty(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="User Management"
        subtitle="Manage accounts and control which pages each role can reach — changes apply instantly, everywhere."
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
          <ShieldCheck size={15} /> Page Access
        </button>
      </div>

      {tab === "users" ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
            <div className="search-box">
              <Search size={16} color="var(--color-muted)" />
              <input placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--color-muted)" }}>
                    Loading users…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--color-muted)" }}>
                    No users match your search.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: "var(--color-muted)" }}>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td style={{ color: "var(--color-muted)" }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
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
      ) : (
        <div className="card" style={{ padding: 22 }}>
          <p style={{ color: "var(--color-muted)", fontSize: 13.5, marginBottom: 18 }}>
            Choose which pages each role can open. Admin always keeps full access. Saving updates the sidebar and
            routes immediately for anyone signed in — in this browser instantly, and on other devices within a few
            seconds.
          </p>

          <table className="access-table">
            <thead>
              <tr>
                <th>Page</th>
                {ROLES.map((r) => (
                  <th key={r} style={{ textAlign: "center", textTransform: "capitalize" }}>
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAGES.map((page) => (
                <tr key={page.key}>
                  <td style={{ fontWeight: 600 }}>{page.label}</td>
                  {ROLES.map((role) => (
                    <td key={role} style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={(matrix[role] || []).includes(page.key)}
                        onChange={() => toggleMatrix(role, page.key)}
                        disabled={role === "admin"}
                        aria-label={`${role} access to ${page.label}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" className="btn btn-primary" onClick={saveMatrix} disabled={!matrixDirty || savingMatrix}>
              <Save size={16} /> {savingMatrix ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      <Modal open={formOpen} onClose={closeForm} title={editing ? "Edit user" : "Add user"} width={440}>
        <form onSubmit={submitForm}>
          {formError && (
            <div style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
              {formError}
            </div>
          )}
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="uName">Full name</label>
            <input id="uName" name="name" value={form.name} onChange={onFormChange} placeholder="Jane Doe" />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="uEmail">Email</label>
            <input id="uEmail" name="email" type="email" value={form.email} onChange={onFormChange} placeholder="jane@company.com" />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label htmlFor="uPassword">{editing ? "New password (optional)" : "Password"}</label>
            <input id="uPassword" name="password" type="password" value={form.password} onChange={onFormChange} placeholder="••••••••" />
          </div>
          <div className="field" style={{ marginBottom: 22 }}>
            <label htmlFor="uRole">Role</label>
            <select id="uRole" name="role" value={form.role} onChange={onFormChange}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
        message={`This will permanently remove ${deleteTarget?.name || "this user"}'s account. This can't be undone.`}
        busy={deleting}
      />
    </div>
  );
}