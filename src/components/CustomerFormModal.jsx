import { useEffect, useState } from "react";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/queries/useCustomers";
import Modal from "./modal";

const empty = { fullName: "", email: "", phone: "" };

/**
 * Add / edit a customer. `customer` = null adds a new one, otherwise edits
 * that customer (admin only — the parent decides who can open it, and the
 * server enforces it). Email and phone must be unique; the server's message
 * for a clash is shown as-is.
 */
export default function CustomerFormModal({ open, customer, onClose, onSaved }) {
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(customer ? { fullName: customer.fullName, email: customer.email, phone: customer.phone } : empty);
    setError("");
  }, [open, customer]);

  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Full name, email and phone are all required.");
      return;
    }
    try {
      const saved = customer
        ? await updateMutation.mutateAsync({ id: customer._id, ...form })
        : await createMutation.mutateAsync(form);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Edit customer" : "Add customer"} width={440}>
      <form onSubmit={submit}>
        {error && <div className="alert-error">{error}</div>}
        <div className="field field-mb">
          <label>Full name</label>
          <input value={form.fullName} onChange={set("fullName")} placeholder="John Smith" autoFocus />
        </div>
        <div className="field field-mb">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="john@example.com" />
        </div>
        <div className="field field-mb-lg">
          <label>Phone</label>
          <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 555 123 4567" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-accent" disabled={saving}>
            {saving ? "Saving…" : customer ? "Save changes" : "Add customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
