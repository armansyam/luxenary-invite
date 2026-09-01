"use client";

import { useState, useEffect } from "react";

interface StaffLockScreenProps {
  invitationId: string;
  children: React.ReactNode;
}

export default function StaffLockScreen({ invitationId, children }: StaffLockScreenProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    // We optimistically unlock if there's a PIN in localStorage. 
    // The actual API will reject invalid PINs when scanning.
    const savedPin = localStorage.getItem(`staff_auth_${invitationId}`);
    if (savedPin) {
      setIsLocked(false);
    }
  }, [invitationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) return;

    try {
      const res = await fetch('/api/receptionist/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, pin: pinInput })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem(`staff_auth_${invitationId}`, pinInput);
        setIsLocked(false);
        setError(false);
      } else {
        setError(true);
        setPinInput("");
      }
    } catch (err) {
      setError(true);
      setPinInput("");
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 opacity-50"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-900 rounded-full blur-3xl opacity-20"></div>

        <div className="relative z-10 text-center space-y-6">
          <div className="w-16 h-16 bg-stone-800 rounded-2xl mx-auto flex items-center justify-center border border-stone-700 shadow-inner">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Akses Terkunci</h1>
            <p className="text-xs text-stone-400 mt-2">
              Masukkan PIN Panitia untuk mengakses halaman operasional acara ini.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                maxLength={10}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (error) setError(false);
                }}
                className={`w-full bg-stone-950 border ${error ? 'border-rose-500/50 focus:border-rose-500 text-rose-400' : 'border-stone-700 focus:border-amber-600 text-white'} rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 ${error ? 'focus:ring-rose-500/20' : 'focus:ring-amber-600/20'} transition-all`}
                placeholder="••••••"
                autoFocus
              />
              {error && (
                <p className="text-rose-400 text-xs mt-2 font-medium">PIN yang dimasukkan salah.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!pinInput}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-stone-800 disabled:text-stone-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-amber-900/20"
            >
              Buka Kunci Akses
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
