import { useEffect, useState } from "react";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/queries/useCustomers";
import { validateEmail, validateFullName, validatePhone } from "../utils/validation";
import FieldError from "./FieldError";
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
  const [fieldErrors, setFieldErrors] = useState({});
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(customer ? { fullName: customer.fullName, email: customer.email, phone: customer.phone } : empty);
    setError("");
    setFieldErrors({});
  }, [open, customer]);

  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    const errs = {
      fullName: validators.fullName(form.fullName),
      email: validators.email(form.email),
      phone: validators.phone(form.phone),
    };
    setFieldErrors(errs);
    if (errs.fullName || errs.email || errs.phone) return;
    const payload = { fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim() };
    try {
      const saved = customer
        ? await updateMutation.mutateAsync({ id: customer._id, ...payload })
        : await createMutation.mutateAsync(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const validators = {
    fullName: validateFullName,
    email: validateEmail,
    phone: (v) => validatePhone(v, { required: true }),
  };

  // Re-validate live once a field has been checked (on blur or failed submit).
  const set = (key) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key] !== undefined) setFieldErrors((errs) => ({ ...errs, [key]: validators[key](value) }));
  };
  const blur = (key) => (e) => setFieldErrors((errs) => ({ ...errs, [key]: validators[key](e.target.value) }));

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Edit customer" : "Add customer"} width={440}>
      <form onSubmit={submit} noValidate>
        {error && <div className="alert-error">{error}</div>}
        <div className="field field-mb">
          <label>Full name</label>
          <input
            value={form.fullName}
            onChange={set("fullName")}
            onBlur={blur("fullName")}
            placeholder="John Smith"
            aria-invalid={!!fieldErrors.fullName}
            autoFocus
          />
          <FieldError message={fieldErrors.fullName} />
        </div>
        <div className="field field-mb">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            onBlur={blur("email")}
            placeholder="john@example.com"
            aria-invalid={!!fieldErrors.email}
          />
          <FieldError message={fieldErrors.email} />
        </div>
        <div className="field field-mb-lg">
          <label>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            onBlur={blur("phone")}
            placeholder="+1 555 123 4567"
            aria-invalid={!!fieldErrors.phone}
          />
          <FieldError message={fieldErrors.phone} />
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
