import { Navigate, Route, Routes, BrowserRouter } from "react-router-dom";
// 1. Import the AuthProvider (adjust the path if your folder structure is different)
import { AuthProvider } from "./context/authcontext";
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

export default function App() {
  return (
    // 2. Wrap the entire routing tree with AuthProvider
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/not-authorized" element={<NotAuthorized />} />

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

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}