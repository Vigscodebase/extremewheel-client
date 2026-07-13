import { Activity, Car, Gauge, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import AreaLineChart from "../components/charts/areaLinechart";
import DonutChart from "../components/charts/donutchart";
import PageHeader from "../components/pageheader";
import { useAuth } from "../context/authcontext";
import axios from "../utils/axiosInstance";

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

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(FALLBACK);

  useEffect(() => {
    let ignore = false;
    axios
      .get("api/dashboard/summary")
      .then(({ data }) => {
        if (!ignore && data) setStats((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {
        // No backend endpoint yet — the fallback demo numbers above stay in place.
      });
    return () => {
      ignore = true;
    };
  }, []);

  const donutData = [
    { label: "Admin", value: stats.usersByRole.admin, color: "#8B7CF6" },
    { label: "Staff", value: stats.usersByRole.staff, color: "#4FCFB6" },
    { label: "Guest", value: stats.usersByRole.guest, color: "#FFB258" },
  ];

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

      <div className="dash-grid">
        <div className="card dash-panel">
          <div className="panel-head">
            <div>
              <h3>Weekly activity</h3>
              <p>Logins and page visits this week</p>
            </div>
            <span className="badge badge-live">
              <Activity size={13} /> Live
            </span>
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

      <div className="card dash-panel mt-20">
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
              <span className="badge badge-model">
                {v.model}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}