import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";
import { getDynamicServerRootDomain } from "@/lib/serverDomainUtils";
import { LandingInteractive } from "@/components/landing/LandingInteractive";
import "./landing.css";

export const revalidate = 86400; // Full cache 24 jam (ISR)

export default async function Home() {
  const {
    platformName,
    heroTagline,
    heroSubtitle,
    packages: pricingPackages,
    retentionInvitationGraceDays,
    retentionGalleryDefaultDays,
    serviceStatus,
  } = await getPublicPlatformSettings();

  const activeDomain = await getDynamicServerRootDomain();
  const brand = platformName || "Platform Undangan";
  const graceDays = retentionInvitationGraceDays || 7;
  const galleryRetention = retentionGalleryDefaultDays
    ? retentionGalleryDefaultDays >= 30 && retentionGalleryDefaultDays % 30 === 0
      ? `${retentionGalleryDefaultDays / 30} bulan`
      : `${retentionGalleryDefaultDays} hari`
    : "1 bulan";

  return (
    <div className="lux-landing-root min-h-screen selection:bg-[#C9A227]/30 selection:text-[#FBF8F2]">
      <LandingInteractive />

      {/* ===========================
           SERVICE STATUS NOTICE
      =========================== */}
      {serviceStatus && !serviceStatus.isOpen && (
        <aside aria-label="Pengumuman Status Layanan" className="w-full bg-[#18130e] border-b border-[#C9A227]/30 text-xs px-4 py-2.5 text-center text-[#e8ded1] flex items-center justify-center gap-2 z-[60] relative">
          <span className="w-2 h-2 rounded-full bg-[#C9A227] animate-pulse shrink-0" />
          <span className="font-semibold text-[#C9A227] uppercase tracking-wider text-[11px]">{serviceStatus.title}:</span>
          <span className="text-[#c7baa7] text-[11px] line-clamp-1">{serviceStatus.message}</span>
          {serviceStatus.contactWa && (
            <a
              href={`https://wa.me/${serviceStatus.contactWa.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C9A227] hover:underline font-bold ml-1 shrink-0 text-[11px]"
            >
              Info Antrean
            </a>
          )}
        </aside>
      )}

      {/* ===========================
           MOBILE MENU OVERLAY
      =========================== */}
      <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">
        <button id="close-menu" aria-label="Tutup menu">✕</button>
        <Link href="/demo">Koleksi</Link>
        <a href="#pengalaman">Pengalaman</a>
        <a href="#harga">Paket &amp; Harga</a>
        <Link href="/portfolio">Portofolio</Link>
        <Link href="/login" style={{ color: "var(--lux-gold)", marginTop: "1rem", fontSize: "1.1rem" }}>
          Mulai Sekarang
        </Link>
      </div>

      {/* ===========================
           NAVBAR
      =========================== */}
      <nav id="navbar" role="navigation" aria-label="Main navigation">
        <Link href="/" className="nav-logo" aria-label={`${brand} — Beranda`}>
          <BrandLogo size="sm" lightBg={false} showName brandName={brand} />
        </Link>
        <ul className="nav-links" role="list">
          <li><Link href="/demo">Koleksi</Link></li>
          <li><a href="#pengalaman">Pengalaman</a></li>
          <li><a href="#harga">Harga</a></li>
          <li><Link href="/portfolio">Portofolio</Link></li>
        </ul>
        <Link href="/login" className="nav-cta nav-cta-desktop">Mulai Sekarang</Link>
        <button className="nav-hamburger" id="hamburger-btn" aria-label="Buka menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </nav>

{/* ===========================
     HERO SECTION
=========================== */}
<section id="hero" aria-label="Hero">
  <div className="hero-bg" id="hero-bg">
    <picture>
      <source
        media="(max-width: 1023px)"
        srcSet="/assets/homepage/hero_mobile.webp"
      />
      <source
        media="(min-width: 1024px)"
        srcSet="/assets/homepage/hero_desktop.webp"
      />
      <img
        src="/assets/homepage/hero_desktop.webp"
        alt="Pasangan pengantin adat berbusana mewah"
        fetchPriority="high"
      />
    </picture>
  </div>
  <div className="hero-overlay"></div>

  <div className="hero-content">
    <h1 className="hero-heading">Your story,<br /><em>beautifully invited.</em></h1>
    <p className="hero-desc">Undangan digital berstandar editorial mewah. Menceritakan keindahan kisah cinta Anda dengan pengalaman interaktif, RSVP cerdas, dan sistem resepsionis modern.</p>
    <div className="hero-cta-group">
      <Link href="/demo" className="btn-primary" id="hero-cta-primary">
        <span>Jelajahi Koleksi</span>
      </Link>
      <a href="#pengalaman" className="btn-secondary">
        <span>Lihat Pengalaman</span>
      </a>
    </div>
  </div>

  {/* Hero Realistic Smartphone Showcase */}
  <div className="hero-phones" aria-hidden="true">
    <div className="phone-showcase-container">
      {/* Floating Badge Kiri Atas */}
      <div className="hero-float-pill float-pill-left">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <span>Desain Editorial Eksklusif</span>
      </div>

      {/* Floating Badge Kanan Bawah */}
      <div className="hero-float-pill float-pill-right">
        <span className="float-pill-dot"></span>
        <span>RSVP &amp; Resepsionis Digital</span>
      </div>

      {/* Left Companion Device (Mockup 1) */}
      <div className="phone-card-hero phone-left-hero">
        <div className="hero-companion-island"></div>
        <img src="/assets/homepage/hero_mockup_1.webp" alt="Preview Mockup 1" />
        <div className="screen-glare"></div>
      </div>

      {/* Center Realistic iPhone 16 Pro Mockup (Mockup 2) */}
      <div className="phone-card-hero phone-center-hero" id="hero-phone-center">
        {/* Dynamic Island */}
        <div className="hero-dynamic-island"></div>
        <img src="/assets/homepage/hero_mockup_2.webp" alt="Preview Mockup 2" />
        {/* Specular Screen Glare */}
        <div className="screen-glare"></div>
      </div>

      {/* Right Companion Device (Mockup 3) */}
      <div className="phone-card-hero phone-right-hero">
        <div className="hero-companion-island"></div>
        <img src="/assets/homepage/hero_mockup_3.webp" alt="Preview Mockup 3" />
        <div className="screen-glare"></div>
      </div>
    </div>
  </div>

  <div className="scroll-hint" aria-hidden="true">
    <span>Scroll to explore</span>
    <div className="scroll-arrow"></div>
  </div>
</section>

{/* ===========================
     KOLEKSI SECTION
=========================== */}
<section id="koleksi" aria-labelledby="koleksi-heading">
  <div className="koleksi-text">
    <p className="section-label reveal">Koleksi</p>
    <h2 className="koleksi-heading reveal reveal-delay-1" id="koleksi-heading">
      Desain Eksklusif<br />untuk Setiap Kisah
    </h2>
    <p className="koleksi-desc reveal reveal-delay-2">
      Dari yang modern hingga tradisional, setiap rancangan kami dibuat dengan detail untuk mencerminkan keunikan perjalanan cinta Anda.
    </p>
    <Link href="/demo" className="koleksi-link reveal reveal-delay-3">
      Lihat Semua Koleksi
    </Link>
  </div>

  <div className="koleksi-stage-wrap reveal reveal-delay-2">
    {/* Device Pair Showcase: Tablet di belakang + Phone di depan */}
    <div className="device-pair-showcase" id="koleksi-showcase">
      {/* Tablet (Desktop / Landscape) Mockup */}
      <div className="device-mockup-tablet">
        <div className="tablet-topbar">
          <div className="tablet-traffic">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="tablet-url-bar">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            {activeDomain}/demo
          </div>
          <div style={{ width: "28px" }}></div>
        </div>
        <div className="tablet-screen">
          <img id="tablet-img" src="/demo/aurelia/thumbnail_desktop.webp" alt="Koleksi Desktop" />
          <div className="screen-glare"></div>
        </div>
      </div>

      {/* Phone (Mobile / Portrait) Mockup Overlapping */}
      <div className="device-mockup-phone">
        <div className="phone-notch-bar"></div>
        <div className="phone-screen">
          <img id="phone-img" src="/demo/aurelia/thumbnail_mobile.webp" alt="Koleksi Mobile" />
          <div className="screen-glare"></div>
        </div>
      </div>
    </div>

    {/* Koleksi Controls & Theme Meta */}
    <div className="koleksi-controls">
      <div className="koleksi-meta">
        <div className="koleksi-theme-name" id="carousel-name">AURELIA</div>
        <div className="koleksi-theme-cat" id="carousel-category">MODERN · ROMANTIS</div>
      </div>
      <div className="koleksi-nav-row">
        <button className="koleksi-btn" id="carousel-prev" aria-label="Koleksi sebelumnya">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="koleksi-dots" id="carousel-dots"></div>
        <button className="koleksi-btn" id="carousel-next" aria-label="Koleksi berikutnya">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  </div>
</section>

{/* ===========================
     STUDIO MANDIRI (LIVE EDITING & LIVE PREVIEW SHOWCASE)
=========================== */}
<section id="studio" aria-labelledby="studio-heading">
  <div className="studio-container">
    {/* KIRI: Panggung Visual Dual-Device (Laptop Editor + Mobile Phone Preview Bersanding) */}
    <div className="studio-stage reveal">
      <div className="studio-stage-wrap">
        {/* Laptop / Desktop Frame di Belakang */}
        <div className="studio-laptop-frame">
          <div className="laptop-topbar">
            <div className="laptop-traffic">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="laptop-url-bar">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              studio.{activeDomain}/dashboard/invitation
            </div>
            <div className="laptop-status-chip">
              <span className="laptop-status-dot"></span>
              <span>LIVE SYNC</span>
            </div>
          </div>

          <div className="laptop-screen">
            {/* Screen Layer 0: Pilihan Tema & Palet Warna (Screenshot Asli Dasbor Klien) */}
            <div className="studio-screen-layer active" id="studio-screen-0">
              <div className="studio-theme-selector-ui">
                {/* Mini Sidebar Seksi Form */}
                <div className="studio-mini-sidebar">
                  <div className="mini-sidebar-header">DAFTAR SEKSI (1/13)</div>
                  <div className="mini-sidebar-item active">
                    <span className="mini-num">1</span>
                    <div className="mini-info">
                      <span className="mini-title">Tema &amp; Warna</span>
                      <span className="mini-sub">Dillalucky (Gold)</span>
                    </div>
                  </div>
                  <div className="mini-sidebar-item">
                    <span className="mini-num">2</span>
                    <div className="mini-info">
                      <span className="mini-title">Sampul &amp; Musik</span>
                    </div>
                  </div>
                  <div className="mini-sidebar-item">
                    <span className="mini-num">3</span>
                    <div className="mini-info">
                      <span className="mini-title">Profil Mempelai</span>
                      <span className="mini-sub">Eka &amp; Putri</span>
                    </div>
                  </div>
                </div>

                {/* Main Theme Grid Area */}
                <div className="studio-theme-grid-area">
                  <div className="studio-grid-header">
                    <span className="grid-header-title">1. Pilihan Seri Desain &amp; Palet Warna</span>
                    <div className="mini-cat-pills">
                      <span className="mini-cat">Modern 6</span>
                      <span className="mini-cat active">Traditional 6</span>
                    </div>
                  </div>

                  <div className="studio-cards-row">
                    {/* Card 1: Dillalucky (Terpilih dengan Centang) */}
                    <div className="studio-theme-card selected">
                      <div className="theme-card-badge">TRADITIONAL</div>
                      <div className="theme-card-check">✓</div>
                      <img src="/assets/homepage/studio_theme_dillalucky.webp" alt="Tema Dillalucky" />
                      <div className="theme-card-body">
                        <span className="theme-card-name">Dillalucky</span>
                        <span className="theme-card-tag">Terpilih</span>
                      </div>
                    </div>

                    {/* Card 2: Candani */}
                    <div className="studio-theme-card">
                      <div className="theme-card-badge">TRADITIONAL</div>
                      <img src="/assets/homepage/studio_theme_candani.webp" alt="Tema Candani" />
                      <div className="theme-card-body">
                        <span className="theme-card-name">Candani</span>
                        <span className="theme-card-tag">Pilih</span>
                      </div>
                    </div>

                    {/* Card 3: Badrika */}
                    <div className="studio-theme-card">
                      <div className="theme-card-badge">TRADITIONAL</div>
                      <img src="/assets/homepage/studio_theme_badrika.webp" alt="Tema Badrika" />
                      <div className="theme-card-body">
                        <span className="theme-card-name">Badrika</span>
                        <span className="theme-card-tag">Pilih</span>
                      </div>
                    </div>
                  </div>

                  {/* Palette Selector Bar */}
                  <div className="studio-palette-row">
                    <span className="palette-label">NUANSA WARNA:</span>
                    <div className="palette-chip active">
                      <span className="palette-dot dot-gold"></span>
                      <span>Royal Champagne Gold</span>
                    </div>
                    <div className="palette-chip">
                      <span className="palette-dot dot-emerald"></span>
                      <span>Emerald Green</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Layer 1: Mode Visual Click-to-Edit (Screenshot Asli Live Editor Canvas) */}
            <div className="studio-screen-layer" id="studio-screen-1">
              <div className="studio-live-canvas-ui">
                {/* Instruction Banner Hijau Asli */}
                <div className="live-canvas-instruction">
                  <span className="inst-dot"></span>
                  <span>Mode Visual Click-to-Edit: Klik langsung teks/sampul di atas kanvas untuk mengubah</span>
                </div>

                {/* Canvas Area with Phone Simulator inside */}
                <div className="live-canvas-viewport">
                  <div className="canvas-simulated-phone">
                    <div className="sim-inv-date">20 / 10 · 2026</div>
                    <div className="sim-inv-eyebrow">THE WEDDING OF</div>
                    <h4 className="sim-inv-title">Eka &amp; Putri</h4>
                    <div className="sim-inv-quote">
                      Dengan penuh rasa syukur dan sukacita kami mengundang Anda
                    </div>
                    <div className="sim-inv-btn">BUKA</div>
                    <div className="sim-inv-qr">QR CHECK-IN</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Layer 2: Manajemen Buku Tamu & WhatsApp Link */}
            <div className="studio-screen-layer" id="studio-screen-2">
              <div className="studio-editor-mockup">
                <div className="editor-header">
                  <span className="editor-tab-badge">DAFTAR TAMU &amp; WHATSAPP</span>
                  <span className="editor-save-state">300 Tamu Terdaftar</span>
                </div>
                <div className="editor-guest-table">
                  <div className="guest-row-mockup">
                    <div className="guest-avatar">AF</div>
                    <div className="guest-meta">
                      <span className="guest-name">Bpk. Ahmad Fauzan &amp; Istri</span>
                      <span className="guest-tag">VIP · Meja 04 · Kuota 2 Tamu</span>
                    </div>
                    <button className="guest-btn-wa">Kirim WA</button>
                  </div>
                  <div className="guest-row-mockup">
                    <div className="guest-avatar">RP</div>
                    <div className="guest-meta">
                      <span className="guest-name">dr. Rina Puspita</span>
                      <span className="guest-tag">Sahabat · Kuota 1 Tamu</span>
                    </div>
                    <button className="guest-btn-wa">Kirim WA</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="screen-glare"></div>
          </div>
        </div>

        {/* Mobile Phone Frame di Depan (Dasbor Klien Versi Mobile Faktual) */}
        <div className="studio-phone-frame">
          <div className="phone-notch-bar"></div>
          
          {/* Mini Header Dasbor Klien di Mobile */}
          <div className="phone-dashboard-header">
            <div className="phone-db-brand">
              <span className="phone-db-logo">LK</span>
              <span className="phone-db-title">Dasbor Klien</span>
            </div>
            <span className="phone-db-user">Nama Akun</span>
          </div>

          <div className="phone-screen">
            {/* Mobile Dashboard Layer 0: Tema & Warna */}
            <div className="studio-phone-layer active" id="studio-phone-0">
              <div className="phone-db-content">
                <div className="phone-section-chip">1. Tema &amp; Nuansa (1/13)</div>
                <div className="phone-theme-preview">
                  <span className="phone-theme-badge">TRADITIONAL</span>
                  <span className="phone-theme-check">✓</span>
                  <img src="/assets/homepage/studio_theme_dillalucky.webp" alt="Tema Dillalucky" />
                  <div className="phone-theme-info">
                    <span className="phone-theme-title">Dillalucky</span>
                    <span className="phone-theme-status">Terpilih</span>
                  </div>
                </div>
                <div className="phone-palette-pill">
                  <span className="phone-palette-dot dot-gold" style={{ background: "#d4af37" }}></span>
                  <span>Royal Champagne Gold</span>
                </div>
              </div>
            </div>

            {/* Mobile Dashboard Layer 1: Live Click-to-Edit Canvas */}
            <div className="studio-phone-layer" id="studio-phone-1">
              <div className="phone-db-content">
                <div className="phone-edit-instruction">
                  <span className="phone-edit-dot"></span>
                  <span>Sentuh teks untuk ubah</span>
                </div>
                <div className="phone-canvas-box">
                  <span className="phone-canvas-date">20 / 10 · 2026</span>
                  <span className="phone-canvas-eyebrow">THE WEDDING OF</span>
                  <h4 className="phone-canvas-title">Eka &amp; Putri</h4>
                  <div className="phone-canvas-btn">BUKA UNDANGAN</div>
                </div>
                <div className="phone-save-chip">✓ Tersimpan Otomatis</div>
              </div>
            </div>

            {/* Mobile Dashboard Layer 2: Buku Tamu & WhatsApp */}
            <div className="studio-phone-layer" id="studio-phone-2">
              <div className="phone-db-content">
                <div className="phone-section-chip">Buku Tamu (300 Tamu)</div>
                <div className="phone-guest-card">
                  <div className="phone-guest-top">
                    <span className="phone-guest-avatar">AF</span>
                    <div className="phone-guest-details">
                      <span className="phone-guest-name">Bpk. Ahmad Fauzan</span>
                      <span className="phone-guest-badge">VIP · Meja 04</span>
                    </div>
                  </div>
                  <button className="phone-guest-btn">Kirim WA</button>
                </div>
                <div className="phone-guest-card">
                  <div className="phone-guest-top">
                    <span className="phone-guest-avatar">RP</span>
                    <div className="phone-guest-details">
                      <span className="phone-guest-name">dr. Rina Puspita</span>
                      <span className="phone-guest-badge">Sahabat</span>
                    </div>
                  </div>
                  <button className="phone-guest-btn">Kirim WA</button>
                </div>
              </div>
            </div>

            {/* Mini Floating Dock di Bagian Bawah Layar HP */}
            <div className="phone-mini-dock">
              <span className="phone-dock-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              </span>
              <span className="phone-dock-icon active">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </span>
              <span className="phone-dock-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </span>
              <span className="phone-dock-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </span>
            </div>

            <div className="screen-glare"></div>
          </div>
        </div>
      </div>

      {/* Apple-Style Floating Liquid Glass Dock Pengontrol Interaktif */}
      <div className="studio-floating-dock-wrap">
        <div className="studio-liquid-dock" role="tablist" aria-label="Navigasi Fitur Studio">
          {/* Dock 0: Tema */}
          <button className="studio-dock-btn active" role="tab" id="studio-tab-0" aria-selected="true" data-studio="0" title="Pilihan Tema & Palet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="dock-active-dot"></span>
            <span className="dock-tooltip">Pilihan Tema</span>
          </button>

          {/* Dock 1: Live Studio Editor */}
          <button className="studio-dock-btn" role="tab" id="studio-tab-1" aria-selected="false" data-studio="1" title="Studio Live Editor">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="dock-active-dot"></span>
            <span className="dock-tooltip">Live Editor</span>
          </button>

          {/* Dock 2: Buku Tamu & WhatsApp */}
          <button className="studio-dock-btn" role="tab" id="studio-tab-2" aria-selected="false" data-studio="2" title="Buku Tamu & WhatsApp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="dock-active-dot"></span>
            <span className="dock-tooltip">Buku Tamu</span>
          </button>
        </div>
      </div>
    </div>

    {/* KANAN: Text Narrative Bersih & Lapang (Tanpa Kotak-Kotak Bertumpuk) */}
    <div className="studio-content reveal reveal-delay-1">
      <p className="section-label" style={{ color: "var(--lux-muted-gold)" }}>STUDIO MANDIRI</p>
      <h2 className="studio-heading" id="studio-heading">
        Rancang Sendiri Undangan Anda,<br />Langsung Jadi Tanpa Nunggu Admin
      </h2>
      <p className="studio-desc">
        Ubah foto prewedding, susunan acara, hingga alunan musik orkestra semudah mengetik pesan di ponsel. Setiap sentuhan langsung tampak nyata detik itu juga di layar smartphone tamu Anda.
      </p>

      {/* Ramping Inline Badges (Bebas dari Kotak Hitam Ramai) */}
      <div className="studio-pill-row">
        <span className="studio-badge-pill">✦ Live Editing Seketika</span>
        <span className="studio-badge-pill">✦ Bebas Ubah Kapan Saja</span>
        <span className="studio-badge-pill">✦ Nama Tamu Otomatis</span>
      </div>

      <div className="studio-cta-wrap">
        <Link href="/how-it-works" className="btn-primary" id="studio-cta-guide">
          <span>Pelajari Cara Kerja</span>
        </Link>
      </div>
    </div>
  </div>
</section>

{/* ===========================
     PENGALAMAN / FEATURE SECTION
=========================== */}
<section id="pengalaman" aria-labelledby="pengalaman-heading">
  {/* Scroll Indicator on left edge (identik dengan gambar referensi) */}
  <div className="exp-scroll-indicator" aria-hidden="true">
    <span>Scroll</span>
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
      <path d="M5 1v12M1 9l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>

  <div className="exp-container">
    {/* KIRI: 3D Isometric iPad Stage */}
    <div className="exp-stage reveal">
      <div className="exp-ipad-wrapper" id="exp-phone-wrapper">
        <div className="exp-ipad-3d" id="exp-phone">
          <div className="exp-ipad-camera"></div>
          
          {/* Screen Container dengan 4 layered feature screens */}
          <div className="exp-screen">
            {/* Screen 0: RSVP Landscape Split */}
            <div className="exp-screen-layer" id="exp-screen-0">
              <div className="exp-rsvp-split">
                <div className="exp-rsvp-cover">
                  <img src="/assets/homepage/exp_rsvp_cover.webp" alt="Wedding Couple" />
                  <div className="exp-rsvp-cover-overlay"></div>
                  <div className="exp-rsvp-cover-text">
                    <span className="exp-rsvp-tag">THE WEDDING OF</span>
                    <h3 className="exp-rsvp-names">Syahril &amp; Elyana</h3>
                    <span className="exp-rsvp-date">12 . 08 . 2025 · MAKASSAR</span>
                  </div>
                </div>
                <div className="exp-rsvp-form-side">
                  <span className="exp-form-eyebrow">RSVP DIGITAL</span>
                  <h4 className="exp-form-title">Konfirmasi Kehadiran</h4>
                  <div className="exp-form-guest">Ahmad Fauzan · Kuota 2 Tamu</div>
                  <div className="exp-rsvp-toggle">
                    <div className="exp-rsvp-btn active">Hadir (2 Tamu)</div>
                    <div className="exp-rsvp-btn">Tidak Hadir</div>
                  </div>
                  <div className="exp-rsvp-input-box">
                    Selamat untuk Syahril &amp; Elyana! Insya Allah kami hadir merayakan momen bahagia.
                  </div>
                  <button className="exp-rsvp-submit-btn">Kirim Konfirmasi Kehadiran</button>
                </div>
              </div>
            </div>

            {/* Screen 1: Guest Moment Camera (Virtual Disposable Camera UI) */}
            <div className="exp-screen-layer active" id="exp-screen-1">
              <div className="exp-cam-kiosk">
                {/* Topbar Kamera Virtual */}
                <div className="exp-cam-topbar">
                  <div className="exp-cam-brand">
                    <div className="exp-cam-lens-icon">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                    </div>
                    <div>
                      <span className="exp-cam-title">GUEST CAMERA</span>
                      <span className="exp-cam-sub">Virtual Disposable Camera · Syahril &amp; Elyana</span>
                    </div>
                  </div>
                  <div className="exp-cam-status">
                    <div className="exp-cam-live">
                      <span className="exp-cam-pulse-dot"></span>
                      <span>LIVE · SESI RESEPSI</span>
                    </div>
                    <div className="exp-cam-roll-pill">
                      <span>ROLL 08/10</span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Camera Grid */}
                <div className="exp-cam-grid">
                  {/* Kolom Kiri: Kamera Viewfinder Chassis */}
                  <div className="exp-cam-view-card">
                    <div className="exp-cam-view-header">
                      <span className="exp-cam-preset-badge">AURA &apos;90S • VINTAGE WARM</span>
                      <div className="exp-cam-hud-pills">
                        <span className="exp-cam-flash-tag">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          FLASH AUTO
                        </span>
                        <span className="exp-cam-zoom-tag">1x</span>
                      </div>
                    </div>

                    <div className="exp-cam-view-frame" id="exp-cam-viewport">
                      {/* 4 Corner Brackets */}
                      <div className="cam-bracket cam-tl"></div>
                      <div className="cam-bracket cam-tr"></div>
                      <div className="cam-bracket cam-bl"></div>
                      <div className="cam-bracket cam-br"></div>

                      {/* Center Focus Crosshair */}
                      <div className="exp-cam-crosshair">+</div>

                      {/* Live Candid Photo */}
                      <img
                        src="/assets/homepage/exp_rsvp_cover.webp"
                        alt="Candid Wedding Moment"
                        className="exp-cam-view-img"
                        id="exp-cam-preview-img"
                      />

                      {/* Vignette Overlay */}
                      <div className="exp-cam-vignette"></div>

                      {/* Retro LED Date Stamp */}
                      <div className="exp-cam-led-stamp">12  08  &apos;25</div>

                      {/* Flash Burst Overlay */}
                      <div className="exp-cam-flash-overlay" id="exp-cam-flash"></div>
                    </div>

                    <div className="exp-cam-view-footer">
                      <span>ISO 400 · 35MM F/2.8</span>
                      <span style={{ color: "var(--lux-gold)" }}>• Kamera Siaga</span>
                    </div>
                  </div>

                  {/* Kolom Kanan: Film Roll Deck & Controls */}
                  <div className="exp-cam-controls-col">
                    {/* Panel Sisa Roll & Tamu */}
                    <div className="exp-cam-roll-card">
                      <div className="exp-cam-guest-row">
                        <span className="exp-cam-guest-title">Ahmad Fauzan &amp; Istri</span>
                        <div className="exp-cam-roll-badge">
                          <span className="exp-cam-roll-num" id="exp-cam-count">08</span>
                          <span className="exp-cam-roll-total">/ 10 Sisa Roll</span>
                        </div>
                      </div>
                      <div className="exp-cam-guest-msg">
                        &ldquo;Momen haru saat sungkeman, bahagia selalu sahabatku!&rdquo;
                      </div>
                    </div>

                    {/* Filter Selector */}
                    <div className="exp-cam-filter-card">
                      <span className="exp-cam-filter-header">Preset Filter Analog</span>
                      <div className="exp-cam-filter-list">
                        <button type="button" className="exp-cam-filter-item active" data-filter="aura_90s">Aura &apos;90s</button>
                        <button type="button" className="exp-cam-filter-item" data-filter="heritage">Heritage</button>
                        <button type="button" className="exp-cam-filter-item" data-filter="botanical">Botanical</button>
                        <button type="button" className="exp-cam-filter-item" data-filter="cinema_noir">Noir</button>
                        <button type="button" className="exp-cam-filter-item" data-filter="daylight">Daylight</button>
                      </div>
                    </div>

                    {/* Shutter Action Panel */}
                    <div className="exp-cam-action-card">
                      <div className="exp-cam-shutter-wrap">
                        <div className="exp-cam-shutter-circle" id="exp-cam-shutter" title="Tekan untuk simulasi jepret">
                          <div className="exp-cam-shutter-inner"></div>
                        </div>
                        <div className="exp-cam-shutter-info">
                          <span className="exp-cam-shutter-label">Tekan Shutter</span>
                          <span className="exp-cam-shutter-sub">Auto-upload ke R2</span>
                        </div>
                      </div>
                      <div className="exp-cam-winder">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <span>Putar Roll</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen 2: QR Check-in & Authentic Receptionist Kiosk */}
            <div className="exp-screen-layer" id="exp-screen-2">
              <div className="exp-rec-kiosk">
                {/* Topbar Resepsionis persis /demo/receptionist */}
                <div className="exp-rec-topbar">
                  <div className="exp-rec-brand">
                    <div className="exp-rec-logo-dot">L</div>
                    <span className="exp-rec-title">RECEPTIONIST SYSTEM</span>
                  </div>
                  <div className="exp-rec-status">
                    <div className="exp-rec-live">
                      <span className="exp-rec-pulse-dot"></span>
                      <span>LIVE ONLINE</span>
                    </div>
                    <span className="exp-rec-clock">19:15 WIB</span>
                  </div>
                </div>

                {/* 2-Column Receptionist Body */}
                <div className="exp-rec-grid">
                  {/* Kolom Kiri: Kamera Viewport Scanner */}
                  <div className="exp-rec-cam-card">
                    <div className="exp-rec-card-header">
                      <span className="exp-rec-cam-title">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        KAMERA LIVE
                      </span>
                      <span className="exp-rec-cam-mode">AUTO-DETECT</span>
                    </div>
                    <div className="exp-rec-cam-view">
                      {/* 4 Corner Brackets */}
                      <div className="cam-bracket cam-tl"></div>
                      <div className="cam-bracket cam-tr"></div>
                      <div className="cam-bracket cam-bl"></div>
                      <div className="cam-bracket cam-br"></div>
                      
                      {/* Animated Amber Laser Scanline */}
                      <div className="exp-rec-laser"></div>
                      
                      {/* Crisp QR Code SVG */}
                      <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                        <rect x="5" y="5" width="26" height="26" stroke="#fbbf24" strokeWidth="2.5" rx="3"/>
                        <rect x="11" y="11" width="14" height="14" fill="#fbbf24"/>
                        <rect x="69" y="5" width="26" height="26" stroke="#fbbf24" strokeWidth="2.5" rx="3"/>
                        <rect x="75" y="11" width="14" height="14" fill="#fbbf24"/>
                        <rect x="5" y="69" width="26" height="26" stroke="#fbbf24" strokeWidth="2.5" rx="3"/>
                        <rect x="11" y="75" width="14" height="14" fill="#fbbf24"/>
                        <rect x="36" y="8" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="50" y="14" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="36" y="24" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="42" y="38" width="8" height="8" fill="#fbbf24" opacity="0.95"/>
                        <rect x="14" y="42" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="56" y="48" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="74" y="42" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="42" y="58" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="62" y="66" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                        <rect x="80" y="74" width="8" height="8" fill="#fbbf24" opacity="0.95"/>
                        <rect x="42" y="78" width="8" height="8" fill="#fbbf24" opacity="0.85"/>
                      </svg>
                    </div>
                    <div className="exp-rec-cam-hint">Arahkan QR Tamu ke Kotak Kamera</div>
                  </div>

                  {/* Kolom Kanan: Hasil Check-in & Counter */}
                  <div className="exp-rec-result-card">
                    <div className="exp-rec-guest-panel">
                      <div className="exp-rec-success-badge">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        CHECK-IN BERHASIL
                      </div>
                      <div className="exp-rec-guest-name">Bpk. Ahmad Fauzan &amp; Istri</div>
                      <div className="exp-rec-pills-row">
                        <span className="exp-rec-pill-vip">VIP</span>
                        <span className="exp-rec-pill-meta">MEJA 04</span>
                        <span className="exp-rec-pill-meta">2 PAX</span>
                      </div>
                      <div className="exp-rec-souvenir-row">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>1 Paket Souvenir Diberikan</span>
                      </div>
                    </div>

                    <div className="exp-rec-stats-panel">
                      <div className="exp-rec-stats-header">
                        <span>Tamu Hadir</span>
                        <strong>248 / 300 (82%)</strong>
                      </div>
                      <div className="exp-rec-progress">
                        <div className="exp-rec-progress-fill" style={{ width: "82%" }}></div>
                      </div>
                      <div className="exp-rec-stats-sub">
                        <span>24 / 30 Meja Terisi</span>
                        <span>• Siaga Scan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen 3: Galeri Kenangan Tamu (/memories) */}
            <div className="exp-screen-layer" id="exp-screen-3">
              <div className="exp-memories-pure">
                {/* Top Navbar: Brand + Title + Badge */}
                <div className="exp-mem-navbar">
                  <div className="exp-mem-nav-left">
                    <div className="exp-mem-nav-logo">L</div>
                    <div>
                      <div className="exp-mem-nav-title">GALERI KENANGAN TAMU</div>
                      <div className="exp-mem-nav-sub">Photo Stream &amp; Guestbook · Syahril &amp; Elyana</div>
                    </div>
                  </div>
                  <div className="exp-mem-counter-badge">
                    <span className="exp-mem-pulse"></span>
                    <span>48 Momen Terkumpul</span>
                  </div>
                </div>

                {/* Story Circles Highlights (Instagram Style) */}
                <div className="exp-mem-story-section">
                  <div className="exp-mem-story-header">
                    <span className="exp-mem-story-header-dot"></span>
                    <span>Sorotan Cerita Tamu</span>
                  </div>
                  <div className="exp-mem-story-rail">
                    <div className="exp-mem-story-unit">
                      <div className="exp-mem-story-circle">
                        <img src="/assets/homepage/exp_memory_01.webp" alt="Dimas" />
                      </div>
                      <span className="exp-mem-story-name">Dimas</span>
                    </div>
                    <div className="exp-mem-story-unit">
                      <div className="exp-mem-story-circle">
                        <img src="/assets/homepage/exp_memory_02.webp" alt="Rina" />
                      </div>
                      <span className="exp-mem-story-name">Rina</span>
                    </div>
                    <div className="exp-mem-story-unit">
                      <div className="exp-mem-story-circle">
                        <img src="/assets/homepage/exp_memory_03.webp" alt="Maryam" />
                      </div>
                      <span className="exp-mem-story-name">Maryam</span>
                    </div>
                    <div className="exp-mem-story-unit">
                      <div className="exp-mem-story-circle">
                        <img src="/assets/homepage/exp_memory_04.webp" alt="Bridesmaids" />
                      </div>
                      <span className="exp-mem-story-name">Brides</span>
                    </div>
                    <div className="exp-mem-story-unit">
                      <div className="exp-mem-story-circle">
                        <img src="/assets/homepage/exp_memory_01.webp" alt="Teknik" />
                      </div>
                      <span className="exp-mem-story-name">Teknik</span>
                    </div>
                    <div className="exp-mem-story-unit">
                      <div className="exp-mem-story-circle">
                        <img src="/assets/homepage/exp_memory_02.webp" alt="Keluarga" />
                      </div>
                      <span className="exp-mem-story-name">Keluarga</span>
                    </div>
                  </div>
                </div>

                {/* 4-Column Photo Grid: Pure Guest Photos & Messages */}
                <div className="exp-mem-grid-4">
                  <div className="exp-mem-card-pure">
                    <div className="exp-mem-card-thumb">
                      <img src="/assets/homepage/exp_memory_01.webp" alt="Momen Dimas" />
                    </div>
                    <div className="exp-mem-card-body">
                      <div className="exp-mem-card-author">Dimas Pratama &amp; Keluarga</div>
                      <div className="exp-mem-card-msg">&ldquo;Selamat berbahagia Syahril &amp; Elyana! Sakinah mawaddah warahmah selamanya.&rdquo;</div>
                      <div className="exp-mem-card-footer">
                        <span>19:30 WIB</span>
                        <span className="exp-mem-like-chip">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> 14
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="exp-mem-card-pure">
                    <div className="exp-mem-card-thumb">
                      <img src="/assets/homepage/exp_memory_02.webp" alt="Momen Rina" />
                    </div>
                    <div className="exp-mem-card-body">
                      <div className="exp-mem-card-author">Rina &amp; Sahabat SMA</div>
                      <div className="exp-mem-card-msg">&ldquo;Cantik dan ganteng banget berdua malam ini! Terharu liat akad tadi.&rdquo;</div>
                      <div className="exp-mem-card-footer">
                        <span>19:42 WIB</span>
                        <span className="exp-mem-like-chip">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> 21
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="exp-mem-card-pure">
                    <div className="exp-mem-card-thumb">
                      <img src="/assets/homepage/exp_memory_03.webp" alt="Momen Maryam" />
                    </div>
                    <div className="exp-mem-card-body">
                      <div className="exp-mem-card-author">Keluarga Tante Maryam</div>
                      <div className="exp-mem-card-msg">&ldquo;Barakallahu lakuma wa baraka alaikuma. Doa terbaik untuk kalian berdua.&rdquo;</div>
                      <div className="exp-mem-card-footer">
                        <span>20:05 WIB</span>
                        <span className="exp-mem-like-chip">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> 9
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="exp-mem-card-pure">
                    <div className="exp-mem-card-thumb">
                      <img src="/assets/homepage/exp_memory_04.webp" alt="Momen Bpk Bambang" />
                    </div>
                    <div className="exp-mem-card-body">
                      <div className="exp-mem-card-author">Geng Teknik (Rekan Kerja)</div>
                      <div className="exp-mem-card-msg">&ldquo;Happy wedding brother! Akhirnya berlabuh di pelabuhan terakhir.&rdquo;</div>
                      <div className="exp-mem-card-footer">
                        <span>20:20 WIB</span>
                        <span className="exp-mem-like-chip">
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> 18
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Dock inside iPad Bottom */}
            <div className="exp-ipad-dock" aria-hidden="true">
              <div className="exp-dock-item" data-dock="0">
                <div className="exp-dock-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><polyline points="7 10 12 14 17 10"/></svg>
                </div>
                <span>RSVP</span>
              </div>
              <div className="exp-dock-item active" data-dock="1">
                <div className="exp-dock-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <span>Guest Camera</span>
              </div>
              <div className="exp-dock-item" data-dock="2">
                <div className="exp-dock-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3z"/></svg>
                </div>
                <span>QR Resepsionis</span>
              </div>
              <div className="exp-dock-item" data-dock="3">
                <div className="exp-dock-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <span>Memories</span>
              </div>
            </div>

            {/* Specular Glare */}
            <div className="screen-glare"></div>
          </div>
        </div>
      </div>
    </div>

    {/* KANAN: Text Narrative & Interactive Icon Dock */}
    <div className="exp-content reveal reveal-delay-1">
      <p className="section-label" style={{ color: "var(--lux-muted-gold)" }}>PENGALAMAN</p>
      <h2 className="exp-heading" id="pengalaman-heading">
        Lebih dari Sekadar<br />Undangan
      </h2>
      <p className="exp-desc">
        Kami menghadirkan pengalaman lengkap untuk Anda dan para tamu, dari undangan pertama hingga hari istimewa tiba.
      </p>

      {/* 4 Feature Icon Buttons (Guest Moment Camera Aktif Pertama) */}
      <div className="exp-icon-dock" role="tablist" aria-label="Pilih Fitur Pengalaman">
        <button className="exp-icon-btn" role="tab" id="exp-tab-0" aria-selected="false" data-exp="0">
          <div className="exp-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <polyline points="7 10 12 14 17 10"/>
            </svg>
          </div>
          <div className="exp-icon-info">
            <span className="exp-icon-title">RSVP</span>
            <span className="exp-icon-sub">Konfirmasi Kehadiran</span>
          </div>
        </button>

        <button className="exp-icon-btn active" role="tab" id="exp-tab-1" aria-selected="true" data-exp="1">
          <div className="exp-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className="exp-icon-info">
            <span className="exp-icon-title">Guest Camera</span>
            <span className="exp-icon-sub">Kamera Saku Tamu</span>
          </div>
        </button>

        <button className="exp-icon-btn" role="tab" id="exp-tab-2" aria-selected="false" data-exp="2">
          <div className="exp-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
            </svg>
          </div>
          <div className="exp-icon-info">
            <span className="exp-icon-title">QR Check-in</span>
            <span className="exp-icon-sub">Sistem Resepsionis</span>
          </div>
        </button>

        <button className="exp-icon-btn" role="tab" id="exp-tab-3" aria-selected="false" data-exp="3">
          <div className="exp-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className="exp-icon-info">
            <span className="exp-icon-title">Memories</span>
            <span className="exp-icon-sub">Galeri Kenangan Tamu</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</section>

{/* ===========================
     BUDAYA / CULTURAL SECTION
=========================== */}
<section id="budaya" aria-labelledby="budaya-heading">
  <div className="budaya-header">
    <p className="section-label reveal" style={{ color: "var(--lux-muted-gold)" }}>Koleksi</p>
    <h2 className="budaya-heading reveal reveal-delay-1" id="budaya-heading">
      Temukan Gaya yang<br />Sesuai dengan Cerita Anda
    </h2>
    <p className="budaya-desc reveal reveal-delay-2">
      Dari modern minimalis hingga kaya tradisi budaya, undangan Anda harus terasa seperti kisah Anda sendiri.
    </p>
  </div>
  <div className="budaya-grid">
    <div className="budaya-card reveal">
      <img src="/assets/homepage/showcase_cultural.webp" alt="Koleksi budaya — undangan adat Bugis, Jawa, Minang, Bali" loading="lazy" />
      <div className="budaya-card-overlay">
        <div className="budaya-card-name">Cultural</div>
        <div className="budaya-card-sub">Bugis · Jawa · Minang · Bali</div>
      </div>
    </div>
    <div className="budaya-card reveal reveal-delay-1">
      <img src="/assets/homepage/showcase_modern.webp" alt="Koleksi modern — minimal, editorial, kontemporer" loading="lazy" />
      <div className="budaya-card-overlay">
        <div className="budaya-card-name">Modern</div>
        <div className="budaya-card-sub">Minimal · Editorial · Contemporary</div>
      </div>
    </div>
    <div className="budaya-card reveal reveal-delay-2">
      <img src="/assets/homepage/showcase_romantic.webp" alt="Koleksi romantis — lembut, intim, floral" loading="lazy" />
      <div className="budaya-card-overlay">
        <div className="budaya-card-name">Romantic</div>
        <div className="budaya-card-sub">Soft · Intimate · Floral</div>
      </div>
    </div>
  </div>
</section>


      {/* ===========================
           PRICING SECTION (DYNAMIC DATABASE)
      =========================== */}
      <section id="harga" aria-labelledby="harga-heading">
        <div className="harga-inner">
          <div className="harga-text">
            <p className="section-label reveal">Harga</p>
            <h2 className="harga-heading reveal reveal-delay-1" id="harga-heading">
              Pilih Paket yang Sesuai dengan Cerita Anda
            </h2>
            <p className="harga-desc reveal reveal-delay-2">
              Biaya satu kali bayar dengan masa aktif tautan undangan &amp; galeri kenangan hingga 30 hari pasca-acara, dan portofolio resmi permanen.
            </p>
            <Link href="/demo?tab=features" className="harga-detail-link reveal reveal-delay-3">
              Lihat Detail Fitur
            </Link>
          </div>

          <div className="pricing-cards">
            {pricingPackages && pricingPackages.length > 0 ? (
              pricingPackages.map((pkg, idx) => {
                const delayClass = idx === 0 ? "" : idx === 1 ? "reveal-delay-1" : "reveal-delay-2";
                const isK = pkg.price >= 1000;
                const displayNum = isK ? Math.round(pkg.price / 1000) : pkg.price;
                return (
                  <div
                    key={pkg.id}
                    className={`pricing-card reveal ${delayClass} ${pkg.isFeatured ? "featured" : ""}`}
                  >
                    {pkg.badge && <div className="pricing-badge">{pkg.badge}</div>}
                    <div className="pricing-name">{pkg.name}</div>
                    <div className="pricing-price">
                      {displayNum}
                      {isK && <span style={{ fontSize: "1.5rem" }}>K</span>}
                    </div>
                    <ul className="pricing-features" aria-label={`Fitur ${pkg.name}`}>
                      {pkg.features.map((f, fIdx) => (
                        <li key={fIdx}>{f}</li>
                      ))}
                    </ul>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-[#9B948A]">Memuat paket...</div>
            )}
          </div>
        </div>
      </section>

{/* ===========================
     FINAL CTA SECTION
=========================== */}
<section id="cta" aria-labelledby="cta-heading">
  <div className="cta-bg">
    <picture>
      <source media="(max-width: 1023px)" srcSet="/assets/homepage/cta_mobile.webp" />
      <source media="(min-width: 1024px)" srcSet="/assets/homepage/cta_desktop.webp" />
      <img
        src="/assets/homepage/cta_desktop.webp"
        alt="Pasangan pengantin di momen golden hour"
        loading="lazy"
      />
    </picture>
  </div>
  <div className="cta-overlay"></div>
  <div className="cta-content">
    <p className="cta-eyebrow reveal">{brand}</p>
    <h2 className="cta-heading reveal reveal-delay-1" id="cta-heading">
      Your day deserves<br />a beautiful beginning.
    </h2>
    <p className="cta-desc reveal reveal-delay-2">
      Buat undangan pernikahan digital Anda sekarang dan mulai bercerita dengan cara yang paling indah.
    </p>
    <Link href="/login" className="btn-cta reveal reveal-delay-3" id="cta-main-btn">
      Mulai Kisahmu
    </Link>
  </div>
</section>


      {/* ===========================
           FOOTER
      =========================== */}
      <footer className="landing-footer">
        {/* Row 1: Brand + Nav Links */}
        <div className="footer-row-top">
          <div>
            <div className="footer-brand">{brand}</div>
            <div className="footer-tagline">Digital Wedding Invitation</div>
          </div>
          <ul className="footer-links-nav" role="list">
            <li><Link href="/demo">Koleksi</Link></li>
            <li><a href="#pengalaman">Pengalaman</a></li>
            <li><a href="#harga">Harga</a></li>
            <li><Link href="/portfolio">Portofolio</Link></li>
            <li><Link href="/contact">Kontak</Link></li>
          </ul>
        </div>

        {/* Row 2: Legal Links + Copyright */}
        <div className="footer-row-bottom">
          <ul className="footer-links-legal" role="list">
            <li><Link href="/terms">Syarat &amp; Ketentuan</Link></li>
            <li><Link href="/privacy">Kebijakan Privasi</Link></li>
            <li><Link href="/refund">Pengembalian Dana</Link></li>
          </ul>
          <div className="footer-copy">
            © {new Date().getFullYear()} {brand}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
