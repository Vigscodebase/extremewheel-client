import { AlertCircle } from "lucide-react";
import Modal from "./modal";

export default function ErrorModal({ open, onClose, message }) {
  return (
    <Modal open={open} onClose={onClose} title="Something went wrong" width={400}>
      <div className="confirm-dialog-body">
        <div className="error-modal-icon">
          <AlertCircle size={26} />
        </div>
        <p className="error-modal-text">
          {message}
        </p>
      </div>
      <div className="error-modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Okay
        </button>
      </div>
    </Modal>
  );
}