import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "wheel", "keydown", "touchstart", "scroll"];

export default function useIdleTimer(timeoutMs, onIdle, active = true) {
  const timerRef = useRef(null);
  const lastResetRef = useRef(0);

  // Persist the callback in a ref so inline functions don't trigger rapid re-mounts
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const reset = () => {
      const now = Date.now();

      // Only apply the 300ms throttle if a timer is currently active.
      // If timerRef is null (e.g. initial mount), we MUST bypass the throttle.
      if (timerRef.current && (now - lastResetRef.current < 300)) {
        return;
      }

      lastResetRef.current = now;
      localStorage.setItem("lastActivity", now.toString());

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onIdleRef.current?.();
      }, timeoutMs);
    };

    reset();

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null; // Important: Clear the ref so the next mount resets cleanly
    };
  }, [timeoutMs, active]);
}