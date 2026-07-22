import {
  Activity,
  AlertTriangle,
  Car,
  CheckCircle2,
  ChevronRight,
  FileBarChart,
  Gauge,
  MessageCircle,
  Scale,
  Search,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AreaLineChart from "../components/charts/areaLinechart";
import DonutChart from "../components/charts/donutchart";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import { useAuth } from "../context/authcontext";
import { useDashboardSummary } from "../hooks/queries/useDashboard";

const RANGES = ["W", "M", "Y"];

const FALLBACK = {
  totalUsers: 18,
  totalVehicles: 34,
  tirePresets: 12,
  activeSessions: 6,
  activity: [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 19 },
    { label: "Wed", value: 14 },
    { label: "Thu", value: 26 },
    { label: "Fri", value: 22 },
    { label: "Sat", value: 9 },
    { label: "Sun", value: 15 },
  ],
  usersByRole: { admin: 2, staff: 7, guest: 9 },
  recentVehicles: [
    { name: "Ford Transit 350", type: "Cargo Van", model: "2023" },
    { name: "Toyota Hilux", type: "Pickup Truck", model: "2022" },
    { name: "Tata Ace", type: "Mini Truck", model: "2021" },
  ],
  fleetAlerts: [
    {
      id: "a1",
      tone: "pink",
      date: "12 Jul",
      status: "Urgent",
      title: "Tire pressure critical",
      subtitle: "Unit FT-204 · sensor flagged front-left tire",
    },
    {
      id: "a2",
      tone: "amber",
      date: "14 Jul",
      status: "Needs analysis",
      title: "Service overdue",
      subtitle: "Unit TR-118 · oil change & brake check",
    },
    {
      id: "a3",
      tone: "mint",
      date: "09 Jul",
      status: "Completed",
      title: "Inspection passed",
      subtitle: "Unit VN-330 · annual safety audit",
    },
  ],
  scheduleDays: [
    { day: "11", label: "Mon" },
    { day: "12", label: "Tue" },
    { day: "13", label: "Wed" },
    { day: "14", label: "Thu" },
    { day: "15", label: "Fri" },
    { day: "16", label: "Sat" },
    { day: "17", label: "Sun" },
  ],
  scheduleByDay: {
    11: [{ time: "09:30 AM", task: "Brake inspection", meta: "Ford Transit 350 · A. Fedral" }],
    13: [
      { time: "09:30 AM", task: "Brake inspection", meta: "Ford Transit 350 · A. Fedral" },
      { time: "01:00 PM", task: "Tire rotation", meta: "Toyota Hilux · B. Grille" },
    ],
    15: [{ time: "11:15 AM", task: "Fluid top-up", meta: "Tata Ace · J. Grille" }],
  },
  fleetUtilization: { active: 27 },
  teamContacts: [
    { name: "Segil Grille", role: "Fleet Manager", online: true },
    { name: "Jhony Grille", role: "Lead Mechanic", online: true },
    { name: "Benjamin Fedral", role: "Inspector", online: false },
  ],
  recentTireComparisons: [
    { _id: "c1", summary: "225/65R17 vs 265/70R17", data: { diffPct: 3.4 }, createdAt: new Date().toISOString() },
    { _id: "c2", summary: "215/60R16 vs 225/60R17", data: { diffPct: 1.1 }, createdAt: new Date().toISOString() },
  ],
  recentVehicleSearches: [
    { _id: "s1", summary: "2023 Ford Transit 350 — Cargo Van", createdAt: new Date().toISOString() },
    { _id: "s2", summary: "2022 Toyota Hilux — Pickup Truck", createdAt: new Date().toISOString() },
  ],
  reportsSummary: { totalActivity: 42, last7Days: 9 },
};

function KpiCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="card kpi-card">
      <div className="kpi-icon" style={{ background: tint.soft, color: tint.solid }}>
        <Icon size={19} />
      </div>
      <div>
        <p className="kpi-value">{value}</p>
        <p className="kpi-label">{label}</p>
      </div>
    </div>
  );
}

const ALERT_ICONS = { pink: AlertTriangle, amber: Wrench, mint: CheckCircle2 };

function AlertPill({ tone, date, status, title, subtitle }) {
  const Icon = ALERT_ICONS[tone] || AlertTriangle;
  return (
    <div className={`alert-pill alert-pill-${tone}`}>
      <div className="alert-pill-top">
        <span className="alert-pill-date">{date}</span>
        <span className="alert-pill-status">
          <Icon size={11} />
          {status}
        </span>
      </div>
      <p className="alert-pill-title">{title}</p>
      <p className="alert-pill-subtitle">{subtitle}</p>
    </div>
  );
}

function GoalRing({ value, goal, size = 128, thickness = 13, color = "#FF6F91" }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Fleet utilization">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F1F1F5" strokeWidth={thickness} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" className="goal-ring-value">
        {value}
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="goal-ring-total">
        of {goal}
      </text>
    </svg>
  );
}

function ContactRow({ name, role, online }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="contact-row">
      <div className="contact-avatar">
        {initials}
        <span className={`status-dot ${online ? "online" : "offline"}`} />
      </div>
      <div className="contact-info">
        <p className="contact-name">{name}</p>
        <p className="contact-role">{role}</p>
      </div>
      <button type="button" className="icon-btn" title={`Message ${name}`}>
        <MessageCircle size={15} />
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data } = useDashboardSummary();
  const [range, setRange] = useState("W");
  const [selectedDay, setSelectedDay] = useState(FALLBACK.scheduleDays[2]?.day);

  // Merge live data over the demo fallback so the layout never looks empty
  // while the first request is in flight or if the endpoint errors out.
  const stats = useMemo(() => ({ ...FALLBACK, ...(data || {}) }), [data]);

  const showroomTire = useMemo(() => {
    const latest = stats.recentTireComparisons?.[0]?.data?.tireB || stats.recentTireComparisons?.[0]?.data?.tireA;
    return latest?.width && latest?.rim ? latest : { width: 265, aspect: 70, rim: 17 };
  }, [stats.recentTireComparisons]);

  const donutData = [
    { label: "Admin", value: stats.usersByRole.admin, color: "#8B7CF6" },
    { label: "Staff", value: stats.usersByRole.staff, color: "#4FCFB6" },
    { label: "Guest", value: stats.usersByRole.guest, color: "#FFB258" },
  ];

  const rangeCopy = useMemo(
    () => ({ W: "This week", M: "This month", Y: "This year" }[range] || "This week"),
    [range]
  );

  const daySchedule = stats.scheduleByDay[selectedDay] || [];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        subtitle="Here's what's happening across your fleet today."
      />

      <div className="kpi-grid">
        <KpiCard icon={Users} label="Total users" value={stats.totalUsers} tint={{ soft: "var(--color-violet-soft)", solid: "var(--color-violet)" }} />
        <KpiCard icon={Car} label="Vehicles tracked" value={stats.totalVehicles} tint={{ soft: "var(--color-mint-soft)", solid: "#22997F" }} />
        <KpiCard icon={Gauge} label="Tire presets" value={stats.tirePresets} tint={{ soft: "var(--color-amber-soft)", solid: "#C97A22" }} />
        <KpiCard icon={ShieldCheck} label="Active sessions" value={stats.activeSessions} tint={{ soft: "var(--color-pink-soft)", solid: "var(--color-pink)" }} />
      </div>

      <div className="card dash-panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <h3>Tire showroom</h3>
            <p>Live 3D preview of your most recently compared size</p>
          </div>
          <Link to="/tire-calculator" className="see-all-link">
            Open calculator <ChevronRight size={14} />
          </Link>
        </div>
        <Tire3DVisualizer
          tire={showroomTire}
          label={`${showroomTire.width}/${showroomTire.aspect}R${showroomTire.rim}`}
          accent="#FF6F91"
          height={260}
        />
      </div>

      <div className="section-title-row">
        <div>
          <h3>Fleet alerts</h3>
          <p>Items that need a look this week</p>
        </div>
        <a href="#" className="see-all-link" onClick={(e) => e.preventDefault()}>
          See all <ChevronRight size={14} />
        </a>
      </div>
      <div className="alerts-row">
        {stats.fleetAlerts.map((a) => (
          <AlertPill key={a.id} {...a} />
        ))}
      </div>

      <div className="dash-grid">
        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Weekly activity</h3>
              <p>{rangeCopy} · logins and page visits</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge badge-live">Live</span>
              <div className="range-toggle">
                {RANGES.map((r) => (
                  <button key={r} type="button" className={range === r ? "active" : ""} onClick={() => setRange(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <AreaLineChart data={stats.activity} color="#FF6F91" />
        </div>

        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Users by role</h3>
              <p>Current access distribution</p>
            </div>
          </div>
          <DonutChart data={donutData} />
        </div>
      </div>

      <div className="dash-grid">
        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Upcoming services</h3>
              <p>Scheduled maintenance this week</p>
            </div>
          </div>
          <div className="date-strip">
            {stats.scheduleDays.map((d) => (
              <button
                key={d.day}
                type="button"
                className={`date-pill ${selectedDay === d.day ? "active" : ""}`}
                onClick={() => setSelectedDay(d.day)}
              >
                <span className="date-pill-num">{d.day}</span>
                <span className="date-pill-label">{d.label}</span>
              </button>
            ))}
          </div>
          <div className="service-list">
            {daySchedule.length === 0 ? (
              <p className="service-empty">Nothing scheduled for this day.</p>
            ) : (
              daySchedule.map((s) => (
                <div key={s.time + s.task} className="service-row">
                  <span className="service-time">{s.time}</span>
                  <div className="service-info">
                    <p className="service-task">{s.task}</p>
                    <p className="service-meta">{s.meta}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card dash-panel goal-card">
          <div className="panel-head" style={{ width: "100%" }}>
            <div>
              <h3>Fleet utilization</h3>
              <p>Vehicles active right now</p>
            </div>
          </div>
          <div className="goal-ring-wrap">
            <GoalRing value={stats.fleetUtilization.active} goal={stats.totalVehicles} color="#8B7CF6" />
          </div>
          <p className="goal-caption">Great coverage today</p>
          <p className="goal-subcaption">
            {stats.fleetUtilization.active} of {stats.totalVehicles} vehicles are on active routes
          </p>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Recently added vehicles</h3>
              <p>Latest entries in Vehicle Notes</p>
            </div>
          </div>
          <div className="recent-list">
            {stats.recentVehicles.map((v) => (
              <div key={v.name} className="recent-row">
                <div className="recent-avatar">{v.name.charAt(0)}</div>
                <div className="recent-info">
                  <p className="recent-name">{v.name}</p>
                  <p className="recent-type">{v.type}</p>
                </div>
                <span className="badge badge-model">{v.model}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Team on duty</h3>
              <p>Reach a teammate directly</p>
            </div>
            <span className="badge badge-live">
              <Activity size={13} />
            </span>
          </div>
          <div className="recent-list">
            {stats.teamContacts.map((c) => (
              <ContactRow key={c.name} {...c} />
            ))}
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Recent tire comparisons</h3>
              <p>Last few sizes run through the calculator</p>
            </div>
            <Link to="/tire-calculator" className="see-all-link">
              Open calculator <ChevronRight size={14} />
            </Link>
          </div>
          <div className="recent-list">
            {(stats.recentTireComparisons || []).length === 0 ? (
              <p className="service-empty">No comparisons logged yet.</p>
            ) : (
              stats.recentTireComparisons.map((c) => (
                <div key={c._id} className="recent-row">
                  <div className="recent-avatar"><Scale size={15} /></div>
                  <div className="recent-info">
                    <p className="recent-name">{c.summary}</p>
                    <p className="recent-type">{new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  {typeof c.data?.diffPct === "number" && (
                    <span className="badge badge-model">{c.data.diffPct >= 0 ? "+" : ""}{c.data.diffPct.toFixed(1)}%</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Recently searched vehicles</h3>
              <p>Latest Application Guide / Tech Data lookups</p>
            </div>
            <Link to="/tech-data" className="see-all-link">
              Open Tech Data <ChevronRight size={14} />
            </Link>
          </div>
          <div className="recent-list">
            {(stats.recentVehicleSearches || []).length === 0 ? (
              <p className="service-empty">No vehicle searches logged yet.</p>
            ) : (
              stats.recentVehicleSearches.map((s) => (
                <div key={s._id} className="recent-row">
                  <div className="recent-avatar"><Search size={15} /></div>
                  <div className="recent-info">
                    <p className="recent-name">{s.summary}</p>
                    <p className="recent-type">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card dash-panel goal-card" style={{ maxWidth: 360 }}>
        <div className="panel-head" style={{ width: "100%" }}>
          <div>
            <h3>Reports</h3>
            <p>Activity captured for date-range exports</p>
          </div>
        </div>
        <div className="goal-ring-wrap">
          <GoalRing
            value={stats.reportsSummary?.last7Days ?? 0}
            goal={Math.max(stats.reportsSummary?.totalActivity ?? 1, 1)}
            color="#4FCFB6"
          />
        </div>
        <p className="goal-caption">Last 7 days vs. all-time activity</p>
        <p className="goal-subcaption">
          {stats.reportsSummary?.totalActivity ?? 0} events logged in total
        </p>
        <Link to="/reports" className="btn btn-accent" style={{ marginTop: 14 }}>
          <FileBarChart size={15} /> Open Reporting & Data Export
        </Link>
      </div>
    </div>
  );
}