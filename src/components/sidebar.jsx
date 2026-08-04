import { useEffect, useState } from "react";
import {
  Car,
  LayoutDashboard,
  LogOut,
  Scale,
  SlidersHorizontal,
  Users,
  X,
  Circle,
  TrendingUp,
  Search,
  Calculator,
  Wrench,
  FileBarChart
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
  TrendingUp,
  Search,
  Calculator,
  Wrench,
  FileBarChart,
};

const FALLBACK_NAV = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" }, ,
  { key: "tire-calculator", label: "Tire Size Calculator", path: "/tire-calculator", icon: "Calculator" },
  { key: "tire-comparison", label: "Tire Size Comparison", path: "/tire-comparison", icon: "Scale" },
  { key: "tire-options", label: "Tire Size Option", path: "/tire-options", icon: "SlidersHorizontal" },
  { key: "plus-size", label: "Plus Size Options", path: "/plus-size", icon: "TrendingUp" },
  // { key: "application-guide", label: "Application Guide", path: "/application-guide", icon: "Search" },
  { key: "tech-data", label: "Tech Data", path: "/tech-data", icon: "Wrench" },
  { key: "vehicle-notes", label: "Vehicle Notes", path: "/vehicle-notes", icon: "Car" },
  { key: "reports", label: "Reporting & Data Export", path: "/reports", icon: "FileBarChart" },
  { key: "user-management", label: "User Management", path: "/user-management", icon: "Users" }
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
  // Mobile-only off-canvas drawer (320px–767px breakpoint). Independent of
  // the desktop hover-pill's isPinned/isHovered state since the two never
  // render at the same time.
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer whenever the route changes (e.g. a nav item was
  // tapped) and lock page scroll behind it while it's open.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

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
      } catch {
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
    <>
      {/* --- Mobile top bar (320px–767px only; hidden above via CSS) --- */}
      <header className="mobile-topbar">
        <button
          type="button"
          className={`hamburger-btn ${mobileOpen ? "is-open" : ""}`}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
        <img src="/sidebar-logo.png" alt="logo" className="mobile-topbar-logo" />
        <div className="sidebar-avatar mobile-topbar-avatar" title={user?.name || user?.email}>
          {initials}
        </div>
      </header>

      {/* --- Mobile off-canvas drawer + backdrop --- */}
      <div
        className={`mobile-drawer-backdrop ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <nav
        id="mobile-nav-drawer"
        className={`mobile-drawer ${mobileOpen ? "open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-drawer-header">
          <img src="/sidebar-logo.png" alt="logo" />
          <button type="button" className="close-btn mobile-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="mobile-drawer-items">
          {visibleItems.map((item, i) => {
            const Icon = ICONS_MAP[item.icon] || Circle;
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.key}
                type="button"
                className={`mobile-drawer-item ${active ? "active" : ""}`}
                style={{ transitionDelay: mobileOpen ? `${60 + i * 45}ms` : "0ms" }}
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
              >
                <span className="icon-wrapper">
                  <Icon size={20} />
                </span>
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mobile-drawer-footer">
          <button
            type="button"
            className="mobile-drawer-item mobile-logout-btn"
            style={{ transitionDelay: mobileOpen ? `${60 + visibleItems.length * 45}ms` : "0ms" }}
            onClick={handleLogout}
          >
            <span className="icon-wrapper text-danger">
              <LogOut size={20} />
            </span>
            <span className="sidebar-label text-danger">Log out</span>
          </button>
        </div>
      </nav>

      {/* --- Desktop / tablet hover-pill sidebar (768px and up) --- */}
      <aside
        className={`sidebar ${isSidebarExpanded ? "expanded" : ""}${isPinned ? " pinned" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        aria-expanded={isSidebarExpanded}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/sidebar-logo.png" alt="sidebar-logo" />
          </div>
          {isSidebarExpanded && (
            <button className="close-btn" onClick={handleClose} aria-label="Close menu">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
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
    </>
  );
}