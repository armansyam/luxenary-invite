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
  const [scanResult, setScanResult] = useState<{ type: "success" | "error"; message: string; guest?: Guest; showDuplicatePrompt?: boolean; scannedName?: string; } | null>(null);
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
        const res = await fetch(`/api/receptionist/guests?invitationId=${invitationId}`);
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
          const staffAuthToken = localStorage.getItem(`staff_auth_token_${invitationId}`);
          const res = await fetch("/api/receptionist/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrToken: guest.qrToken, invitationId, isCheckIn: true, token: staffAuthToken }),
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

  // 2b. Background Polling (15 menit) untuk refresh data tamu jika ada tamu baru dari dashboard
  useEffect(() => {
    const fetchLatestGuests = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch(`/api/receptionist/guests?invitationId=${invitationId}`);
        const data = await res.json();
        if (data.success && data.guests) {
          // Hanya update jika ada penambahan tamu atau perubahan signifikan,
          // tapi tetap pertahankan status isTokenRedeemed lokal untuk yang sudah check-in offline.
          setGuests(prevGuests => {
            const localRedeemed = new Set(prevGuests.filter(g => g.isTokenRedeemed).map(g => g.id));
            const updated = data.guests.map((serverGuest: Guest) => ({
              ...serverGuest,
              isTokenRedeemed: serverGuest.isTokenRedeemed || localRedeemed.has(serverGuest.id)
            }));
            localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.warn("Background guest sync failed", err);
      }
    };

    const pollingInterval = setInterval(fetchLatestGuests, 15 * 60 * 1000); // 15 menit
    return () => clearInterval(pollingInterval);
  }, [invitationId]);

  // 3. Handle Scan / Search
  const handleCheckIn = (guest: Guest) => {
    if (guest.isTokenRedeemed) {
      setScanResult({ 
        type: "error", 
        message: `Tamu ${guest.name} sudah melakukan Check-in sebelumnya!`, 
        guest,
        showDuplicatePrompt: true,
        scannedName: guest.name
      });
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

  const handleDuplicateGuestArrival = (originalName: string) => {
    // Cari angka terakhir untuk nama yang sama
    const count = guests.filter(g => g.name.toLowerCase().startsWith(originalName.toLowerCase())).length;
    const newName = `${originalName} (${count + 1})`;
    
    const newGuest: Guest = {
      id: `local-${Date.now()}`,
      name: newName,
      category: "UMUM",
      guestQuota: 1,
      tableNumber: null,
      qrToken: null,
      isTokenRedeemed: true
    };
    
    const updatedGuests = [newGuest, ...guests];
    setGuests(updatedGuests);
    localStorage.setItem(`guests_${invitationId}`, JSON.stringify(updatedGuests));
    
    const newQueue = [...offlineQueue, newGuest.id];
    setOfflineQueue(newQueue);
    localStorage.setItem(`offline_queue_${invitationId}`, JSON.stringify(newQueue));
    
    setScanResult({ type: "success", message: `Berhasil Check-in sebagai Tamu Umum Tambahan!`, guest: newGuest });
    setSearchInput("");
  };

  const processScanToken = (token: string) => {
    if (!token) return;
    let targetName = token;
    let targetCategory = "Umum";
    let isLuxToken = false;
    
    if (token.startsWith('LUX|')) {
      const parts = token.split('|');
      const targetInvId = parts[1];
      
      if (targetInvId !== invitationId) {
        setScanResult({ type: "error", message: "QR Code salah! Ini adalah QR dari acara pernikahan lain." });
        return;
      }
      
      targetName = parts[2] || token;
      targetCategory = parts[3] || "Umum";
      isLuxToken = true;
    }

    let foundGuest = guests.find(g => g.qrToken === token || g.name.toLowerCase() === targetName.toLowerCase() || (!isLuxToken && g.name.toLowerCase().includes(token.toLowerCase())));
    
    if (foundGuest) {
      handleCheckIn(foundGuest);
    } else if (isLuxToken) {
      const newGuest: Guest = {
        id: `local-${Date.now()}`,
        name: targetName,
        category: targetCategory,
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
          {status === "LOADING" && <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] uppercase font-bold tracking-wider animate-pulse flex items-center gap-1.5"><svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>LOADING DATA</span>}
          {status === "READY" && offlineQueue.length === 0 && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>ONLINE &amp; READY</span>}
          {status === "READY" && offlineQueue.length > 0 && <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>MENUNGGU SYNC ({offlineQueue.length})</span>}
          {status === "SYNCING" && <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] uppercase font-bold tracking-wider animate-pulse flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>SYNCING...</span>}
          {status === "OFFLINE" && <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>OFFLINE MODE</span>}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Col: Result Card (Big Display) */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex-1 flex flex-col justify-center min-h-[400px]">
            {!scanResult ? (
              <div className="text-center text-stone-400 flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="font-bold text-lg text-stone-600 mb-1">Siap Menerima Tamu</h3>
                <p className="text-sm">Silakan lakukan scan QR atau cari nama tamu.</p>
              </div>
            ) : (
              <div className={`p-8 rounded-xl border w-full text-center shadow-inner ${scanResult.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {scanResult.type === 'success' ? (
                  <>
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-4xl font-black text-green-900 mb-2">{scanResult.guest?.name}</h3>
                    {scanResult.guest?.category && scanResult.guest.category.toLowerCase() !== "umum" && (
                      <div className="mb-6">
                        <span className="inline-block px-5 py-1.5 bg-green-100 text-green-800 rounded-full text-lg font-bold uppercase tracking-widest border border-green-300 shadow-sm">
                          {scanResult.guest.category}
                        </span>
                      </div>
                    )}
                    <p className="text-green-700 font-bold mb-2 text-lg">{scanResult.message}</p>
                  </>
                ) : (
                   <>
                     <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-red-900 mb-2">Akses Ditolak</h3>
                    <p className="text-red-700 font-medium text-lg">{scanResult.message}</p>
                    {scanResult.showDuplicatePrompt && scanResult.scannedName && (
                      <div className="mt-6 pt-6 border-t border-red-200">
                        <p className="text-sm text-red-800 mb-3">Apakah ini tamu umum baru yang namanya kebetulan sama?</p>
                        <button
                          onClick={() => handleDuplicateGuestArrival(scanResult.scannedName!)}
                          className="w-full py-3 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl transition"
                        >
                          Tandai sebagai Orang Berbeda
                        </button>
                      </div>
                    )}
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
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${scannerMode === 'PHYSICAL' ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                Scanner Fisik
              </button>
              <button 
                onClick={() => setScannerMode("CAMERA")}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${scannerMode === 'CAMERA' ? 'bg-white text-amber-600 border-b-2 border-amber-500' : 'text-stone-400 hover:text-stone-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Kamera Live
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
