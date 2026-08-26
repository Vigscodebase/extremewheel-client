import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      sessionExpired: false, // <-- 1. Add this property

      // Reset sessionExpired on a new login
      setSession: (token, user) => set({ token, user, sessionExpired: false }),

      updateUser: (partial) =>
        set((state) => ({ user: state.user ? { ...state.user, ...partial } : state.user })),

      setToken: (token) => set({ token }),

      // Wipes the session and clears the expired flag
      clearSession: () => set({ token: null, user: null, sessionExpired: false }),

      // <-- 2. Add an action to trigger the expiration flag
      setSessionExpired: (status) => set({ sessionExpired: status }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // sessionExpired is intentionally left out of partialize: it's
      // transient "show the modal right now" UI state, not something that
      // should survive a reload. Persisting it meant a stale value written
      // just before a refresh/close (or written in another tab) could sit
      // in localStorage and drive this tab's modal on the next load, with
      // no interaction — typing, clicking, scrolling — able to clear it,
      // since the idle timer that's normally responsible for resetting
      // activity is itself disabled while sessionExpired is true. On every
      // fresh load this should always start false and be derived live from
      // real auth checks (idle timeout / an actual 401), never rehydrated.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;