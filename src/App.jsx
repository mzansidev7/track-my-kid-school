import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import RoutesPage from "./pages/Routes";
import Trips from "./pages/Trips";
import Attendance from "./pages/Attendance";
import Parents from "./pages/Parents";
import Announcements from "./pages/Announcements";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import LiveTracking from "./pages/LiveTracking";
import Incidents from "./pages/Incidents";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/students" element={<Students />} />
      <Route path="/drivers" element={<Drivers />} />
      <Route path="/vehicles" element={<Vehicles />} />
      <Route path="/routes" element={<RoutesPage />} />
      <Route path="/trips" element={<Trips />} />
      <Route path="/tracking" element={<LiveTracking />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/parents" element={<Parents />} />
      <Route path="/announcements" element={<Announcements />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/incidents" element={<Incidents />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}