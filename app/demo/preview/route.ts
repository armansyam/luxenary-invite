import { renderTemplateFile } from "@/lib/renderTemplate";
import { composeTemplateData } from "@/lib/themeEngine";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("id");
  const themeParam = searchParams.get("theme");

  if (invitationId) {
    try {
      const inv = await prisma.invitation.findUnique({ where: { id: invitationId } });
      if (inv) {
        const data = await composeTemplateData(invitationId);
        if (data) {
          const themeId = themeParam || inv.themeId || "kila";
          const html = renderTemplateFile(themeId, data);
          return new NextResponse(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to render dynamic preview:", err);
      return NextResponse.json({ error: String(err?.message || err), stack: err?.stack }, { status: 500 });
    }
  }

  const theme = themeParam || "kila";

  const data = {
    invitationId: "demo-invitation-id",
    weddingTagline: "THE WEDDING OF",
    coupleMonogram: "N & D",
    monogramInitial: "N & D",
    targetDate: "2026-10-05T08:00:00",
    groomName: "Didan",
    brideName: "Nasha",
    groomDisplayName: "Didan Faadhilah, S.T.",
    brideDisplayName: "Nasha Selsabilla, S.Ds.",
    groomParents: "Putra Ketiga dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti",
    brideParents: "Putri Pertama dari Bapak Tomm Posma & Ibu Endang Noffiyanti",
    groomInstagram: "didanfaadhilah",
    brideInstagram: "nashasl",
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
    storySectionHtml: `
      <section class="heritage-section section-card danila-section paper-section snap-slide" id="story">
        <div class="heritage-card card frosted-pill-card scrapbook-card editorial-card">
          <h2 class="serif-body serif-title subtitle-section" style="font-size:1.6rem; margin-bottom:1rem; font-weight:600;">Untaian Kasih</h2>
          <div class="story-item">
            <span class="story-year">2020</span>
            <h4 class="story-heading">Pertemuan Pertama</h4>
            <p class="story-desc">Dipertemukan dalam sebuah kegiatan akademis di kampus.</p>
          </div>
        </div>
      </section>
    `,
    gallerySectionHtml: `
      <section class="heritage-section section-card danila-section paper-section snap-slide" id="gallery">
        <div class="heritage-card card frosted-pill-card scrapbook-card editorial-card" style="text-align:center;">
          <h2 class="serif-body serif-title subtitle-section" style="font-size:1.6rem; margin-bottom:1rem; font-weight:600;">Galeri Kasih</h2>
          <div class="lux-front-gallery-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.45rem; margin-top:0.6rem; width:100%;">
            <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer;"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80" alt="Foto 1" style="width:100%; height:100%; object-fit:cover;"></div>
            <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer;"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80" alt="Foto 2" style="width:100%; height:100%; object-fit:cover;"></div>
            <div class="gallery-item" style="border-radius:8px; overflow:hidden; aspect-ratio:1/1; cursor:pointer;"><img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80" alt="Foto 3" style="width:100%; height:100%; object-fit:cover;"></div>
          </div>
        </div>
      </section>
    `,
    giftSectionHtml: `
      <section class="heritage-section section-card danila-section paper-section snap-slide" id="gift">
        <div class="heritage-card card frosted-pill-card scrapbook-card editorial-card">
          <h2 class="serif-body serif-title subtitle-section" style="font-size:1.6rem; margin-bottom:1rem; font-weight:600;">Tanda Kasih</h2>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.8rem;">Doa restu Anda adalah karunia terindah bagi kami:</p>
          <div class="gift-tabs">
            <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer Bank / QRIS</button>
            <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
          </div>
          <div id="giftTabAmplop">
            <div class="bank-card">
              <div class="bank-header"><span class="bank-name">BCA</span><span class="bank-owner">a.n Didan Faadhilah</span></div>
              <div class="bank-number-box"><span class="bank-number">7330497518</span><button class="btn-copy" onclick="copyText('7330497518', this)">Salin Nomor</button></div>
            </div>
          </div>
        </div>
      </section>
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
      <div class="dresscode-box">
        <p class="dresscode-desc">A Guide to Dress Codes:</p>
        <div class="color-swatches">
          <div class="swatch-item"><span class="swatch-circle" style="background:#a67c52;"></span><span class="swatch-name">Champagne</span></div>
          <div class="swatch-item"><span class="swatch-circle" style="background:#d4c3b3;"></span><span class="swatch-name">Warm Sand</span></div>
          <div class="swatch-item"><span class="swatch-circle" style="background:#4a3b32;"></span><span class="swatch-name">Espresso</span></div>
          <div class="swatch-item"><span class="swatch-circle" style="background:#f5eedf; border:1px solid #d4c3b3;"></span><span class="swatch-name">Ivory Cream</span></div>
        </div>
      </div>
    `,
    liveStreamingHtml: `
      <div class="live-stream-box">
        <p class="stream-desc">Bagi keluarga dan sahabat yang menyaksikan dari jauh, Anda dapat menyaksikan siaran langsung:</p>
        <a href="https://instagram.com/didanfaadhilah" target="_blank" class="btn-live-stream">Saksikan Live Instagram</a>
      </div>
    `,
    weddingFilterHtml: `
      <div class="filter-box">
        <p class="filter-desc">Gunakan filter resmi pernikahan kami di Instagram:</p>
        <a href="https://instagram.com" target="_blank" class="btn-filter">Buka Wedding Filter</a>
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
  };

  const html = renderTemplateFile(theme, data);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
