import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { User, AuditLog } from '../../types/index.js';
import { formatDateTime } from '../../utils/format.js';
import { Users, Plus, Shield, UserCheck, Key, Lock, X, CheckCircle2, History } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [subTab, setSubTab] = useState<'users' | 'audits'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users', {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAudits = async () => {
    try {
      const res = await fetch('/api/audit-logs?limit=100', {
        headers: { 'x-auth-token': token || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setAudits(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchAudits();
    }
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName,
          role,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create user');
        return;
      }

      setIsModalOpen(false);
      setUsername('');
      setPassword('');
      setFullName('');
      setPhone('');
      fetchUsers();
      fetchAudits();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    }
  };

  const toggleUserActive = async (u: User) => {
    if (u.id === currentUser?.id) {
      alert('You cannot deactivate your own account while logged in.');
      return;
    }

    try {
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          full_name: u.full_name,
          role: u.role,
          phone: u.phone,
          is_active: u.is_active === 1 ? 0 : 1,
        }),
      });

      if (res.ok) {
        fetchUsers();
        fetchAudits();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-700" />
            User Security & Audit Trail
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage cashier and administrator accounts and inspect full system audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'users' && (
            <button
              onClick={() => {
                setErrorMsg('');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtab Toggle */}
      <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200 w-fit">
        <button
          onClick={() => setSubTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            subTab === 'users'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          User Accounts ({users.length})
        </button>
        <button
          onClick={() => setSubTab('audits')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
            subTab === 'audits'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Security Audit Trail ({audits.length})</span>
        </button>
      </div>

      {subTab === 'users' ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">{u.username}</td>
                    <td className="py-3 px-4 font-bold text-stone-800">{u.full_name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">{u.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          u.is_active === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => toggleUserActive(u)}
                          className="text-xs text-stone-500 hover:text-stone-800 font-semibold"
                        >
                          {u.is_active === 1 ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-mono">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 text-stone-500 font-sans">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-800 font-sans">
                      {a.user_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-950">{a.action}</td>
                    <td className="py-3 px-4 text-stone-500">{a.target_type}</td>
                    <td className="py-3 px-4 font-sans text-stone-700">{a.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Create User Account</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. cashier2"
                  className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-stone-300"
                />
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
                  placeholder="e.g. Grace Nakato"
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter strong password..."
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                    className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+256 700 000 000"
                    className="w-full text-xs p-2.5 rounded-lg border border-stone-300"
                  />
                </div>
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
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
