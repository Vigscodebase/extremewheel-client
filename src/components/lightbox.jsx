import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";

// Simple full-screen image preview with keyboard (Esc / arrow key) support.
// `images` is an array of { src, label }; `index` is the currently shown one.
export default function Lightbox({ images, index, onClose, onIndexChange }) {
  const open = index !== null && index !== undefined && images?.length > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, images, onClose, onIndexChange]);

  if (!open) return null;
  const current = images[index];

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} title="Close">
        <X size={20} />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-prev"
          onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + images.length) % images.length); }}
          title="Previous"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img src={current.src} alt={current.label || "preview"} />
        {current.label && <p className="lightbox-caption">{current.label}</p>}
        {images.length > 1 && (
          <p className="lightbox-counter">{index + 1} / {images.length}</p>
        )}
      </div>

      {images.length > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-next"
          onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % images.length); }}
          title="Next"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
