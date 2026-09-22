import { ChevronDown, CornerDownLeft, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ADD_NEW = "__add_new__";
const MENU_MAX_HEIGHT = 240;
const MENU_GAP = 6;

/**
 * A dropdown populated from a predefined, dynamically-fetched option list.
 * Used for Make / Model / Type / Year on the Vehicle Notes "Add / Edit
 * vehicle" form and for the Make on the Tire Size Option preset popup, where
 * each is backed by the Vehicle Notes database (see
 * hooks/queries/useVehicleLookup.js) but shouldn't be a hard wall against
 * entering something new.
 *
 * Two opt-in, admin-facing capabilities (the parent decides who gets them —
 * see `user.role === "admin"` in pages/vehiclenotes.jsx and
 * pages/tiresizeoption.jsx; the server enforces the same rule):
 *
 *  - `canAddNew` (default true): shows the "+ Add new…" choice, which swaps
 *    the control to a plain text input so a value that isn't in the list yet
 *    can be typed in. Pass false to hide it — the person can then only pick
 *    from the existing list (a saved value that predates the list is still
 *    shown so it isn't silently blanked).
 *
 *  - `onDeleteOption(value)`: when provided, every option gets a delete
 *    button. Clicking it calls this handler with the option's value — the
 *    parent is responsible for confirming and deleting. Because a native
 *    <select> can't hold buttons, providing this switches the control to a
 *    custom dropdown; without it the control stays a native <select>.
 *
 * The parent owns `value` and is responsible for actually persisting a new
 * value into the predefined list (see the quick-add calls in
 * pages/vehiclenotes.jsx) — this component only handles letting the person
 * type one in and pick or delete existing ones.
 */
export default function EditableSelect({
  label,
  value,
  onChange,
  options,
  loading,
  disabled,
  placeholder = "Select…",
  addNewLabel = "+ Add new…",
  customPlaceholder = "Type a new value",
  canAddNew = true,
  onDeleteOption,
}) {
  const [mode, setMode] = useState("select"); // "select" | "custom"
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const fieldId = useId();

  const list = options || [];
  const hasDelete = typeof onDeleteOption === "function";
  const noOptions = !loading && Boolean(options) && options.length === 0;
  // A saved value that isn't one of the current options (e.g. a vehicle whose
  // Make was deleted from the list since). Anyone who can't add new values
  // still sees it, rather than the field silently going blank.
  const orphan = value && !list.includes(value) ? value : null;
  const placeholderText = noOptions && !canAddNew ? "No options available" : placeholder;
  const nothingToPick = noOptions && !canAddNew && !orphan;

  // If the current value isn't one of the known options (e.g. editing a
  // vehicle whose Make predates the dropdown, or a value just typed in),
  // show it as free text rather than silently reverting to blank. Only for
  // people who can add new values — everyone else keeps the list.
  useEffect(() => {
    if (canAddNew && value && options && options.length > 0 && !options.includes(value)) {
      setMode("custom");
    }
  }, [value, options, canAddNew]);

  // Once loaded, an empty option list has nothing to choose from — go
  // straight to a text input instead of a dropdown whose only real choice
  // is "+ Add new…".
  useEffect(() => {
    if (canAddNew && !loading && options && options.length === 0 && !value) {
      setMode("custom");
    }
  }, [loading, options, canAddNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const menuVisible = hasDelete && mode === "select" && menuOpen && !disabled && !loading && !nothingToPick && Boolean(menuPos);

  // Close the custom menu on an outside click, Escape, resize, or a scroll
  // anywhere except inside the menu itself.
  useEffect(() => {
    if (!menuVisible) return undefined;
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onScrollOrResize = (e) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
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

  // Move focus into the menu when it opens (onto the selected option if any).
  useEffect(() => {
    if (!menuVisible) return;
    const target = menuRef.current?.querySelector('[aria-selected="true"]') || menuRef.current?.querySelector("[data-ds-nav]");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: "nearest" });
  }, [menuVisible]);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    setMenuPos({
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow)),
      ...(openUp ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
    });
    setMenuOpen(true);
  };

  const onTriggerClick = () => (menuOpen ? setMenuOpen(false) : openMenu());

  const onTriggerKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!menuOpen) openMenu();
    }
  };

  const onMenuKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll("[data-ds-nav]") || []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0);
    items[next]?.focus();
  };

  const pickOption = (option) => {
    onChange(option);
    setMenuOpen(false);
    triggerRef.current?.focus();
  };

  const deleteOption = (option) => {
    setMenuOpen(false);
    onDeleteOption(option);
  };

  const startAddNew = () => {
    setMenuOpen(false);
    setMode("custom");
    onChange("");
  };

  const onSelectChange = (e) => {
    const next = e.target.value;
    if (next === ADD_NEW) {
      setMode("custom");
      onChange("");
      return;
    }
    onChange(next);
  };

  const backToList = () => {
    setMode("select");
    onChange("");
  };

  if (mode === "custom") {
    return (
      <div className="field">
        <label>{label}</label>
        <div className="editable-select-custom">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customPlaceholder}
            disabled={disabled}
            autoFocus
          />
          {options && options.length > 0 && (
            <button type="button" className="editable-select-back" onClick={backToList} disabled={disabled} title="Choose from list instead">
              <CornerDownLeft size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Custom dropdown — same look as the native select, but every option can
  // carry its own delete button.
  if (hasDelete) {
    const shownValue = loading ? "Loading…" : value || placeholderText;
    return (
      <div className="field">
        <label htmlFor={fieldId}>{label}</label>
        <button
          type="button"
          id={fieldId}
          ref={triggerRef}
          className={`ds-trigger${menuVisible ? " is-open" : ""}`}
          onClick={onTriggerClick}
          onKeyDown={onTriggerKeyDown}
          disabled={disabled || loading || nothingToPick}
          aria-haspopup="listbox"
          aria-expanded={menuVisible}
        >
          <span className={value && !loading ? "ds-trigger-value" : "ds-trigger-placeholder"}>{shownValue}</span>
          <ChevronDown size={16} className="ds-trigger-chevron" />
        </button>

        {menuVisible &&
          createPortal(
            <div ref={menuRef} className="ds-menu" role="listbox" aria-label={label} style={menuPos} onKeyDown={onMenuKeyDown}>
              {orphan && (
                <div className="ds-option is-selected">
                  <button type="button" role="option" aria-selected="true" data-ds-nav className="ds-option-main" onClick={() => pickOption(orphan)}>
                    {orphan}
                  </button>
                </div>
              )}
              {list.map((option) => (
                <div key={option} className={`ds-option${option === value ? " is-selected" : ""}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option === value}
                    data-ds-nav
                    className="ds-option-main"
                    onClick={() => pickOption(option)}
                  >
                    {option}
                  </button>
                  <button
                    type="button"
                    className="ds-option-delete"
                    onClick={() => deleteOption(option)}
                    title={`Delete ${option}`}
                    aria-label={`Delete ${option}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {list.length === 0 && !orphan && <div className="ds-empty">Nothing here yet</div>}
              {canAddNew && (
                <div className="ds-menu-footer">
                  <button type="button" data-ds-nav className="ds-add-new" onClick={startAddNew}>
                    {addNewLabel}
                  </button>
                </div>
              )}
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <select id={fieldId} value={value || ""} onChange={onSelectChange} disabled={disabled || loading || nothingToPick}>
        <option value="">{loading ? "Loading…" : placeholderText}</option>
        {orphan && <option value={orphan}>{orphan}</option>}
        {list.map((o) => <option key={o} value={o}>{o}</option>)}
        {!loading && canAddNew && <option value={ADD_NEW}>{addNewLabel}</option>}
      </select>
    </div>
  );
}
