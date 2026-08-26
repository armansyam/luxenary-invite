"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

export default function LiveShowClient({ invitationId }: { invitationId: string }) {
  const [memories, setMemories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mode, setMode] = useState<"slideshow" | "masonry" | "custom_scene">("slideshow");
  const [filter, setFilter] = useState<"ALL" | "GUEST" | "BOOTH">("ALL");
  const [customSceneUrl, setCustomSceneUrl] = useState<string | null>(null);
  
  // Real-time SSE Connection
  useEffect(() => {
    // Initial fetch
    fetch(`/api/public/memories/${invitationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMemories(data);
        }
      })
      .catch(console.error);

    const eventSource = new EventSource(`/api/sse/memories?invitationId=${invitationId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "COMMAND") {
          console.log("Received remote command:", data);
          if (data.command === "CHANGE_MODE") {
            setMode(data.value);
            setCurrentIndex(0); // Reset index on mode change
          } else if (data.command === "CHANGE_FILTER") {
            setFilter(data.value);
            setCurrentIndex(0); // Reset index on filter change
          } else if (data.command === "SHOW_SCENE") {
            setCustomSceneUrl(data.value);
            setMode("custom_scene");
          }
          // Tampilkan control panel sesaat agar audiens tahu ada perubahan (opsional)
          setIsHovered(true);
          clearTimeout((window as any).hideTimeout);
          (window as any).hideTimeout = setTimeout(() => setIsHovered(false), 3000);
          return;
        }

        // Kalau bukan COMMAND, berarti MEMORY baru
        const newMemory = data;
        setMemories((prev) => [newMemory, ...prev]); // Inject new memory at the front
        
        // If in slideshow, reset index to show the newest immediately
        if (mode === "slideshow") {
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    return () => eventSource.close();
  }, [invitationId, mode]);

  // Slideshow Auto-play
  useEffect(() => {
    if (mode !== "slideshow" || memories.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % memories.length);
    }, 5000); // 5 seconds per slide

    return () => clearInterval(interval);
  }, [mode, memories.length]);

  const filteredMemories = memories.filter(m => {
    if (filter === "ALL") return true;
    return m.source === filter;
  });

  const currentMedia = filteredMemories[currentIndex];

  return (
    <div 
      className="bg-black text-white w-screen h-screen overflow-hidden relative font-sans selection:bg-amber-500/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={() => {
        setIsHovered(true);
        // auto hide after 3 seconds of no movement
        clearTimeout((window as any).hideTimeout);
        (window as any).hideTimeout = setTimeout(() => setIsHovered(false), 3000);
      }}
    >
      {/* 1. MAIN DISPLAY AREA */}
      {mode === "custom_scene" && customSceneUrl ? (
        <div className="w-full h-full flex items-center justify-center bg-black relative animate-in fade-in duration-1000">
          <Image 
            src={customSceneUrl} 
            alt="Custom Scene" 
            fill 
            className="object-contain" 
            priority
          />
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-stone-500">
          <div className="w-12 h-12 border-2 border-stone-800 border-t-amber-600 rounded-full animate-spin mb-4"></div>
          <p className="tracking-widest uppercase text-sm">Menunggu Media Masuk...</p>
        </div>
      ) : (
        <div className="w-full h-full relative">
          {mode === "slideshow" && currentMedia && (
            <div key={currentMedia.id} className="w-full h-full relative animate-fade-in">
              {currentMedia.type === "IMAGE" ? (
                <img 
                  src={currentMedia.url} 
                  alt="Live Memory" 
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <video 
                  src={currentMedia.url} 
                  autoPlay 
                  muted 
                  loop 
                  className="w-full h-full object-contain bg-black"
                />
              )}
              {/* Optional: Show sender name */}
              <div className="absolute bottom-10 left-10 bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
                <p className="text-white font-bold text-xl">{currentMedia.senderName || "Tamu Undangan"}</p>
                <p className="text-stone-400 text-sm">Via {currentMedia.source === "BOOTH" ? "Video Booth" : "Guest App"}</p>
              </div>
            </div>
          )}

          {mode === "masonry" && (
            <div className="w-full h-full p-8 overflow-y-auto columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
              {filteredMemories.map((m) => (
                <div key={m.id} className="break-inside-avoid relative rounded-2xl overflow-hidden border border-white/10 group">
                  {m.type === "IMAGE" ? (
                    <img src={m.url} alt="Memory" className="w-full h-auto object-cover" />
                  ) : (
                    <video src={m.url} autoPlay muted loop className="w-full h-auto object-cover" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition">
                    <p className="text-white font-bold text-sm">{m.senderName || "Tamu Undangan"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. WO CONTROL PANEL (HIDDEN ON IDLE) */}
      <div 
        className={`absolute top-0 inset-x-0 p-6 flex justify-center transition-transform duration-500 z-50 ${isHovered ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}
      >
        <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-6 shadow-2xl">
          
          <div className="flex flex-col gap-1 pr-6 border-r border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Studio Mode</span>
            <div className="flex bg-stone-900 rounded-lg p-1">
              <button 
                onClick={() => setMode("slideshow")}
                className={`px-4 py-2 rounded-md text-xs font-bold transition ${mode === "slideshow" ? "bg-amber-600 text-white" : "text-stone-400 hover:text-white"}`}
              >
                Slideshow
              </button>
              <button 
                onClick={() => setMode("masonry")}
                className={`px-4 py-2 rounded-md text-xs font-bold transition ${mode === "masonry" ? "bg-amber-600 text-white" : "text-stone-400 hover:text-white"}`}
              >
                Masonry Grid
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 pr-6 border-r border-white/10">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Live Filter</span>
            <div className="flex bg-stone-900 rounded-lg p-1">
              <button 
                onClick={() => setFilter("ALL")}
                className={`px-4 py-2 rounded-md text-xs font-bold transition ${filter === "ALL" ? "bg-emerald-600 text-white" : "text-stone-400 hover:text-white"}`}
              >
                Semua
              </button>
              <button 
                onClick={() => setFilter("GUEST")}
                className={`px-4 py-2 rounded-md text-xs font-bold transition ${filter === "GUEST" ? "bg-emerald-600 text-white" : "text-stone-400 hover:text-white"}`}
              >
                Hanya HP Tamu
              </button>
              <button 
                onClick={() => setFilter("BOOTH")}
                className={`px-4 py-2 rounded-md text-xs font-bold transition ${filter === "BOOTH" ? "bg-emerald-600 text-white" : "text-stone-400 hover:text-white"}`}
              >
                Hanya iPad Booth
              </button>
            </div>
          </div>

          <button 
            onClick={() => document.documentElement.requestFullscreen().catch(console.error)}
            className="p-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-white transition flex items-center justify-center"
            title="Masuk Fullscreen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}
