import { useCallback } from "react";
import { Outlet /* , useNavigate */ } from "react-router-dom";
import Sidebar from "../components/sidebar";
// import SessionExpiryModal from "../components/sessionexpirymodal";
import { useAuth } from "../context/authcontext";
// import useIdleTimer from "../hooks/useidletimer";
// import { SESSION_TIMEOUT_MS } from "../utils/constants";

export default function DashboardLayout() {
  const {
    isAuthenticated,
    sessionExpired,
    acknowledgeSessionExpired,
    triggerSessionExpired,
  } = useAuth();

  // const navigate = useNavigate();

  /*
   * ============================================================
   * IDLE TIMER - TEMPORARILY DISABLED
   * ============================================================
   */

  /*
  const handleIdle = useCallback(() => {
    if (isAuthenticated) {
      triggerSessionExpired();
    }
  }, [
    isAuthenticated,
    triggerSessionExpired,
  ]);

  useIdleTimer(
    SESSION_TIMEOUT_MS,
    handleIdle,
    isAuthenticated && !sessionExpired
  );
  */

  /*
   * ============================================================
   * SESSION EXPIRY LOGOUT + REDIRECT - TEMPORARILY DISABLED
   * ============================================================
   */

  /*
  const handleAcknowledge = () => {
    acknowledgeSessionExpired();

    navigate("/login", {
      replace: true,
    });
  };
  */

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="page-main">
        <Outlet />
      </main>

      {/*
        ==========================================================
        SESSION EXPIRY MODAL - TEMPORARILY DISABLED
        ==========================================================

        Keeping the component here for easy re-enabling later.

        <SessionExpiryModal
          open={sessionExpired}
          onAcknowledge={handleAcknowledge}
        />
      */}
    </div>
  );
}