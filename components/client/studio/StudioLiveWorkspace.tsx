"use client";


import { useStudioEditor } from "@/components/client/studio/StudioEditorContext";

export function StudioLiveWorkspace() {
  const {
    activeStudioTab,
    broadcastToAllLiveIframes,
    invitationId,
    isCanvasFullscreen,
    isDirty,
    liveCanvasRef,
    liveDesktopIframeRef,
    liveFallbackIframeRef,
    liveIframeKey,
    liveMobileIframeRef,
    liveSingleIframeRef,
    previewDevice,
    revertAllChanges,
    saveSection,
    saving,
    setLiveIframeKey,
    toggleCanvasFullscreen,
  } = useStudioEditor();

  return (
    <>
      <div
        className="space-y-2.5 sm:space-y-3"
        style={{ display: activeStudioTab === "live" ? "" : "none" }}
      >
        <div className="space-y-2.5 sm:space-y-3">

          {/* ==========================================================================
             LIVE VISUAL INLINE EDITOR CANVAS (CANVA / NOTION STYLE)
             ========================================================================== */}
          <div
            ref={liveCanvasRef}
            className={`bg-stone-950 sm:border sm:border-stone-800 shadow-xl flex flex-col items-center transition-all duration-200 ${
              isCanvasFullscreen
                ? "fixed inset-0 z-50 rounded-none w-screen h-screen p-2 sm:p-6 overflow-y-auto"
                : "rounded-none sm:rounded-3xl p-2 sm:p-8 min-h-[calc(100vh-140px)] sm:min-h-[850px]"
            }`}
          >
            <div className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-3 pb-4 border-b border-stone-800 mb-6 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-white font-medium">Mode Visual Click-to-Edit</span>
                <span className="text-stone-600">•</span>
                <span className="hidden sm:inline">Klik langsung teks judul, kutipan doa, atau nama untuk mengedit</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                <button
                  type="button"
                  onClick={() => setLiveIframeKey((k) => k + 1)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium rounded-lg text-xs transition border border-stone-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Muat ulang pratinjau dari server"
                >
                  <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Muat Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={toggleCanvasFullscreen}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium rounded-lg text-xs transition border border-stone-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title={isCanvasFullscreen ? "Keluar Layar Penuh (Esc)" : "Mode Layar Penuh (Fullscreen)"}
                >
                  {isCanvasFullscreen ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7m-7-17v6m0 0h6m-6 0L21 3M10 10V4m0 6H4m0 0l7-7" />
                      </svg>
                      <span className="hidden sm:inline">Keluar Penuh</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span className="hidden sm:inline">Layar Penuh</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    broadcastToAllLiveIframes({ type: "LUX_REMOTE_OPEN_INVITATION" });
                  }}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white font-medium rounded-lg text-xs transition border border-stone-800 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Buka amplop sampul pada layar pratinjau"
                >
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Buka Amplop</span>
                </button>
                {Object.values(isDirty).some(Boolean) && (
                  <button
                    type="button"
                    onClick={revertAllChanges}
                    disabled={saving}
                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-rose-950/60 text-stone-300 hover:text-rose-300 font-medium rounded-lg text-xs transition border border-stone-800 hover:border-rose-800/60 shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Urungkan seluruh perubahan yang belum disimpan"
                  >
                    <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4M3 10l4-4m-4 4l4 4" />
                    </svg>
                    <span>Urungkan Semua</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => saveSection()}
                  disabled={saving}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Semua"}
                </button>
              </div>
            </div>

            {previewDevice === "dual" ? (
              <>
                {/* Desktop Split Dual View (>= lg) */}
                <div className={`hidden lg:flex items-start gap-6 w-full ${isCanvasFullscreen ? "flex-1 min-h-0" : ""}`}>
                  {/* Left Pane: Mobile Phone Mockup */}
                  <div className={`w-[390px] shrink-0 flex flex-col ${isCanvasFullscreen ? "h-full" : ""}`}>
                    <div className="flex items-center justify-between text-xs text-stone-400 font-medium mb-2.5 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-white font-semibold">Tampilan Ponsel</span>
                        <span className="text-stone-500 text-[11px]">(390px)</span>
                      </div>
                      <span className="text-[10px] text-stone-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-md">
                        Mute
                      </span>
                    </div>
                    <div className={`w-full rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-black ${
                      isCanvasFullscreen ? "h-[calc(100vh-140px)]" : "h-[780px]"
                    }`}>
                      <iframe
                        key={`m-${liveIframeKey}`}
                        ref={liveMobileIframeRef}
                        src={`/api/client/invitations/${invitationId}/preview?mode=edit&audio=0&view=mobile&rev=${liveIframeKey}`}
                        className="w-full h-full border-0 bg-stone-900"
                        title="Live Visual Editor Mobile"
                      />
                    </div>
                  </div>

                  {/* Right Pane: Desktop Widescreen Mockup */}
                  <div className={`flex-1 min-w-0 flex flex-col ${isCanvasFullscreen ? "h-full" : ""}`}>
                    <div className="flex items-center justify-between text-xs text-stone-400 font-medium mb-2.5 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="text-white font-semibold">Tampilan Komputer (Layar Lebar)</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-medium bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                        Audio Utama
                      </span>
                    </div>
                    <div className={`w-full rounded-2xl overflow-hidden border border-stone-800 shadow-2xl bg-black ${
                      isCanvasFullscreen ? "h-[calc(100vh-140px)]" : "h-[780px]"
                    }`}>
                      <iframe
                        key={`d-${liveIframeKey}`}
                        ref={liveDesktopIframeRef}
                        src={`/api/client/invitations/${invitationId}/preview?mode=edit&view=desktop&rev=${liveIframeKey}`}
                        className="w-full h-full border-0 bg-stone-900"
                        title="Live Visual Editor Desktop"
                      />
                    </div>
                  </div>
                </div>

                {/* Mobile & Tablet Fallback (< lg): Single Mobile Frame */}
                <div className="lg:hidden w-full flex justify-center">
                  <div className={`w-full sm:w-[390px] rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-stone-800 shadow-2xl bg-black ${
                    isCanvasFullscreen ? "h-[calc(100vh-100px)]" : "h-[calc(100vh-220px)] sm:h-[780px]"
                  }`}>
                    <iframe
                      key={`fallback-${liveIframeKey}`}
                      ref={liveFallbackIframeRef}
                      src={`/api/client/invitations/${invitationId}/preview?mode=edit&view=mobile&rev=${liveIframeKey}`}
                      className="w-full h-full border-0 bg-stone-900"
                      title="Live Visual Editor Fallback"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Single Mode (Mobile or Desktop Fullscreen) */
              <div
                className={`transition-all duration-300 rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-stone-700/60 shadow-2xl bg-black flex justify-center ${
                  isCanvasFullscreen
                    ? previewDevice === "mobile"
                      ? "w-full sm:w-[390px] h-[calc(100vh-100px)]"
                      : "w-full h-[calc(100vh-100px)]"
                    : previewDevice === "mobile"
                    ? "w-full sm:w-[390px] h-[calc(100vh-220px)] sm:h-[780px]"
                    : "w-full h-[850px]"
                }`}
              >
                <iframe
                  key={`single-${liveIframeKey}`}
                  ref={liveSingleIframeRef}
                  src={`/api/client/invitations/${invitationId}/preview?mode=edit&view=${previewDevice}&rev=${liveIframeKey}`}
                  className="w-full h-full border-0 bg-stone-900"
                  title="Live Visual Editor"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
