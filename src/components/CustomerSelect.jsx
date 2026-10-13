import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MENU_MAX_HEIGHT = 260;
const MENU_GAP = 6;

export const customerLabel = (c) => `${c.fullName} (${c.email})`;

/**
 * Prefetched customer dropdown — every option reads "Full name (email)".
 * Uses the same custom dropdown look as EditableSelect (ds-* classes), with a
 * type-to-filter box since the list can get long.
 *
 *  - `onAdd`    shows "+ Add new customer…" (staff and admin)
 *  - `onEdit`   shows a pencil on each option (admin only)
 *  - `onDelete` shows a trash on each option (admin only)
 *
 * The parent owns the value (a customer _id) and the add/edit/delete dialogs;
 * this component only picks. Picking the same customer again keeps it; the
 * "No customer" choice at the top clears it.
 */
export default function CustomerSelect({ label = "Customer", value, customers, loading, disabled, onChange, onAdd, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [query, setQuery] = useState("");
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const fieldId = useId();

  const list = customers || [];
  const selected = list.find((c) => c._id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => customerLabel(c).toLowerCase().includes(q) || c.phone.includes(q));
  }, [list, query]);

  const menuVisible = menuOpen && !disabled && !loading && Boolean(menuPos);

  const close = () => {
    setMenuOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!menuVisible) return undefined;
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const onScrollOrResize = (e) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuVisible]);

  useEffect(() => {
    if (menuVisible) searchRef.current?.focus({ preventScroll: true });
  }, [menuVisible]);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    setMenuPos({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(160, Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow)),
      ...(openUp ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
    });
    setMenuOpen(true);
  };

  const onMenuKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [searchRef.current, ...Array.from(menuRef.current?.querySelectorAll("[data-ds-nav]") || [])].filter(Boolean);
    const current = items.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0);
    items[next]?.focus();
  };

  const pick = (id) => {
    onChange(id);
    close();
    triggerRef.current?.focus();
  };

  const act = (fn, arg) => {
    close();
    fn(arg);
  };

  const shown = loading ? "Loading…" : selected ? customerLabel(selected) : value ? "Unknown customer" : "Select customer";

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <button
        type="button"
        id={fieldId}
        ref={triggerRef}
        className={`ds-trigger${menuVisible ? " is-open" : ""}`}
        onClick={() => (menuOpen ? close() : openMenu())}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !menuOpen) {
            e.preventDefault();
            openMenu();
          }
        }}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={menuVisible}
      >
        <span className={selected && !loading ? "ds-trigger-value" : "ds-trigger-placeholder"}>{shown}</span>
        <ChevronDown size={16} className="ds-trigger-chevron" />
      </button>

      {menuVisible &&
        createPortal(
          <div ref={menuRef} className="ds-menu" role="listbox" aria-label={label} style={menuPos} onKeyDown={onMenuKeyDown}>
            <input
              ref={searchRef}
              className="ds-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customers…"
              aria-label="Search customers"
            />
            {value && (
              <div className="ds-option">
                <button type="button" data-ds-nav className="ds-option-main ds-option-none" onClick={() => pick("")}>
                  No customer
                </button>
              </div>
            )}
            {filtered.map((c) => (
              <div key={c._id} className={`ds-option${c._id === value ? " is-selected" : ""}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c._id === value}
                  data-ds-nav
                  className="ds-option-main"
                  onClick={() => pick(c._id)}
                  title={customerLabel(c)}
                >
                  {customerLabel(c)}
                </button>
                {onEdit && (
                  <button type="button" className="ds-option-edit" onClick={() => act(onEdit, c)} title={`Edit ${c.fullName}`} aria-label={`Edit ${c.fullName}`}>
                    <Pencil size={13} />
                  </button>
                )}
                {onDelete && (
                  <button type="button" className="ds-option-delete" onClick={() => act(onDelete, c)} title={`Delete ${c.fullName}`} aria-label={`Delete ${c.fullName}`}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="ds-empty">{list.length === 0 ? "No customers yet" : "No customers match your search"}</div>
            )}
            {onAdd && (
              <div className="ds-menu-footer">
                <button type="button" data-ds-nav className="ds-add-new" onClick={() => act(onAdd)}>
                  + Add new customer…
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
