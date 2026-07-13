import { ShieldAlert } from "lucide-react";
import { createPortal } from "react-dom";

export default function SessionExpiryModal({ open, onAcknowledge }) {
  if (!open) return null;

  return createPortal(
    <div className="session-backdrop">
      <div className="session-box" role="alertdialog" aria-modal="true" aria-labelledby="session-title">
        <div className="session-icon">
          <ShieldAlert size={26} />
        </div>
        <h3 id="session-title">Session expired</h3>
        <p>You've been signed out after 7.5 minutes of inactivity to keep your account secure.</p>
        <button type="button" className="btn btn-primary btn-full" onClick={onAcknowledge}>
          Okay
        </button>
      </div>
    </div>,
    document.body
  );
}