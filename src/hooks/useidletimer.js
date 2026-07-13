import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "wheel", "keydown", "touchstart", "scroll"];

/**
 * Fires `onIdle` after `timeoutMs` of no user activity. Any listed activity
 * event resets the clock. Pass `active=false` to pause it entirely (e.g.
 * while logged out, or while the "session expired" modal is already open).
 * Mouse-move events are throttled so the timer reset itself is cheap.
 */
export default function useIdleTimer(timeoutMs, onIdle, active = true) {
  const timerRef = useRef(null);
  const lastResetRef = useRef(0);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const reset = () => {
      const now = Date.now();
      // Throttle: mousemove/scroll can fire dozens of times a second.
      if (now - lastResetRef.current < 300) return;
      lastResetRef.current = now;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onIdle, timeoutMs);
    };

    reset();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMs, onIdle, active]);
}
