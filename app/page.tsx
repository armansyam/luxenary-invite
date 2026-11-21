import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { getPublicPlatformSettings } from "@/lib/settings";
import { getDynamicServerRootDomain } from "@/lib/serverDomainUtils";
import { LandingInteractive } from "@/components/landing/LandingInteractive";
import { getShowcaseThemes } from "@/lib/landingShowcase";
import { getLandingPortfolioPreview } from "@/lib/landingPortfolio";
import "./landing.css";

export default async function Home() {
  const {
    platformName,
    pricingSubtitle,
    packages: pricingPackages,
    serviceStatus,
    enabledEventTypes,
  } = await getPublicPlatformSettings();
  const weddingOnly = enabledEventTypes.length === 1 && enabledEventTypes[0] === "WEDDING";
  const collectionChips = [
    { id: "WEDDING", slug: "wedding", label: "Pernikahan" },
    { id: "PERSONAL", slug: "personal", label: "Personal & Keluarga" },
    { id: "EVENT", slug: "event", label: "Acara & Event Umum" },
  ].filter((c) => enabledEventTypes.includes(c.id));

  const activeDomain = await getDynamicServerRootDomain();
  const brand = platformName || "Platform Undangan";
  const [showcaseThemes, featuredPortfolios] = await Promise.all([
    getShowcaseThemes(),
    getLandingPortfolioPreview(3),
  ]);

  return (
    <div className="lux-landing-root min-h-screen selection:bg-[#C9A227]/30 selection:text-[#FBF8F2]">
      <LandingInteractive collections={showcaseThemes} />

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
    <p className="section-label reveal">Koleksi Desain</p>
    <h2 className="koleksi-heading reveal reveal-delay-1" id="koleksi-heading">
      Desain Eksklusif<br />{weddingOnly ? "untuk Hari Pernikahan Anda" : "untuk Semua Momen Spesial"}
    </h2>
    <p className="koleksi-desc reveal reveal-delay-2">
      {weddingOnly
        ? "Setiap rancangan dibuat dengan detail untuk mencerminkan keunikan hari pernikahan Anda."
        : "Dari pesta pernikahan, perayaan ulang tahun istimewa, hingga momen syukuran keluarga, setiap rancangan dibuat dengan detail untuk mencerminkan keunikan acara Anda."}
    </p>
    {collectionChips.length > 1 && (
    <div className="flex flex-wrap gap-2 my-4 reveal reveal-delay-2">
      {collectionChips.map((c) => (
        <Link key={c.id} href={`/demo?event=${c.slug}`} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-stone-700/60 text-stone-300 hover:border-amber-500/80 hover:text-amber-300 transition">
          {c.label}
        </Link>
      ))}
    </div>
    )}
    <Link href="/demo" className="koleksi-link reveal reveal-delay-3">
      Jelajahi Semua Koleksi
    </Link>
  </div>

  {showcaseThemes.length > 0 && (
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
          <img id="tablet-img" src={showcaseThemes[0]?.desktop} alt="Koleksi Desktop" />
          <div className="screen-glare"></div>
        </div>
      </div>

      {/* Phone (Mobile / Portrait) Mockup Overlapping */}
      <div className="device-mockup-phone">
        <div className="phone-notch-bar"></div>
        <div className="phone-screen">
          <img id="phone-img" src={showcaseThemes[0]?.thumbnail} alt="Koleksi Mobile" />
          <div className="screen-glare"></div>
        </div>
      </div>
    </div>

    {/* Koleksi Controls & Theme Meta */}
    <div className="koleksi-controls">
      <div className="koleksi-meta">
        <div className="koleksi-theme-name" id="carousel-name">{showcaseThemes[0]?.name}</div>
        <div className="koleksi-theme-cat" id="carousel-category">{showcaseThemes[0]?.category}</div>
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
  )}
</section>

{/* ===========================
     STUDIO MANDIRI (LIVE EDITING & LIVE PREVIEW SHOWCASE — 1:1 LIGHT EDITORIAL)
=========================== */}
<section id="studio" aria-labelledby="studio-heading">
  <div className="studio-container">
    {/* KIRI: Panggung Visual Dual-Device (Laptop Studio Terang Asli + Mobile Live Preview) */}
    <div className="studio-stage reveal">
      <div className="studio-stage-wrap">
        {/* Laptop / Desktop Frame di Belakang */}
        <div className="studio-laptop-frame studio-light-frame">
          <div className="laptop-topbar studio-light-topbar">
            <div className="laptop-traffic">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="laptop-url-bar studio-light-url">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              {activeDomain}/dashboard/invitation
            </div>
            <div className="laptop-status-chip studio-light-status">
              <span className="laptop-status-dot"></span>
              <span>LIVE SYNC</span>
            </div>
          </div>

          <div className="laptop-screen studio-light-screen">
            {/* Screen Layer 0: Pilihan Tema & Palet Warna (Tampilan Terang Studio Asli) */}
            <div className="studio-screen-layer active" id="studio-screen-0">
              <div className="studio-theme-selector-ui">
                <div className="studio-mini-sidebar">
                  <div className="mini-sidebar-header">SEKSI STUDIO</div>
                  <div className="mini-sidebar-item active">
                    <span className="mini-num">1</span>
                    <div className="mini-info">
                      <span className="mini-title">Tema &amp; Warna</span>
                      <span className="mini-sub">Dillalucky · Gold</span>
                    </div>
                  </div>
                  <div className="mini-sidebar-item">
                    <span className="mini-num">2</span>
                    <div className="mini-info">
                      <span className="mini-title">Sampul &amp; Musik</span>
                      <span className="mini-sub">Foto &amp; Audio</span>
                    </div>
                  </div>
                  <div className="mini-sidebar-item">
                    <span className="mini-num">3</span>
                    <div className="mini-info">
                      <span className="mini-title">Profil Mempelai</span>
                      <span className="mini-sub">Syahril &amp; Elyana</span>
                    </div>
                  </div>
                  <div className="mini-sidebar-item">
                    <span className="mini-num">4</span>
                    <div className="mini-info">
                      <span className="mini-title">Jadwal &amp; Lokasi</span>
                      <span className="mini-sub">Akad &amp; Resepsi</span>
                    </div>
                  </div>
                </div>

                <div className="studio-theme-grid-area">
                  <div className="studio-grid-header">
                    <span className="grid-header-title">Pilih Seri Desain &amp; Palet</span>
                    <div className="mini-cat-pills">
                      <span className="mini-cat">Modern</span>
                      <span className="mini-cat active">Traditional</span>
                    </div>
                  </div>

                  <div className="studio-cards-row">
                    <div className="studio-theme-card selected">
                      <div className="theme-card-badge">TRADITIONAL</div>
                      <div className="theme-card-check">✓</div>
                      <img src="/assets/homepage/studio_theme_dillalucky.webp" alt="Tema Dillalucky" />
                      <div className="theme-card-body">
                        <span className="theme-card-name">Dillalucky</span>
                        <span className="theme-card-tag">Aktif</span>
                      </div>
                    </div>

                    <div className="studio-theme-card">
                      <div className="theme-card-badge">MODERN</div>
                      <img src="/assets/homepage/studio_theme_candani.webp" alt="Tema Candani" />
                      <div className="theme-card-body">
                        <span className="theme-card-name">Candani</span>
                        <span className="theme-card-tag">Pilih</span>
                      </div>
                    </div>

                    <div className="studio-theme-card">
                      <div className="theme-card-badge">MODERN</div>
                      <img src="/assets/homepage/studio_theme_badrika.webp" alt="Tema Badrika" />
                      <div className="theme-card-body">
                        <span className="theme-card-name">Badrika</span>
                        <span className="theme-card-tag">Pilih</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Layer 1: Mode Visual Click-to-Edit */}
            <div className="studio-screen-layer" id="studio-screen-1">
              <div className="studio-live-canvas-ui">
                <div className="live-canvas-instruction">
                  <span className="inst-dot"></span>
                  <span>Live Preview Aktif · Setiap perubahan langsung tersimpan otomatis</span>
                </div>
                <div className="studio-live-split">
                  <div className="studio-live-form">
                    <div className="studio-field-mock">
                      <span className="studio-field-lbl">Nama Mempelai</span>
                      <div className="studio-field-val">Syahril &amp; Elyana</div>
                    </div>
                    <div className="studio-field-mock">
                      <span className="studio-field-lbl">Tanggal &amp; Kota</span>
                      <div className="studio-field-val">20 Oktober 2026 · Makassar</div>
                    </div>
                    <div className="studio-field-mock">
                      <span className="studio-field-lbl">Musik Latar</span>
                      <div className="studio-field-val">Orchestral Romantic (Aktif)</div>
                    </div>
                  </div>
                  <div className="studio-live-mini-preview">
                    <img src="/assets/homepage/hero_mockup_2.webp" alt="Pratinjau langsung undangan" />
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Layer 2: Manajemen Buku Tamu & WhatsApp Link */}
            <div className="studio-screen-layer" id="studio-screen-2">
              <div className="studio-editor-mockup">
                <div className="editor-header">
                  <span className="editor-tab-badge">BUKU TAMU &amp; KIRIM WHATSAPP</span>
                  <span className="editor-save-state">300 Tamu · Siap Kirim</span>
                </div>
                <div className="editor-guest-table">
                  <div className="guest-row-mockup">
                    <div className="guest-avatar">AF</div>
                    <div className="guest-meta">
                      <span className="guest-name">Bpk. Ahmad Fauzan &amp; Istri</span>
                      <span className="guest-tag">VIP · Meja 04 · Kuota 2 Tamu</span>
                    </div>
                    <span className="guest-btn-wa">Kirim WA</span>
                  </div>
                  <div className="guest-row-mockup">
                    <div className="guest-avatar">RP</div>
                    <div className="guest-meta">
                      <span className="guest-name">dr. Rina Puspita</span>
                      <span className="guest-tag">Sahabat · Kuota 1 Tamu</span>
                    </div>
                    <span className="guest-btn-wa">Kirim WA</span>
                  </div>
                  <div className="guest-row-mockup">
                    <div className="guest-avatar">BS</div>
                    <div className="guest-meta">
                      <span className="guest-name">Bpk. Bambang Sutrisno</span>
                      <span className="guest-tag">Keluarga · Meja 01 · 2 Tamu</span>
                    </div>
                    <span className="guest-btn-wa">Kirim WA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="screen-glare"></div>
          </div>
        </div>

        {/* Mobile Phone Frame di Depan: Live Preview Undangan Sungguhan */}
        <div className="studio-phone-frame">
          <div className="phone-notch-bar"></div>
          <div className="phone-screen">
            <div className="studio-phone-layer active" id="studio-phone-0">
              <img className="studio-phone-real-img" src="/assets/homepage/hero_mockup_2.webp" alt="Pratinjau undangan di ponsel" />
            </div>
            <div className="studio-phone-layer" id="studio-phone-1">
              <img className="studio-phone-real-img" src="/assets/homepage/real_exp_rsvp.webp" alt="Pratinjau RSVP di ponsel" />
            </div>
            <div className="studio-phone-layer" id="studio-phone-2">
              <img className="studio-phone-real-img" src="/assets/homepage/real_exp_sharemoment.webp" alt="Pratinjau kamera tamu di ponsel" />
            </div>
            <div className="screen-glare"></div>
          </div>
        </div>
      </div>

      {/* Floating Dock Pengontrol Interaktif */}
      <div className="studio-floating-dock-wrap">
        <div className="studio-liquid-dock" role="tablist" aria-label="Navigasi Fitur Studio">
          <button className="studio-dock-btn active" role="tab" id="studio-tab-0" aria-selected="true" data-studio="0" title="Pilihan Tema & Palet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="dock-active-dot"></span>
            <span className="dock-tooltip">Pilihan Tema</span>
          </button>

          <button className="studio-dock-btn" role="tab" id="studio-tab-1" aria-selected="false" data-studio="1" title="Studio Live Editor">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="dock-active-dot"></span>
            <span className="dock-tooltip">Live Editor</span>
          </button>

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

    {/* KANAN: Text Narrative Bersih & Lapang */}
    <div className="studio-content reveal reveal-delay-1">
      <p className="section-label">STUDIO MANDIRI</p>
      <h2 className="studio-heading" id="studio-heading">
        Rancang Sendiri Undangan Anda,<br />Langsung Jadi Tanpa Nunggu Admin
      </h2>
      <p className="studio-desc">
        Ubah foto prewedding, susunan acara, hingga alunan musik orkestra semudah mengetik pesan di ponsel. Setiap sentuhan langsung tampak nyata detik itu juga di layar smartphone tamu Anda.
      </p>

      <div className="studio-pill-row">
        <span className="studio-badge-pill">Live Editing Seketika</span>
        <span className="studio-badge-pill">Bebas Ubah Kapan Saja</span>
        <span className="studio-badge-pill">Nama Tamu Otomatis</span>
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
     PENGALAMAN / FEATURE SECTION (1:1 REAL PRODUCT SCREENS + DEVICE MORPHING)
=========================== */}
<section id="pengalaman" aria-labelledby="pengalaman-heading">
  <div className="exp-container">
    {/* KANAN (Desktop) / BAWAH (Mobile): Authentic 2.5D Device Stage (Phone <-> Tablet) */}
    <div className="exp-stage reveal">
      <div className="exp-ipad-wrapper" id="exp-phone-wrapper">
        <div className="exp-ipad-3d" id="exp-phone" data-device="phone">
          <div className="exp-ipad-camera"></div>

          {/* 4 Tangkapan Layar Asli Produk (1:1) */}
          <div className="exp-screen">
            <div className="exp-screen-layer" id="exp-screen-0">
              <img
                src="/assets/homepage/real_exp_rsvp.webp"
                alt="Tampilan asli formulir RSVP dan ucapan doa di ponsel tamu"
                className="exp-real-shot"
                loading="lazy"
              />
            </div>

            <div className="exp-screen-layer active" id="exp-screen-1">
              <img
                src="/assets/homepage/real_exp_sharemoment.webp"
                alt="Tampilan asli Guest Camera di ponsel tamu"
                className="exp-real-shot"
                loading="lazy"
              />
            </div>

            <div className="exp-screen-layer" id="exp-screen-2">
              <img
                src="/assets/homepage/real_exp_receptionist.webp"
                alt="Tampilan asli sistem resepsionis dan QR Check-in"
                className="exp-real-shot"
                loading="lazy"
              />
            </div>

            <div className="exp-screen-layer" id="exp-screen-3">
              <img
                src="/assets/homepage/real_exp_memories.webp"
                alt="Tampilan asli Galeri Kenangan Tamu Roll Stack"
                className="exp-real-shot"
                loading="lazy"
              />
            </div>

            <div className="screen-glare"></div>
          </div>
        </div>
      </div>
    </div>

    {/* KIRI (Desktop) / ATAS (Mobile): Text Narrative & Interactive Icon Dock */}
    <div className="exp-content reveal reveal-delay-1">
      <p className="section-label">PENGALAMAN</p>
      <h2 className="exp-heading" id="pengalaman-heading">
        Lebih dari Sekadar<br />Undangan
      </h2>
      <p className="exp-desc">
        Kami menghadirkan pengalaman lengkap untuk Anda dan para tamu, dari undangan pertama hingga hari istimewa tiba.
      </p>

      {/* 4 Feature Icon Buttons */}
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
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div className="exp-icon-info">
            <span className="exp-icon-title">Memories</span>
            <span className="exp-icon-sub">Galeri Kenangan Tamu</span>
          </div>
        </button>
      </div>

      <div className="exp-cta-wrap">
        <Link
          href="/demo?tab=features"
          className="btn-primary"
          id="exp-cta-features"
        >
          <span>Coba Demo Fitur Hari-H</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
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
    <Link href="/demo?style=traditional" className="budaya-card reveal">
      <img src="/assets/homepage/showcase_cultural.webp" alt="Koleksi budaya — undangan adat Bugis, Jawa, Minang, Bali" loading="lazy" />
      <div className="budaya-card-overlay">
        <div className="budaya-card-name">Cultural</div>
        <div className="budaya-card-sub">Bugis · Jawa · Minang · Bali</div>
      </div>
    </Link>
    <Link href="/demo?style=modern" className="budaya-card reveal reveal-delay-1">
      <img src="/assets/homepage/showcase_modern.webp" alt="Koleksi modern — minimal, editorial, kontemporer" loading="lazy" />
      <div className="budaya-card-overlay">
        <div className="budaya-card-name">Modern</div>
        <div className="budaya-card-sub">Minimal · Editorial · Contemporary</div>
      </div>
    </Link>
    <Link href="/demo?style=minimalist" className="budaya-card reveal reveal-delay-2">
      <img src="/assets/homepage/showcase_romantic.webp" alt="Koleksi romantis — lembut, intim, floral" loading="lazy" />
      <div className="budaya-card-overlay">
        <div className="budaya-card-name">Romantic</div>
        <div className="budaya-card-sub">Soft · Intimate · Floral</div>
      </div>
    </Link>
  </div>

  {featuredPortfolios.length > 0 && (
    <div className="landing-portfolio-strip reveal">
      <div className="landing-portfolio-head">
        <div>
          <p className="section-label landing-portfolio-label">Karya Nyata Klien</p>
          <h3 className="landing-portfolio-title">Portofolio Undangan Terpilih</h3>
        </div>
        <Link href="/portfolio" className="landing-portfolio-all">
          Lihat Semua Portofolio
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
      <div className="landing-portfolio-grid">
        {featuredPortfolios.map((item) => (
          <Link key={item.id} href={item.publicUrl} className="landing-portfolio-card">
            <div className="landing-portfolio-thumb">
              <img src={item.coverImage} alt={`Portofolio ${item.coupleName}`} loading="lazy" />
            </div>
            <div className="landing-portfolio-meta">
              <span className="landing-portfolio-couple">{item.coupleName}</span>
              <span className="landing-portfolio-theme">Tema {item.themeName}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )}
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
              {pricingSubtitle}
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
                // Tanpa pembulatan ke ribuan penuh: Rp 99.500 tampil 99,5K, bukan 100K.
                const displayNum = isK ? (pkg.price / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : pkg.price;
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
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent("/packages")}`}
                      className={`pricing-card-cta ${pkg.isFeatured ? "featured" : ""}`}
                    >
                      Pilih {pkg.name}
                    </Link>
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
      Buat undangan digital Anda sekarang dan mulai bercerita dengan cara yang paling indah.
    </p>
    <div className="cta-btn-group reveal reveal-delay-3">
      <Link href="/login" className="btn-cta" id="cta-main-btn">
        Mulai Kisahmu
      </Link>
      <Link
        href={`/login?callbackUrl=${encodeURIComponent("/packages")}`}
        className="btn-cta btn-cta-outline"
      >
        Coba Draf Gratis
      </Link>
    </div>
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
            <div className="footer-tagline">Digital Invitation</div>
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
