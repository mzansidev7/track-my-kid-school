import { useLocation } from "react-router-dom";
import { FiBell, FiSearch } from "react-icons/fi";

const pageNames = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/drivers": "Drivers",
  "/vehicles": "Vehicles",
  "/routes": "Routes",
  "/trips": "Trips",
  "/tracking": "Live Tracking",
  "/attendance": "Attendance",
  "/parents": "Parents",
  "/members": "Staff Members",
  "/announcements": "Announcements",
  "/notifications": "Notifications",
  "/reports": "Reports",
  "/incidents": "Incidents",
  "/settings": "Settings",
};

export default function PortalHeader() {
  const { pathname } = useLocation();
  const pageName = pageNames[pathname] || "Dashboard";
  const searchName = pageName.toLowerCase();

  return (
    <header className="portal-topbar portal-shared-header">
      <div className="portal-breadcrumb">
        <span>Schools</span>
        <b>›</b>
        <strong>{pageName}</strong>
      </div>
      <div className="portal-top-actions">
        <label className="portal-search">
          <FiSearch />
          <input placeholder={`Search ${searchName}...`} />
        </label>
        <button className="icon-button" aria-label="Notifications">
          <FiBell />
          <b>5</b>
        </button>
        <div className="top-profile">
          <img src="https://i.pravatar.cc/100?img=5" alt="School admin" />
          <span>
            <strong>School Admin</strong>
            <small>Administrator</small>
          </span>
          <b>⌄</b>
        </div>
      </div>
    </header>
  );
}
