import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { usePermissions } from "../context/permissioncontext";
import { firstAllowedPath } from "../utils/permissions";

/**
 * Guards a route by auth state and, optionally, by a specific page-access
 * key. Because it reads live from PermissionContext (which refetches when the
 * user returns to the tab, and syncs across tabs in the same browser), a page
 * that gets revoked out from under a user mid-session redirects them away on
 * the next render — no refresh needed.
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
    // The Dashboard is where everyone lands by default (login, "/", unknown
    // URLs). Access is per user, so plenty of people won't have it — send them
    // to the first page they do have instead of a dead end.
    const landing = pageKey === "dashboard" ? firstAllowedPath(isAllowedForCurrentUser, { exclude: "dashboard" }) : null;
    return <Navigate to={landing || "/not-authorized"} replace />;
  }

  return <Outlet />;
}