import Sidebar from "../components/sidebar/Sidebar";

function Dashboard() {
  return (
    <div className="grid h-screen grid-cols-[20%_80%]">
      <Sidebar />

      <main className="overflow-y-auto bg-slate-50 p-8">
        <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-600">
          Welcome to the Track My Kid School Dashboard.
        </p>
      </main>
    </div>
  );
}

export default Dashboard;
