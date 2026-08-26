import { useEffect, useState, useRef } from "react";
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
  FileBarChart,
  ChevronDown
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";
import { usePermissions } from "../context/permissioncontext";
import axios from "../utils/axiosInstance";

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
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
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
  const sidebarRef = useRef(null);
  const profileRef = useRef(null);

  // Mobile-only off-canvas drawer (320px–767px breakpoint).
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mobile profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);

  // Close the drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false); // also close profile dropdown on navigation
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const fetchNavigation = async () => {
      try {
        // BUGFIX: this used to be a raw `fetch("/navigation", ...)` reading
        // `localStorage.getItem("token")` directly — but the token isn't
        // stored under a plain "token" key; it lives inside zustand's
        // persisted "auth-storage" blob (state.token), and the raw fetch
        // also skipped axios's baseURL ("/api"). So this request always
        // went out as `Authorization: Bearer null` to the wrong path,
        // silently 401'd/404'd, and every user permanently got FALLBACK_NAV
        // instead of the server-driven nav — never visible as a "session
        // expired" error since a bare fetch bypasses axios's interceptors
        // entirely. Using the shared axios instance fixes both: correct
        // baseURL, and the real Bearer token attached automatically.
        const { data } = await axios.get("/navigation");
        if (Array.isArray(data.nav) && data.nav.length > 0) setNavItems(data.nav);
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

  useEffect(() => {
    const handleOutsideTap = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsHovered(false);
        setIsPinned(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("touchstart", handleOutsideTap);
    document.addEventListener("mousedown", handleOutsideTap);
    return () => {
      document.removeEventListener("touchstart", handleOutsideTap);
      document.removeEventListener("mousedown", handleOutsideTap);
    };
  }, []);

  const handleMouseEnter = () => {
    setForceClose(false);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setIsPinned(false);
    setForceClose(true);
  };

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
        <img src="/login-logo.webp" alt="logo" className="mobile-topbar-logo" />

        {/* Profile Dropdown Container */}
        <div className="mobile-profile-container" ref={profileRef}>
          <button
            type="button"
            className={`sidebar-avatar mobile-topbar-avatar ${profileOpen ? "is-open" : ""}`}
            title={user?.name || user?.email}
            onClick={() => setProfileOpen((prev) => !prev)}
          >
            {initials}

            {/* --- NEW UX ARROW BADGE --- */}
            <span className="mobile-avatar-indicator">
              <ChevronDown size={11} strokeWidth={3.5} />
            </span>
          </button>

          {profileOpen && (
            <div className="mobile-profile-dropdown">
              <button
                type="button"
                className="mobile-profile-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
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
        ref={sidebarRef}
        className={`sidebar ${isSidebarExpanded ? "expanded" : ""}${isPinned ? " pinned" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseEnter}
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
            const Icon = ICONS_MAP[item.icon] || Circle;
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