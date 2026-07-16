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
      // <-- 3. Add sessionExpired to partialize so it persists across refreshes
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        sessionExpired: state.sessionExpired
      }),
    }
  )
);

export default useAuthStore;