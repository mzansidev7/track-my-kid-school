import {
  FiHome,
  FiUsers,
  FiTruck,
  FiMap,
  FiNavigation,
  FiActivity,
  FiUserCheck,
  FiBell,
  FiMessageSquare,
  FiFileText,
  FiAlertTriangle,
  FiSettings,
  FiChevronLeft,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import { NavLink } from "react-router-dom";

const menuItems = [
  { title: "Dashboard", icon: <FiHome />, path: "/dashboard" },
  { title: "Students", icon: <FiUsers />, path: "/students" },
  { title: "Drivers", icon: <FiUserCheck />, path: "/drivers" },
  { title: "Vehicles", icon: <FaBus />, path: "/vehicles" },
  { title: "Routes", icon: <FiMap />, path: "/routes" },
  { title: "Trips", icon: <FiTruck />, path: "/trips" },
  { title: "Live Tracking", icon: <FiNavigation />, path: "/tracking" },
  { title: "Attendance", icon: <FiActivity />, path: "/attendance" },
  { title: "Parents", icon: <FiUsers />, path: "/parents" },
  { title: "Announcements", icon: <FiMessageSquare />, path: "/announcements" },
  {
    title: "Notifications",
    icon: <FiBell />,
    path: "/notifications",
    badge: 5,
  },
  { title: "Reports", icon: <FiFileText />, path: "/reports" },
  { title: "Incidents", icon: <FiAlertTriangle />, path: "/incidents" },
  { title: "Settings", icon: <FiSettings />, path: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col justify-between bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-900 text-white shadow-2xl">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-4 px-6 py-8">
          <img
            src="/logo.png"
            alt="Track My Kid"
            className="h-14 w-14 rounded-xl"
          />

          <div>
            <h2 className="text-2xl font-extrabold tracking-wide">TRACK</h2>
            <h3 className="text-lg font-semibold text-violet-400">MY KID</h3>
          </div>
        </div>

        {/* School Card */}
        <div className="mx-5 mb-6 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <h4 className="font-semibold">Sunshine Primary School</h4>

          <span className="mt-3 inline-block rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold">
            School Admin
          </span>
        </div>

        {/* Menu */}
        <nav className="space-y-2 px-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>

              <span className="flex-1">{item.title}</span>

              {item.badge && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10 p-5">
        <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
          <img
            src="https://i.pravatar.cc/100?img=5"
            className="h-14 w-14 rounded-full object-cover"
            alt="Admin"
          />

          <div>
            <h5 className="font-semibold">Nomsa Dlamini</h5>

            <p className="text-sm text-slate-300">School Admin</p>
          </div>
        </div>

        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-slate-300 transition hover:bg-white/10 hover:text-white">
          <FiChevronLeft />
          Collapse
        </button>
      </div>
    </aside>
  );
}
