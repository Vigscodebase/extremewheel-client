import { Navigate, Route, Routes, BrowserRouter, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/authcontext";
import { PermissionProvider } from "./context/permissioncontext";

import DashboardLayout from "./layouts/dashboardlayout";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import NotAuthorized from "./pages/notauthorized";
import Register from "./pages/register";
import TireSizeComparison from "./pages/tiresizecomparison";
import TireSizeOption from "./pages/tiresizeoption";
import UserManagement from "./pages/usermanagement";
import VehicleNotes from "./pages/vehiclenotes";
import ProtectedRoute from "./routes/protectedroute";

// 1. Create a Layout Route specifically for Permissions
// This ensures PermissionProvider only mounts for the nested routes below it.
const PermissionLayout = () => {
  return (
    <PermissionProvider>
      <Outlet />
    </PermissionProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* =========================================
              PUBLIC ROUTES 
              PermissionProvider is completely bypassed here 
              ========================================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* =========================================
              PRIVATE ROUTES 
              Wrapped in PermissionLayout so permissions are only fetched here
              ========================================= */}
          <Route element={<PermissionLayout />}>
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>

                {/* Authenticated but lacks specific page permission */}
                <Route path="/not-authorized" element={<NotAuthorized />} />

                {/* Page-Specific Permission Routes */}
                <Route element={<ProtectedRoute pageKey="dashboard" />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>

                <Route element={<ProtectedRoute pageKey="user-management" />}>
                  <Route path="/user-management" element={<UserManagement />} />
                </Route>

                <Route element={<ProtectedRoute pageKey="tire-comparison" />}>
                  <Route path="/tire-comparison" element={<TireSizeComparison />} />
                </Route>

                <Route element={<ProtectedRoute pageKey="tire-options" />}>
                  <Route path="/tire-options" element={<TireSizeOption />} />
                </Route>

                <Route element={<ProtectedRoute pageKey="vehicle-notes" />}>
                  <Route path="/vehicle-notes" element={<VehicleNotes />} />
                </Route>

              </Route>
            </Route>
          </Route>

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}