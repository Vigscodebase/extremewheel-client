import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { usePermissions } from "../context/permissioncontext";

/**
 * Guards a route by auth state and, optionally, by a specific page-access
 * key. Because it reads live from PermissionContext (which is kept in sync
 * across tabs/devices), a page that gets revoked out from under a user
 * mid-session redirects them away on the very next render — no refresh
 * needed.
 */
export default function ProtectedRoute({ pageKey }) {
  const { isAuthenticated, initializing } = useAuth();
  const { isAllowedForCurrentUser, loading } = usePermissions();
  const location = useLocation();

  if (initializing || loading) {
    return (
      <div className="full-page-loader">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (pageKey && !isAllowedForCurrentUser(pageKey)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
}