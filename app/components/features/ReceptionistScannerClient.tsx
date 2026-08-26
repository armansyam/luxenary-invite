"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";

interface Guest {
  id: string;
  name: string;
  category: string | null;
  guestQuota: number;
  tableNumber: string | null;
  qrToken: string | null;
  isTokenRedeemed: boolean;
}

export default function ReceptionistScannerClient({ invitationId }: { invitationId: string }) {

  const [guests, setGuests] = useState<Guest[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<string[]>([]);
  const [status, setStatus] = useState<"LOADING" | "READY" | "OFFLINE" | "SYNCING">("LOADING");
  const [searchInput, setSearchInput] = useState("");
  const [scanResult, setScanResult] = useState<{ type: "success" | "error"; message: string; guest?: Guest } | null>(null);
  const [scannerMode, setScannerMode] = useState<"PHYSICAL" | "CAMERA">("PHYSICAL");

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load & Offline Cache
  useEffect(() => {
    const loadData = async () => {
      const cached = localStorage.getItem(`guests_${invitationId}`);
      const cachedQueue = localStorage.getItem(`offline_queue_${invitationId}`);
      
      if (cached) setGuests(JSON.parse(cached));
      if (cachedQueue) setOfflineQueue(JSON.parse(cachedQueue));

      try {
        const res = await fetch(`/api/booth/guests?invitationId=${invitationId}`);
        const data = await res.json();
        if (data.success) {
          setGuests(data.guests);
          localStorage.setItem(`guests_${invitationId}`, JSON.stringify(data.guests));
          setStatus("READY");
        } else {
          setStatus("OFFLINE");
        }
      } catch (err) {
        setStatus("OFFLINE");
      }
    };
    loadData();
  }, [invitationId]);

  // 2. Handle Sync (Background)
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (offlineQueue.length === 0 || !navigator.onLine) return;
      
      setStatus("SYNCING");
      const newQueue = [...offlineQueue];
      
      for (const guestId of offlineQueue) {
        const guest = guests.find(g => g.id === guestId);
        if (!guest || !guest.qrToken) continue;

        try {
          const res = await fetch("/api/booth/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrToken: guest.qrToken, invitationId }),
          });
          const data = await res.json();
          if (data.success) {
            const index = newQueue.indexOf(guestId);
            if (index > -1) newQueue.splice(index, 1);
          }
        } catch (e) {
          console.error("Sync failed for", guest?.name);
        }
      }

      setOfflineQueue(newQueue);
      localStorage.setItem(`offline_queue_${invitationId}`, JSON.stringify(newQueue));
      setStatus("READY");
    };

    const interval = setInterval(syncOfflineQueue, 5000);
    return () => clearInterval(interval);
  }, [offlineQueue, guests, invitationId]);

  // 3. Handle Scan / Search
  const handleCheckIn = (guest: Guest) => {
    if (guest.isTokenRedeemed) {
      setScanResult({ type: "error", message: `Tamu ${guest.name} sudah melakukan Check-in sebelumnya!` });
      return;
    }

    const updatedGuests = guests.map(g => g.id === guest.id ? { ...g, isTokenRedeemed: true } : g);
    setGuests(updatedGuests);
    localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updatedGuests));

    const newQueue = [...offlineQueue, guest.id];
    setOfflineQueue(newQueue);
    localStorage.setItem(`offline_queue_${invitationId}`, JSON.stringify(newQueue));

    setScanResult({ type: "success", message: `Berhasil Check-in!`, guest });
    setSearchInput("");
    if (inputRef.current) inputRef.current.focus();
  };

  const processScanToken = (token: string) => {
    if (!token) return;
    let targetName = token;
    let isLuxToken = false;
    
    if (token.startsWith('LUX|')) {
      const parts = token.split('|');
      const targetInvId = parts[1];
      
      if (targetInvId !== invitationId) {
        setScanResult({ type: "error", message: "QR Code salah! Ini adalah QR dari acara pernikahan lain." });
        return;
      }
      
      targetName = parts[2] || token;
      isLuxToken = true;
    }

    let foundGuest = guests.find(g => g.qrToken === token || g.name.toLowerCase() === targetName.toLowerCase() || (!isLuxToken && g.name.toLowerCase().includes(token.toLowerCase())));
    
    if (foundGuest) {
      handleCheckIn(foundGuest);
    } else if (isLuxToken) {
      const newGuest: Guest = {
        id: `local-${Date.now()}`,
        name: targetName,
        category: "Umum",
        guestQuota: 1,
        tableNumber: null,
        qrToken: token,
        isTokenRedeemed: false
      };
      
      const updatedGuests = [...guests, newGuest];
      setGuests(updatedGuests);
      localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updatedGuests));
      
      setTimeout(() => handleCheckIn(newGuest), 0);
    } else {
      setScanResult({ type: "error", message: "Data tamu tidak ditemukan di sistem." });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScanToken(searchInput.trim());
  };

  // 4. Camera Scanner Effect
  useEffect(() => {
    if (scannerMode === "CAMERA") {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          processScanToken(decodedText);
        },
        (error) => {
          // ignore error to keep scanning silently
        }
      );

      return () => {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      };
    }
  }, [scannerMode, guests, offlineQueue, invitationId]);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-stone-900 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold tracking-wide">RECEPTIONIST SYSTEM</h1>
          <p className="text-xs text-stone-400">Offline-First Fast Scanner</p>
        </div>
        <div className="text-right">
          {status === "LOADING" && <span className="px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-xs font-bold animate-pulse">⏳ LOADING DATA</span>}
          {status === "READY" && offlineQueue.length === 0 && <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">🟢 ONLINE & READY</span>}
          {status === "READY" && offlineQueue.length > 0 && <span className="px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full text-xs font-bold">🟡 MENUNGGU SYNC ({offlineQueue.length})</span>}
          {status === "SYNCING" && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold animate-pulse">⬆️ SYNCING...</span>}
          {status === "OFFLINE" && <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">🔴 OFFLINE MODE</span>}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Col: Result Card (Big Display) */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex-1 flex flex-col justify-center min-h-[400px]">
            {!scanResult ? (
              <div className="text-center text-stone-400 flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl text-stone-300">🔍</span>
                </div>
                <h3 className="font-bold text-lg text-stone-600 mb-1">Siap Menerima Tamu</h3>
                <p className="text-sm">Silakan lakukan scan QR atau cari nama tamu.</p>
              </div>
            ) : (
              <div className={`p-8 rounded-xl border w-full text-center shadow-inner ${scanResult.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {scanResult.type === 'success' ? (
                  <>
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
                      <span className="text-5xl text-white">✓</span>
                    </div>
                    <h3 className="text-3xl font-bold text-green-900 mb-2">{scanResult.guest?.name}</h3>
                    <p className="text-green-700 font-bold mb-6 text-lg">{scanResult.message}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                      <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                        <span className="block text-xs text-green-500 font-bold uppercase tracking-wider mb-1">Kategori</span>
                        <span className="text-xl font-black text-stone-900">{scanResult.guest?.category || "-"}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                        <span className="block text-xs text-green-500 font-bold uppercase tracking-wider mb-1">Meja / Kursi</span>
                        <span className="text-xl font-black text-stone-900">{scanResult.guest?.tableNumber || "-"}</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-green-100 col-span-2 shadow-sm text-center">
                        <span className="block text-xs text-green-500 font-bold uppercase tracking-wider mb-1">Kuota Tamu</span>
                        <span className="text-2xl font-black text-stone-900">{scanResult.guest?.guestQuota} Orang</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                     <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
                      <span className="text-5xl text-white">×</span>
                    </div>
                    <h3 className="text-2xl font-bold text-red-900 mb-2">Akses Ditolak</h3>
                    <p className="text-red-700 font-medium text-lg">{scanResult.message}</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-stone-800 rounded-2xl shadow-sm text-white p-6">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Statistik Kehadiran</h2>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black">{guests.filter(g => g.isTokenRedeemed).length}</span>
              <span className="text-stone-400 pb-1">/ {guests.length} Tamu</span>
            </div>
          </div>
        </div>

        {/* Right Col: Scanner Input & Guest List */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="flex border-b border-stone-100 bg-stone-50">
              <button 
                onClick={() => setScannerMode("PHYSICAL")}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition ${scannerMode === 'PHYSICAL' ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-stone-400 hover:text-stone-600'}`}
              >
                🔫 Scanner Fisik
              </button>
              <button 
                onClick={() => setScannerMode("CAMERA")}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition ${scannerMode === 'CAMERA' ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-stone-400 hover:text-stone-600'}`}
              >
                📷 Kamera Live
              </button>
            </div>
            
            <div className="p-6">
              {scannerMode === "PHYSICAL" ? (
                <div>
                  <p className="text-xs text-stone-500 mb-4 text-center">Gunakan alat scanner barcode tembak (Bluetooth/USB) atau ketik manual.</p>
                  <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      autoFocus
                      className="flex-1 px-4 py-4 bg-stone-50 border border-stone-300 rounded-xl text-lg font-bold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                      placeholder="Scan QR / Ketik Nama..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <button type="submit" className="px-8 py-4 bg-stone-900 text-white rounded-xl font-bold tracking-widest hover:bg-stone-800 transition">
                      CARI
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-stone-500 mb-4 text-center">Arahkan kamera ke QR Code tamu. Hasil akan muncul di sebelah kiri.</p>
                  <div className="rounded-xl overflow-hidden border-2 border-stone-200">
                    <div id="qr-reader" className="w-full"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col flex-1 min-h-[300px]">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
              <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Daftar Tamu Manual</h2>
            </div>
            <div className="overflow-y-auto p-2 h-[300px]">
              {guests.filter(g => searchInput ? g.name.toLowerCase().includes(searchInput.toLowerCase()) : true).map((g) => (
                <div key={g.id} className="flex justify-between items-center p-3 hover:bg-stone-50 border-b border-stone-100 last:border-0 rounded-lg transition">
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{g.name}</p>
                    <p className="text-xs text-stone-500">{g.category || "Umum"} &bull; Meja {g.tableNumber || "-"}</p>
                  </div>
                  <div>
                    {g.isTokenRedeemed ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">Hadir</span>
                    ) : (
                      <button onClick={() => handleCheckIn(g)} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold rounded uppercase tracking-wider transition">
                        Manual Check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {guests.length === 0 && (
                <div className="p-8 text-center text-stone-400 text-sm">Belum ada data tamu termuat.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
