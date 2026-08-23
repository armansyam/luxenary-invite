import { renderTemplateFile } from "@/lib/renderTemplate";
import { COLOR_PALETTES } from "@/lib/themeEngine";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ theme: string }> }
) {
  const { theme } = await params;
  const { searchParams } = new URL(req.url);
  const paletteKey = searchParams.get("palette") || "champagne";
  const palette = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.champagne;

  const validThemes = ["kalandra", "valente", "aurelia", "artisan", "prameswari", "kila", "aruna", "ivanna", "danila", "papercut"];
  const selectedTheme = validThemes.includes(theme) ? theme : "kalandra";

  const data = {
    invitationId: `demo-${selectedTheme}`,
    targetDate: "2026-10-05T08:00:00",
    groomName: "Didan",
    brideName: "Nasha",
    groomDisplayName: "Didan Faadhilah, S.T.",
    brideDisplayName: "Nasha Selsabilla, S.Ds.",
    groomParents: "Putra Ketiga dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti",
    brideParents: "Putri Pertama dari Bapak Tomm Posma & Ibu Endang Noffiyanti",
    groomInstagram: "didanfaadhilah",
    brideInstagram: "nashasl",
    groomInitial: "D",
    brideInitial: "N",
    monogramInitial: "D & N",
    isNoPhoto: "false",
    openingQuote: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan diantaramu rasa kasih dan sayang.",
    openingQuoteRef: "QS. AR-RUM : 21",
    globalBgUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80",
    groomPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    bridePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
    sidebarPhotoUrl: "https://images.unsplash.com/photo-1519225421980-715cb021543f?w=1200&q=80",
    landingCoverUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    waLink: "https://wa.me/62818097009400",
    googleCalendarUrl: "https://www.google.com/calendar/render?action=TEMPLATE&text=The+Wedding+of+Nasha+%26+Didan&dates=20261005T010000Z/20261005T070000Z&location=The+Pavilion+Jakarta",
    eventDataHtml: `
      <div class="event-card">
        <h3 class="event-title">Akad Nikah</h3>
        <p class="event-datetime">Minggu, 05 Oktober 2026 | 07:00 - 08:30 WIB</p>
        <p class="event-location">The Pavilion, Jl. Menjangan Raya No.8, Tangerang Selatan</p>
        <a href="https://maps.google.com" target="_blank" class="btn-maps">Buka Petunjuk Arah (Maps)</a>
      </div>
      <div class="event-card">
        <h3 class="event-title">Resepsi Pernikahan</h3>
        <p class="event-datetime">Minggu, 05 Oktober 2026 | 11:00 - 14:00 WIB</p>
        <p class="event-location">Grand Ballroom The Pavilion, Tangerang Selatan</p>
        <a href="https://maps.google.com" target="_blank" class="btn-maps">Buka Petunjuk Arah (Maps)</a>
      </div>
    `,
    loveStoryHtml: `
      <div class="story-item">
        <span class="story-chapter">Chapter 01</span>
        <h3 class="story-title">Awal Bertemu</h3>
        <p class="story-content">Pertama kali bertemu dalam sebuah program kolaborasi desain dan teknologi di Jakarta.</p>
      </div>
      <div class="story-item">
        <span class="story-chapter">Chapter 02</span>
        <h3 class="story-title">Menjalin Hubungan</h3>
        <p class="story-content">Saling memahami, bertumbuh bersama, dan meyakinkan hati untuk melangkah lebih jauh.</p>
      </div>
      <div class="story-item">
        <span class="story-chapter">Chapter 03</span>
        <h3 class="story-title">Hari Pertunangan</h3>
        <p class="story-content">Momen indah ketika kedua keluarga besar saling mengikat tali silaturahmi dan bersepakat.</p>
      </div>
    `,
    galleryHtml: `
      <div class="lux-front-gallery-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.45rem; margin-top:0.6rem; width:100%;">
        <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#f0ede6; box-shadow:0 2px 8px rgba(0,0,0,0.1);"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80" alt="Foto 1" style="width:100%; height:100%; object-fit:cover; display:block;"></div>
        <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#f0ede6; box-shadow:0 2px 8px rgba(0,0,0,0.1);"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80" alt="Foto 2" style="width:100%; height:100%; object-fit:cover; display:block;"></div>
        <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#f0ede6; box-shadow:0 2px 8px rgba(0,0,0,0.1);"><img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80" alt="Foto 3" style="width:100%; height:100%; object-fit:cover; display:block;"></div>
        <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#f0ede6; box-shadow:0 2px 8px rgba(0,0,0,0.1);"><img src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80" alt="Foto 4" style="width:100%; height:100%; object-fit:cover; display:block;"></div>
        <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#f0ede6; box-shadow:0 2px 8px rgba(0,0,0,0.1);"><img src="https://images.unsplash.com/photo-1519225421980-715cb021543f?w=800&q=80" alt="Foto 5" style="width:100%; height:100%; object-fit:cover; display:block;"></div>
        <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer; background:#f0ede6; box-shadow:0 2px 8px rgba(0,0,0,0.1);"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" alt="Foto 6" style="width:100%; height:100%; object-fit:cover; display:block;"></div>
      </div>
    `,
    bankAccountsHtml: `
      <div class="bank-card">
        <div class="bank-header">
          <span class="bank-name">BCA Digital</span>
          <span class="bank-owner">a.n Nasha Selsabilla</span>
        </div>
        <div class="bank-number-box">
          <span class="bank-number">7330497518</span>
          <button class="btn-copy" onclick="copyText('7330497518', this)">Salin Nomor</button>
        </div>
      </div>
      <div class="bank-card">
        <div class="bank-header">
          <span class="bank-name">Mandiri</span>
          <span class="bank-owner">a.n Didan Faadhilah</span>
        </div>
        <div class="bank-number-box">
          <span class="bank-number">1270010892341</span>
          <button class="btn-copy" onclick="copyText('1270010892341', this)">Salin Nomor</button>
        </div>
      </div>
      <div class="bank-card qris-box" style="text-align:center; padding: 1.2rem;">
        <span class="bank-name" style="display:block; margin-bottom:0.4rem; font-size:0.85rem; font-weight:700;">Scan QRIS Tanda Kasih</span>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=QRIS-WEDDING-DEMO" alt="QRIS Pembayaran" style="width:140px; height:140px; object-fit:contain; margin:0 auto; border-radius:8px; background:#fff; padding:6px; border:1px solid #ddd;">
        <p style="font-size:0.7rem; color:#888; margin-top:0.4rem;">Dapat di-scan melalui semua e-wallet &amp; Mobile Banking</p>
      </div>
    `,
    wishesHtml: `
      <div class="wish-card">
        <div class="wish-header">
          <strong class="wish-author">Budi &amp; Rekan Kerja</strong>
          <span class="wish-status status-attending">Konfirmasi Hadir (2 orang)</span>
        </div>
        <p class="wish-message">"Selamat berbahagia Didan &amp; Nasha! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah."</p>
        <span class="wish-time">10 menit yang lalu</span>
      </div>
      <div class="wish-card">
        <div class="wish-header">
          <strong class="wish-author">Siti Rahmawati</strong>
          <span class="wish-status status-attending">Konfirmasi Hadir (1 orang)</span>
        </div>
        <p class="wish-message">"Lancar sampai hari H ya Nasha sayang, can't wait to see you in white!"</p>
        <span class="wish-time">25 menit yang lalu</span>
      </div>
    `,
    shippingAddress: "Jalan Lebak Bulus PDK, Perumahan Tamarind Lane No. 25, Cilandak, Jakarta Selatan, 12440",
    audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-113528.mp3",
    dressCodeHtml: `
      <div class="dresscode-box" style="margin-top:1.2rem; padding-top:1.2rem; border-top:1px dashed rgba(166,124,82,0.25);">
        <p class="dresscode-desc" style="font-size:0.8rem; color:inherit; opacity:0.85;">A Guide to Dress Codes:</p>
        <div class="color-swatches" style="display:flex; justify-content:center; gap:0.8rem; flex-wrap:wrap; margin-top:0.6rem;">
          <div class="swatch-item" style="display:flex; flex-direction:column; align-items:center; gap:0.25rem; font-size:0.65rem;">
            <span class="swatch-circle" style="width:28px; height:28px; border-radius:50%; background:${palette.primary}; box-shadow:0 2px 5px rgba(0,0,0,0.15);"></span>
            <span>Primary</span>
          </div>
          <div class="swatch-item" style="display:flex; flex-direction:column; align-items:center; gap:0.25rem; font-size:0.65rem;">
            <span class="swatch-circle" style="width:28px; height:28px; border-radius:50%; background:${palette.accent}; box-shadow:0 2px 5px rgba(0,0,0,0.15);"></span>
            <span>Accent</span>
          </div>
          <div class="swatch-item" style="display:flex; flex-direction:column; align-items:center; gap:0.25rem; font-size:0.65rem;">
            <span class="swatch-circle" style="width:28px; height:28px; border-radius:50%; background:${palette.bgLight}; border:1px solid #ccc; box-shadow:0 2px 5px rgba(0,0,0,0.15);"></span>
            <span>Soft Light</span>
          </div>
        </div>
      </div>
    `,
    weddingFilterHtml: `
      <div class="filter-box" style="margin: 1.2rem 0; padding: 1.2rem; background: rgba(255,255,255,0.06); border: 1px dashed ${palette.primary}; border-radius: 12px; text-align: center;">
        <p class="filter-desc" style="font-size:0.8rem; margin-bottom:0.6rem;">Abadikan momen bahagia Anda menggunakan Filter Wedding resmi kami di Instagram:</p>
        <a href="https://instagram.com" target="_blank" class="btn-filter" style="display:inline-block; padding:0.55rem 1.4rem; background:${palette.primary}; color:#fff; border-radius:30px; font-size:0.75rem; font-weight:700; text-decoration:none;">Buka Filter Instagram</a>
      </div>
    `,
    liveStreamingHtml: `
      <div class="live-stream-box" style="margin: 1.2rem 0; padding: 1.2rem; background: rgba(255,255,255,0.06); border: 1px dashed ${palette.primary}; border-radius: 12px; text-align: center;">
        <p class="stream-desc" style="font-size:0.8rem; margin-bottom:0.6rem;">Bagi keluarga dan sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran langsung:</p>
        <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
          <a href="https://instagram.com" target="_blank" class="btn-live-stream" style="display:inline-block; padding:0.5rem 1.2rem; background:${palette.primary}; color:#fff; border-radius:25px; font-size:0.75rem; font-weight:600; text-decoration:none;">Instagram Live</a>
          <a href="https://youtube.com" target="_blank" class="btn-live-stream" style="display:inline-block; padding:0.5rem 1.2rem; background:#cc0000; color:#fff; border-radius:25px; font-size:0.75rem; font-weight:600; text-decoration:none;">YouTube Live</a>
        </div>
      </div>
    `,
    qrAccessCardHtml: `
      <div class="access-badge">INVITATION PASS</div>
      <h3 class="access-couple serif-font">Nasha &amp; Didan</h3>
      <div class="access-guest-box">
        <span class="access-label">Nama Tamu:</span>
        <h4 class="access-guest-name" id="modalGuestName">Tamu Undangan</h4>
        <div class="access-details-grid">
          <div><span class="access-label">Sesi Acara:</span><strong>Sesi 1 (11:00 - 12:30)</strong></div>
          <div><span class="access-label">Jumlah Pax:</span><strong>2 Orang</strong></div>
        </div>
      </div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=LUX-ACCESS-DEMO" alt="QR Code" class="access-qr-img">
      <p class="access-note">Tunjukkan barcode ini kepada penerima tamu di lokasi acara</p>
    `,
    colorPrimary: palette.primary,
    colorSecondary: palette.secondary,
    colorAccent: palette.accent,
    colorBgLight: palette.bgLight,
    colorBgDark: palette.bgDark,
  };

  const html = renderTemplateFile(selectedTheme, data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
