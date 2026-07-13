import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Deliberately does NOT close on backdrop click or Escape — per spec, the
 * only way out is the X icon or a Cancel/Close button inside the body.
 */
export default function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-box"
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h3 id="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}