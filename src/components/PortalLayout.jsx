import Sidebar from "./sidebar/Sidebar";

import PortalHeader from "./PortalHeader";
export default function PortalLayout({ children }) {
  return (
    <div className="portal-shell">
      <Sidebar />
      <main className="portal-main">
        <PortalHeader />
        {children}
      </main>
    </div>
  );
}
