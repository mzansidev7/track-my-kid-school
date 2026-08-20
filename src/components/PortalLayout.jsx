import Sidebar from "./sidebar/Sidebar";

export default function PortalLayout({ children }) {
  return (
    <div className="portal-shell">
      <Sidebar />
      <main className="portal-main">{children}</main>
    </div>
  );
}
