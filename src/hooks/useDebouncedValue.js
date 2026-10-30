import { useEffect, useState } from "react";

// Returns `value` after it has stopped changing for `delay` ms. Used so a search
// box fires one request when the person pauses typing, not one per keystroke.
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
