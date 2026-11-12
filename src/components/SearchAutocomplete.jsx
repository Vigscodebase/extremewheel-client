import { Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const KIND_LABEL = {
  vehicle: "Vehicle",
  "make-model": "Make / model",
  make: "Make",
  model: "Model",
  year: "Year",
  submodel: "Submodel",
  customer: "Customer",
  size: "Tire size",
  // preset: "Preset", // hidden: Tire Size Option presets are switched off
  name: "Name",
  email: "Email",
};

// Bold the part of each word the person has already typed (the server matches
// word prefixes, so that is exactly what made the suggestion match).
function Highlight({ text, query }) {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return text.split(/([\p{L}\p{N}]+)/u).map((part, i) => {
    const lower = part.toLowerCase();
    const hit = words.filter((w) => lower.startsWith(w)).sort((a, b) => b.length - a.length)[0];
    return hit ? (
      <span key={i}>
        <strong>{part.slice(0, hit.length)}</strong>
        {part.slice(hit.length)}
      </span>
    ) : (
      part
    );
  });
}

/**
 * Search box with type-ahead suggestions (ARIA combobox: ↑ ↓ Enter Esc, click).
 *
 * Fully controlled: the page owns `value`, debounces it, and feeds the
 * resulting `suggestions` back in. `onChange(text, picked)` — `picked` is true
 * when the text came from clicking / pressing Enter on a suggestion, so the
 * page can search for exactly that ("Customer Name 2" must not also return
 * "Customer Name 20"); typing calls it with `picked` false. A third argument,
 * the clicked suggestion ({ text, kind }), lets the page tell WHAT was picked
 * (a vehicle, a make, a customer …); pages that don't need it ignore it.
 */
export default function SearchAutocomplete({
  value,
  onChange,
  suggestions = [],
  loading = false,
  placeholder,
  ariaLabel,
  className = "search-box vehicle-search",
  minChars = 2,
}) {
  const listId = useId();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const showList = open && value.trim().length >= minChars && suggestions.length > 0;

  // Close when focus / a click lands elsewhere.
  useEffect(() => {
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (s) => {
    onChange(s.text, true, s); // 2nd argument: picked from the list (search for exactly this); 3rd: which suggestion
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (showList && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
      else setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className={`${className} autocomplete`} ref={wrapRef}>
      <Search size={16} color="var(--color-muted)" />
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {loading && <Loader2 size={15} className="autocomplete-spinner" aria-hidden="true" />}
      {value && (
        <button type="button" className="autocomplete-clear" onClick={() => { onChange(""); setOpen(false); }} aria-label="Clear search">
          <X size={14} />
        </button>
      )}
      {showList && (
        <ul className="autocomplete-list" id={listId} role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={`${s.kind}:${s.text}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }} // before the input loses focus
              onMouseEnter={() => setActive(i)}
            >
              <span className="autocomplete-text"><Highlight text={s.text} query={value} /></span>
              <span className="autocomplete-kind">{KIND_LABEL[s.kind] || s.kind}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
