import { Car, LayoutDashboard, LogOut, Scale, SlidersHorizontal, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { usePermissions } from "../context/permissioncontext";

const ICONS = {
  dashboard: LayoutDashboard,
  "user-management": Users,
  "tire-comparison": Scale,
  "tire-options": SlidersHorizontal,
  "vehicle-notes": Car,
};

const NAV = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },
  { key: "user-management", label: "User Management", path: "/user-management" },
  { key: "tire-comparison", label: "Tire Size Comparison", path: "/tire-comparison" },
  { key: "tire-options", label: "Tire Size Option", path: "/tire-options" },
  { key: "vehicle-notes", label: "Vehicle Notes", path: "/vehicle-notes" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isAllowedForCurrentUser } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleItems = NAV.filter((item) => isAllowedForCurrentUser(item.key));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">FM</div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const Icon = ICONS[item.key];
          const active = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${active ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              title={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} />
              <span className="sidebar-tooltip">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar" title={user?.name || user?.email}>
          {initials}
        </div>
        <button type="button" className="sidebar-item" onClick={handleLogout} title="Log out">
          <LogOut size={19} />
          <span className="sidebar-tooltip">Log out</span>
        </button>
      </div>
    </aside>
  );
}