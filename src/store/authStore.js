import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Single source of truth for the current session. Anything outside React
// (like the axios interceptor) can read/write this via `useAuthStore.getState()`
// without needing Context, and every component that calls the hook re-renders
// automatically when the token or user changes.
const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      // Called after a successful login/register.
      setSession: (token, user) => set({ token, user }),

      // Applies a partial user patch (e.g. after editing your own profile).
      updateUser: (partial) =>
        set((state) => ({ user: state.user ? { ...state.user, ...partial } : state.user })),

      // Swaps in a rolling-renewed token without touching the user object.
      setToken: (token) => set({ token }),

      // Wipes the session locally (does not call the server).
      clearSession: () => set({ token: null, user: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

export default useAuthStore;
