import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const BackupRestore: React.FC = () => {
  const { token } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('scouts_pos_last_backup') || 'None recorded yet';
  });

  const handleDownloadBackup = () => {
    const nowStr = new Date().toLocaleString();
    localStorage.setItem('scouts_pos_last_backup', nowStr);
    setLastBackupTime(nowStr);
    window.location.href = '/api/backup/download';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('CRITICAL WARNING: Restoring a database file will overwrite all current sales, products, and shifts. Are you sure you wish to proceed?')) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    setErrorMsg('');
    setRestoreSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);

          const res = await fetch('/api/backup/restore', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token || '',
            },
            body: JSON.stringify({ base64Data }),
          });

          const data = await res.json();
          if (res.ok) {
            setRestoreSuccess(true);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setErrorMsg(data.error || 'Failed to restore database');
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Error processing database file');
        } finally {
          setRestoring(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reading file');
      setRestoring(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 select-none">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-700" />
            Database Backup & Disaster Recovery
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Safeguard Scouts canteen transactions and catalog data to an offline `.sqlite` archive.
          </p>
        </div>
      </div>

      {restoreSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Database successfully restored! Reloading application...</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Backup Database</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Export the current SQLite database file (<code className="font-mono font-bold text-stone-700">scouts_canteen.sqlite</code>). You can copy this file to a USB flash drive or cloud drive for safekeeping.
            </p>

            <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
              <span className="font-semibold">Last Backup Performed: </span>
              <span className="font-mono text-stone-900 font-bold">{lastBackupTime}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Database Backup File (.sqlite)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Restore from Backup</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Restore the Scouts Canteen POS to a previous backup state by uploading a valid <code className="font-mono font-bold text-stone-700">.sqlite</code> database file.
            </p>

            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Restoring will overwrite existing data. Ensure you have downloaded a current backup first.
              </span>
            </div>
          </div>

          <label className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-md transition cursor-pointer">
            {restoring ? (
              <span>Restoring database...</span>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload & Restore .sqlite File</span>
              </>
            )}
            <input
              type="file"
              accept=".sqlite,.db"
              onChange={handleFileSelect}
              disabled={restoring}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
