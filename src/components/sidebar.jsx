import { useEffect, useState } from "react";
import {
  Car,
  LayoutDashboard,
  LogOut,
  Scale,
  SlidersHorizontal,
  Users,
  Menu,
  X,
  Circle
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { usePermissions } from "../context/permissioncontext";

const ICONS_MAP = {
  LayoutDashboard,
  Users,
  Scale,
  SlidersHorizontal,
  Car,
};

const FALLBACK_NAV = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
  { key: "user-management", label: "User Management", path: "/user-management", icon: "Users" },
  { key: "tire-comparison", label: "Tire Size Comparison", path: "/tire-comparison", icon: "Scale" },
  { key: "tire-options", label: "Tire Size Option", path: "/tire-options", icon: "SlidersHorizontal" },
  { key: "vehicle-notes", label: "Vehicle Notes", path: "/vehicle-notes", icon: "Car" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isAllowedForCurrentUser } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const [navItems, setNavItems] = useState(FALLBACK_NAV);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [forceClose, setForceClose] = useState(false);

  useEffect(() => {
    const fetchNavigation = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/navigation", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.nav) && data.nav.length > 0) setNavItems(data.nav);
        }
      } catch (error) {
        console.warn("Using fallback navigation.");
      }
    };
    fetchNavigation();
  }, []);

  const visibleItems = navItems.filter((item) => isAllowedForCurrentUser(item.key));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  // --- Hover / pin / close state machine ---
  // isPinned   -> sidebar stays open because the hamburger was clicked
  // isHovered  -> the mouse is currently over the sidebar
  // forceClose -> the X was just clicked; keeps the sidebar closed even
  //               though the mouse hasn't left yet (fixes "close icon not
  //               working" — without this flag, onMouseEnter never re-fires
  //               while the cursor stays inside the pill, so the sidebar
  //               would instantly reopen after clicking X).
  const handleMouseEnter = () => {
    setForceClose(false); // re-arm hover-to-open once the mouse re-enters
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleOpen = (e) => {
    if (e) e.stopPropagation();
    setIsPinned(true);
    setForceClose(false);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setIsPinned(false);
    setForceClose(true); // forces closed despite mouse still hovering
  };

  // Escape closes the sidebar for keyboard users
  const handleKeyDown = (e) => {
    if (e.key === "Escape" && isSidebarExpanded) {
      handleClose(e);
    }
  };

  const isSidebarExpanded = isPinned || (isHovered && !forceClose);

  return (
    <aside
      className={`sidebar ${isSidebarExpanded ? "expanded" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      aria-expanded={isSidebarExpanded}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo">FM</div>
        {isSidebarExpanded && (
          <button className="close-btn" onClick={handleClose} aria-label="Close menu">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {/* Hamburger sits at the top of the nav list when collapsed */}
        {!isSidebarExpanded && (
          <button
            type="button"
            className="sidebar-item hamburger-item"
            onClick={handleOpen}
            aria-label="Open menu"
          >
            <div className="icon-wrapper">
              <Menu size={22} />
            </div>
          </button>
        )}

        {visibleItems.map((item) => {
          const Icon = ICONS_MAP[item.icon] || Circle; // fallback if backend sends an unmapped icon key
          const active = location.pathname.startsWith(item.path);

          return (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${active ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              title={!isSidebarExpanded ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              <div className="icon-wrapper">
                <Icon size={20} />
              </div>
              <span className="sidebar-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar" title={user?.name || user?.email}>
          {initials}
        </div>

        <button type="button" className="sidebar-item logout-btn" onClick={handleLogout} title="Log out">
          <div className="icon-wrapper text-danger">
            <LogOut size={20} />
          </div>
          <span className="sidebar-label text-danger">Log out</span>
        </button>
      </div>
    </aside>
  );
}