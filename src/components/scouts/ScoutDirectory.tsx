import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ScoutMember } from '../../types/index.js';
import { Users, Plus, Search, Shield, X, CheckCircle2 } from 'lucide-react';

export const ScoutDirectory: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const [scouts, setScouts] = useState<ScoutMember[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [memberNumber, setMemberNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [patrol, setPatrol] = useState('Eagle');
  const [unitSection, setUnitSection] = useState('Scouts');
  const [groupName, setGroupName] = useState('');
  const [contact, setContact] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchScouts = async () => {
    try {
      const res = await fetch('/api/scouts', {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setScouts(data.scouts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) fetchScouts();
  }, [token]);

  const openAddModal = () => {
    const nextNum = 'UG-SC-' + (100 + scouts.length + 1);
    setMemberNumber(nextNum);
    setFullName('');
    setPatrol('Eagle');
    setUnitSection('Scouts');
    setGroupName('1st Kampala Troop');
    setContact('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberNumber.trim() || !fullName.trim()) {
      setErrorMsg('Member number and full name are required.');
      return;
    }

    try {
      const res = await fetch('/api/scouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          member_number: memberNumber.trim(),
          full_name: fullName.trim(),
          patrol,
          unit_section: unitSection,
          group_name: groupName.trim(),
          contact: contact.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save Scout member.');
        return;
      }

      setIsModalOpen(false);
      fetchScouts();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    }
  };

  const filteredScouts = scouts.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.member_number.toLowerCase().includes(q) ||
      (s.patrol || '').toLowerCase().includes(q) ||
      (s.group_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            Scout Members & Patrol Registry
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Register Scouts and leaders to track purchases by patrol, section, and troop.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Scout Member</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Scout name, member ID, patrol, or school..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>
        <span className="text-xs text-stone-500">{filteredScouts.length} member(s)</span>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Patrol</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Troop / School Group</th>
                <th className="py-3 px-4">Phone / Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredScouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-400">
                    No Scout members found.
                  </td>
                </tr>
              ) : (
                filteredScouts.map((s) => (
                  <tr key={s.id} className="hover:bg-emerald-50/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-950">
                      {s.member_number}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">{s.full_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        {s.patrol || 'None'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600">{s.unit_section}</td>
                    <td className="py-3 px-4 text-stone-800 font-medium">{s.group_name}</td>
                    <td className="py-3 px-4 font-mono text-stone-500">{s.contact || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span>Register Scout Member</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScout} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Member ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={memberNumber}
                    onChange={(e) => setMemberNumber(e.target.value)}
                    placeholder="e.g. UG-SC-101"
                    className="w-full text-xs font-mono font-bold p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Patrol
                  </label>
                  <select
                    value={patrol}
                    onChange={(e) => setPatrol(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="Eagle">Eagle Patrol</option>
                    <option value="Lion">Lion Patrol</option>
                    <option value="Buffalo">Buffalo Patrol</option>
                    <option value="Cobra">Cobra Patrol</option>
                    <option value="Falcon">Falcon Patrol</option>
                    <option value="Rhino">Rhino Patrol</option>
                    <option value="Leopard">Leopard Patrol</option>
                    <option value="Leader">Leader / Scoutmaster</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kiiza Joshua"
                  className="w-full text-xs font-semibold p-2 rounded-lg border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Unit Section
                  </label>
                  <select
                    value={unitSection}
                    onChange={(e) => setUnitSection(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="Cubs">Cubs (7-11 yrs)</option>
                    <option value="Scouts">Scouts (11-15 yrs)</option>
                    <option value="Ventures">Ventures (15-18 yrs)</option>
                    <option value="Rovers">Rovers (18-25 yrs)</option>
                    <option value="Leaders">Leaders & Commissioners</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Phone / Contact
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+256 700 000 000"
                    className="w-full text-xs p-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Troop / School Group
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. 1st Kampala Troop / Mengo SS"
                  className="w-full text-xs p-2 rounded-lg border border-stone-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Scout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
