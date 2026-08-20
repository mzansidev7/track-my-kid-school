import { useEffect, useState } from "react";
import { FiPlus, FiUser, FiX } from "react-icons/fi";
import { API_URL } from "../api";

const roles = [
  ["principal", "Principal"],
  ["deputy_principal", "Deputy principal"],
  ["teacher", "Teacher"],
  ["administrator", "Administrator"],
  ["transport_coordinator", "Transport coordinator"],
];

const getAuth = () => {
  try { return JSON.parse(localStorage.getItem("schoolAuth") || "{}"); } catch { return {}; }
};

export default function Members() {
  const [members, setMembers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", member_role: "teacher" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const token = getAuth().token;

  const loadMembers = async () => {
    const response = await fetch(`${API_URL}/school/members`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) setMembers(await response.json());
  };

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URL}/school/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (mounted) setMembers(data);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/school/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add member");
      setMessage("Member added. Temporary login details were sent by email.");
      setForm({ name: "", email: "", phone: "", member_role: "teacher" });
      setFormOpen(false);
      await loadMembers();
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-left">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">School team</p><h1 className="mt-2 text-4xl font-extrabold text-slate-900">Staff members</h1><p className="mt-2 text-slate-500">Manage access by school responsibility.</p></div>
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white hover:bg-teal-800"><FiPlus /> Add member</button>
        </div>
        {message && <div className="mb-5 rounded-xl bg-teal-50 p-4 text-sm font-semibold text-teal-800">{message}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-full bg-teal-100 text-teal-700"><FiUser size={22} /></div><div><h2 className="text-lg font-bold text-slate-900">{member.users?.name}</h2><p className="text-sm text-slate-500">{member.users?.email}</p></div></div>
              <div className="mt-5 flex items-center justify-between"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{roles.find(([value]) => value === member.member_role)?.[1] || member.member_role}</span><span className="text-xs font-semibold text-slate-400">{member.status}</span></div>
            </div>
          ))}
          {!members.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 md:col-span-2">No staff members added yet.</div>}
        </div>
        {formOpen && <div className="fixed inset-0 z-10 grid place-items-center bg-slate-950/40 p-5"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl"><div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-extrabold text-slate-900">Add school member</h2><button type="button" onClick={() => setFormOpen(false)}><FiX /></button></div><div className="grid gap-4"><input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-slate-200 p-3" /><input required type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-slate-200 p-3" /><input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-slate-200 p-3" /><select value={form.member_role} onChange={(e) => setForm({ ...form, member_role: e.target.value })} className="rounded-xl border border-slate-200 p-3">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button disabled={saving} className="rounded-xl bg-teal-700 p-3 font-bold text-white">{saving ? "Adding..." : "Add member"}</button></div></form></div>}
      </div>
    </main>
  );
}
