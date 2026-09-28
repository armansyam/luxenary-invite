"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { EMAIL_TEMPLATE_CATALOG, EmailTemplateMeta } from "@/lib/email-templates";

export default function AdminEmailPreviewPage() {
  const [selectedKey, setSelectedKey] = useState<string>("PAID_INVITATION");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [platformSettings, setPlatformSettings] = useState<{ platformName?: string }>({ platformName: "LUXVITE" });
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch public settings & current session email on mount
  useEffect(() => {
    fetch("/api/public/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.platformName) {
          setPlatformSettings({ platformName: data.settings.platformName });
        }
      })
      .catch(() => {});

    // Try fetching admin profile for pre-filling email
    fetch("/api/client/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.email && !recipientEmail) {
          setRecipientEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const activeTemplate = useMemo(() => {
    return EMAIL_TEMPLATE_CATALOG.find((t) => t.key === selectedKey) || EMAIL_TEMPLATE_CATALOG[0];
  }, [selectedKey]);

  const rendered = useMemo(() => {
    return activeTemplate.render({}, platformSettings);
  }, [activeTemplate, platformSettings]);

  const handleSendSample = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      setSendResult({ success: false, message: "Silakan masukkan alamat email yang valid." });
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/emails/preview-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: activeTemplate.key,
          recipientEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengirim sampel email.");
      }

      setSendResult({
        success: true,
        message: data.message || `Sampel "${activeTemplate.name}" berhasil dikirim ke ${recipientEmail}.`,
      });
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || "Terjadi kesalahan saat pengiriman email.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rendered.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const categories = ["ALL", "TRANSAKSI", "PERINGATAN", "SISTEM"] as const;
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const filteredCatalog = useMemo(() => {
    if (filterCategory === "ALL") return EMAIL_TEMPLATE_CATALOG;
    return EMAIL_TEMPLATE_CATALOG.filter((t) => t.category === filterCategory);
  }, [filterCategory]);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin?tab=settings&sub=integrations"
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition flex items-center justify-center border border-stone-700/60"
            title="Kembali ke Pengaturan Admin"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-wider uppercase text-amber-500 font-semibold">
                Control Panel Admin
              </span>
              <span className="text-stone-600 text-xs">/</span>
              <span className="text-xs text-stone-400">Template Email Transaksional</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
              <span>Galeri & Pratinjau Template Email</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Warm White Cream
              </span>
            </h1>
          </div>
        </div>

        {/* Global info pill */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800/60 border border-stone-700/50 text-xs text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>6 Template Terpasang</span>
          </div>
          <Link
            href="/admin?tab=settings&sub=integrations"
            className="px-3.5 py-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Konfigurasi SMTP</span>
          </Link>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: Template Catalog */}
        <aside className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-stone-800 bg-stone-950/40 p-4 sm:p-5 flex flex-col shrink-0">
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Pilih Template</h2>
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 ${
                    filterCategory === cat
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-stone-800/60 text-stone-400 hover:text-stone-200 border border-stone-800"
                  }`}
                >
                  {cat === "ALL" ? "Semua" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[40vh] lg:max-h-none">
            {filteredCatalog.map((tpl) => {
              const isSelected = tpl.key === selectedKey;
              return (
                <button
                  key={tpl.key}
                  onClick={() => {
                    setSelectedKey(tpl.key);
                    setSendResult(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-amber-950/20 border-amber-500/40 text-white shadow-sm ring-1 ring-amber-500/30"
                      : "bg-stone-900/60 hover:bg-stone-900 border-stone-800/80 text-stone-300 hover:border-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                        tpl.category === "TRANSAKSI"
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50"
                          : tpl.category === "PERINGATAN"
                          ? "bg-amber-950/40 text-amber-400 border-amber-800/50"
                          : "bg-sky-950/40 text-sky-400 border-sky-800/50"
                      }`}
                    >
                      {tpl.category}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">{tpl.badgeText}</span>
                  </div>

                  <div className="font-semibold text-xs sm:text-sm text-stone-100">{tpl.name}</div>
                  <div className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">{tpl.description}</div>
                </button>
              );
            })}
          </div>

          {/* Sidebar Note */}
          <div className="mt-4 pt-3 border-t border-stone-800/80 text-[11px] text-stone-500">
            Seluruh email dirender dengan palet Warm White Cream (`#F7F5F0`) & aksen Amber Gold (`#B45309`), konsisten di seluruh perangkat.
          </div>
        </aside>

        {/* Right Section: Workspace & Live Preview */}
        <main className="flex-1 flex flex-col bg-stone-900 overflow-y-auto">
          {/* Controls Bar */}
          <div className="border-b border-stone-800 bg-stone-950/60 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-400">Tampilan Pratinjau:</span>
              <div className="flex items-center bg-stone-900 rounded-xl p-0.5 border border-stone-800">
                <button
                  onClick={() => setViewport("desktop")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    viewport === "desktop"
                      ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Desktop (640px)</span>
                </button>
                <button
                  onClick={() => setViewport("mobile")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    viewport === "mobile"
                      ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Mobile (375px)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-stone-900 rounded-xl p-0.5 border border-stone-800">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "preview"
                      ? "bg-stone-800 text-white font-semibold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Visual UI
                </button>
                <button
                  onClick={() => setViewMode("code")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === "code"
                      ? "bg-stone-800 text-white font-semibold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Kode HTML
                </button>
              </div>

              {viewMode === "code" && (
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition flex items-center gap-1 border border-stone-700"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Salin HTML</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Template Info & Live Sender Banner */}
          <div className="p-4 sm:px-6 bg-stone-950/40 border-b border-stone-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">{activeTemplate.name}</h3>
                <span className="text-[11px] font-mono text-stone-500">({activeTemplate.key})</span>
              </div>
              <div className="text-xs text-stone-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong className="text-stone-300">Pemicu:</strong> {activeTemplate.triggerEvent}
                </span>
                <span>
                  <strong className="text-stone-300">Target:</strong> {activeTemplate.recipientTarget}
                </span>
              </div>
            </div>

            {/* Live Send Drawer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Kirim uji coba ke email..."
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="px-3.5 py-1.5 rounded-xl text-xs bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 w-full sm:w-64"
                />
              </div>
              <button
                type="button"
                onClick={handleSendSample}
                disabled={sending}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold transition shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Kirim Sampel Live</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Empirical Send Toast */}
          {sendResult && (
            <div
              className={`mx-4 sm:mx-6 mt-3 p-3 rounded-xl text-xs flex items-center justify-between border ${
                sendResult.success
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                  : "bg-rose-950/40 text-rose-300 border-rose-800/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${sendResult.success ? "bg-emerald-400" : "bg-rose-400"}`}
                ></span>
                <span>{sendResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSendResult(null)}
                className="text-stone-400 hover:text-white font-bold ml-3 text-sm"
              >
                ×
              </button>
            </div>
          )}

          {/* Subject Line Pill */}
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 shrink-0">Subjek:</span>
            <span className="text-xs font-medium text-stone-200 truncate">{rendered.subject}</span>
          </div>

          {/* Preview Container */}
          <div className="flex-1 p-4 sm:p-6 flex items-start justify-center overflow-auto">
            {viewMode === "preview" ? (
              <div
                className={`transition-all duration-300 rounded-2xl overflow-hidden border border-stone-700/60 shadow-2xl bg-white ${
                  viewport === "desktop" ? "w-full max-w-[640px]" : "w-full max-w-[375px]"
                }`}
                style={{ height: "780px" }}
              >
                {/* Simulated Email Client Header */}
                <div className="bg-stone-100 border-b border-stone-300 px-4 py-2 flex items-center justify-between text-[11px] text-stone-600 select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span>
                    <span className="ml-2 font-mono text-[10px] text-stone-500">Inbox Preview</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500">
                    {viewport === "desktop" ? "640 x 780" : "375 x 780"}
                  </span>
                </div>

                <iframe
                  title={`Preview ${activeTemplate.name}`}
                  srcDoc={rendered.html}
                  className="w-full h-full border-0 bg-[#F7F5F0]"
                  sandbox="allow-same-origin allow-popups"
                />
              </div>
            ) : (
              <div className="w-full max-w-4xl bg-stone-950 rounded-2xl border border-stone-800 p-4 overflow-x-auto text-stone-300 text-xs font-mono leading-relaxed max-h-[780px]">
                <pre>{rendered.html}</pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
