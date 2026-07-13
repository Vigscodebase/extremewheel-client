import { useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/sidebar";
import SessionExpiryModal from "../components/sessionexpirymodal";
import { useAuth } from "../context/authcontext";
import useIdleTimer from "../hooks/useidletimer";
import { SESSION_TIMEOUT_MS } from "../utils/constants";

export default function DashboardLayout() {
  const { isAuthenticated, sessionExpired, acknowledgeSessionExpired, triggerSessionExpired } = useAuth();
  const navigate = useNavigate();

  const handleIdle = useCallback(() => {
    // Flips AuthContext into "expired" state; actual navigation happens once
    // the user acknowledges the modal below, same as a real banking app.
    if (isAuthenticated) {
      triggerSessionExpired();
    }
  }, [isAuthenticated, triggerSessionExpired]);

  useIdleTimer(SESSION_TIMEOUT_MS, handleIdle, isAuthenticated && !sessionExpired);

  const handleAcknowledge = () => {
    acknowledgeSessionExpired();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="page-main">
        <Outlet />
      </main>
      <SessionExpiryModal open={sessionExpired} onAcknowledge={handleAcknowledge} />
    </div>
  );
}