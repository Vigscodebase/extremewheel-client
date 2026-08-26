import { CornerDownLeft } from "lucide-react";
import { useEffect, useState } from "react";

const ADD_NEW = "__add_new__";

/**
 * A <select> populated from a predefined, dynamically-fetched option list —
 * with a "+ Add new…" choice that swaps the control to a plain text input so
 * a value that isn't in the list yet can be typed in directly. Used for
 * Make / Model / Type / Year on the Vehicle Notes "Add / Edit vehicle" form,
 * where each of those is backed by the Vehicle Notes database (see
 * hooks/queries/useVehicleLookup.js) but shouldn't be a hard wall against
 * entering something new.
 *
 * The parent owns `value` and is responsible for actually persisting a new
 * value into the predefined list (see the quick-add calls in
 * pages/vehiclenotes.jsx) — this component only handles letting the person
 * type one in.
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
}) {
  const [mode, setMode] = useState("select"); // "select" | "custom"

  // If the current value isn't one of the known options (e.g. editing a
  // vehicle whose Make predates the dropdown, or a value just typed in),
  // show it as free text rather than silently reverting to blank.
  useEffect(() => {
    if (value && options && options.length > 0 && !options.includes(value)) {
      setMode("custom");
    }
  }, [value, options]);

  // Once loaded, an empty option list has nothing to choose from — go
  // straight to a text input instead of a dropdown whose only real choice
  // is "+ Add new…".
  useEffect(() => {
    if (!loading && options && options.length === 0 && !value) {
      setMode("custom");
    }
  }, [loading, options]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="field">
      <label>{label}</label>
      <select value={options && options.includes(value) ? value : ""} onChange={onSelectChange} disabled={disabled || loading}>
        <option value="">{loading ? "Loading…" : placeholder}</option>
        {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        {!loading && <option value={ADD_NEW}>{addNewLabel}</option>}
      </select>
    </div>
  );
}
