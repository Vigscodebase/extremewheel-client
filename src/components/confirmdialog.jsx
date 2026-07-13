import { AlertTriangle } from "lucide-react";
import Modal from "./modal";

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Delete", busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <div className="confirm-dialog-body">
        <div className="confirm-dialog-icon">
          <AlertTriangle size={20} />
        </div>
        <p className="confirm-dialog-text">{message}</p>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}