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
          const themeId = themeParam || inv.themeId || "kalandra";
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

  const theme = themeParam || "kalandra";

  const data = {
    invitationId: "demo-invitation-id",
    weddingTagline: "THE WEDDING OF",
    coupleMonogram: "D & N",
    monogramInitial: "D & N",
    targetDate: "2026-10-05T08:00:00",
    weddingDateDay: "05",
    weddingDateMonth: "10",
    weddingDateYear: "2026",
    weddingDate: "Senin, 05 Oktober 2026",
    firstName: "Didan",
    secondName: "Nasha",
    firstFullName: "Didan Faadhilah",
    secondFullName: "Nasha Selsabilla",
    firstDisplayName: "Didan Faadhilah, S.T.",
    secondDisplayName: "Nasha Selsabilla, S.Ds.",
    firstRole: "The Groom",
    secondRole: "The Bride",
    firstRoleLabel: "Mempelai Pria",
    secondRoleLabel: "Mempelai Wanita",
    firstParentLabel: "Putra Dari",
    secondParentLabel: "Putri Dari",
    firstParents: "Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti",
    secondParents: "Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti",
    firstInstagram: "didanfaadhilah",
    secondInstagram: "nashasl",
    firstPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    secondPhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
    groomName: "Didan",
    brideName: "Nasha",
    groomDisplayName: "Didan Faadhilah, S.T.",
    brideDisplayName: "Nasha Selsabilla, S.Ds.",
    groomParents: "Putra dari Bapak Arif Yaniadi & Ibu Yuni Widiastuti",
    brideParents: "Putri dari Bapak Tomm Posma & Ibu Endang Noffiyanti",
    groomInstagram: "didanfaadhilah",
    brideInstagram: "nashasl",
    groomPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    bridePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80",
    openingQuote: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan diantaramu rasa kasih dan sayang.",
    openingQuoteRef: "QS. AR-RUM : 21",
    globalBgUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80",
    sidebarPhotoUrl: "https://images.unsplash.com/photo-1519225421980-715cb021543f?w=1200&q=80",
    landingCoverUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85",
    audioUrl: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
    googleCalendarUrl: "https://www.google.com/calendar/render?action=TEMPLATE&text=The+Wedding+of+Didan+%26+Nasha&dates=20261005T010000Z/20261005T070000Z&location=Makassar",
    colorPrimary: "#a67c52",
    colorSecondary: "#7a5430",
    colorAccent: "#b38b4d",
    colorBgLight: "#faf7f2",
    colorBgDark: "#070709",
    colorTextDark: "#2b2725",
    eventDataHtml: `
      <div class="event-block-item">
        <span class="ev-cat">SAKRAMEN / AKAD</span>
        <h3 class="ev-name serif">AKAD NIKAH</h3>
        <p class="ev-time">08.00 – 10.00 WITA</p>
        <h4 class="ev-venue">Masjid Raya Makassar</h4>
        <p class="ev-addr">Jl. Masjid Raya, Makassar</p>
        <a href="https://maps.google.com" target="_blank" class="btn-map-outline">BUKA MAPS</a>
      </div>
      <div class="event-block-item">
        <span class="ev-cat">RESEPSI</span>
        <h3 class="ev-name serif">RESEPSI PERNIKAHAN</h3>
        <p class="ev-time">11.00 – 14.00 WITA</p>
        <h4 class="ev-venue">Grand Ballroom Phinisi Hotel Clarion</h4>
        <p class="ev-addr">Jl. A.P. Pettarani, Makassar</p>
        <a href="https://maps.google.com" target="_blank" class="btn-map-outline">BUKA MAPS</a>
      </div>
    `,
    storySectionHtml: `
      <section class="sec-journey" id="story">
        <div class="journey-card">
          <div class="journey-previews">
            <div class="jp-item"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80" alt="Journey Preview 1" loading="lazy"></div>
            <div class="jp-item"><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" alt="Journey Preview 2" loading="lazy"></div>
          </div>
          <h2 class="journey-title serif">JOURNEY OF LOVE</h2>
          <div class="journey-chapters">
            <div class="journey-chapter-item">
              <h4 class="chapter-heading">Chapter One: Awal Bertemu</h4>
              <p class="chapter-desc">Pertama kali bertemu dalam sebuah program kolaborasi desain dan teknologi di Jakarta.</p>
            </div>
            <div class="journey-chapter-item">
              <h4 class="chapter-heading">Chapter Two: Menjalin Hubungan</h4>
              <p class="chapter-desc">Saling memahami, bertumbuh bersama, dan meyakinkan hati untuk melangkah lebih jauh.</p>
            </div>
            <div class="journey-chapter-item">
              <h4 class="chapter-heading">Chapter Three: Lamaran Resmi</h4>
              <p class="chapter-desc">Momen sakral saat kedua keluarga besar saling bersilaturahmi dan bersepakat.</p>
            </div>
          </div>
          <div class="journey-footer">
            <div class="jf-line"></div>
            <span class="jf-signature serif">Didan &amp; Nasha</span>
          </div>
        </div>
      </section>
    `,
    gallerySectionHtml: `
      <span class="sec-eyebrow">Memories</span>
      <h2 class="sec-main-title serif">Our Gallery</h2>
      <div class="gallery-grid">
        <div class="g-item"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=85" alt="Gallery"></div>
        <div class="g-item"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&q=85" alt="Gallery"></div>
        <div class="g-item"><img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1000&q=85" alt="Gallery"></div>
        <div class="g-item"><img src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1000&q=85" alt="Gallery"></div>
        <div class="g-item"><img src="https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=1000&q=85" alt="Gallery"></div>
        <div class="g-item"><img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1000&q=85" alt="Gallery"></div>
      </div>
    `,
    giftSectionHtml: `
      <section class="sec-flow" id="gift">
        <span class="sec-eyebrow">Wedding Gift</span>
        <h2 class="sec-main-title serif">Tanda Kasih</h2>
        <p style="font-size:0.8rem; color:rgba(255,255,255,0.7); margin-bottom:1.5rem; line-height:1.5;">
          Doa restu Anda merupakan karunia yang sangat berarti bagi kami. Bagi Anda yang ingin memberikan tanda kasih:
        </p>
        <div class="gift-tabs">
          <button class="gift-tab-btn active" onclick="switchGiftTab('amplop', this)">Transfer Bank / QRIS</button>
          <button class="gift-tab-btn" onclick="switchGiftTab('kado', this)">Kirim Kado</button>
        </div>
        <div id="giftTabAmplop">
          <div class="bank-card">
            <span class="bank-label">BCA Digital</span>
            <span class="bank-owner">a.n Didan Faadhilah</span>
            <div class="bank-row">
              <span class="bank-number">7330497518</span>
              <button class="btn-copy" onclick="copyText('7330497518')">Salin</button>
            </div>
          </div>
        </div>
        <div id="giftTabKado" style="display:none;" class="bank-card">
          <span class="bank-label">Alamat Pengiriman Kado</span>
          <p style="font-size:0.8rem; color:rgba(255,255,255,0.7); line-height:1.5; margin:0.4rem 0 0.8rem;">
            Jl. Pengantin No. 12, Makassar
          </p>
          <button class="btn-copy" onclick="copyText('Jl. Pengantin No. 12, Makassar')">Salin Alamat</button>
        </div>
      </section>
    `,
    dressCodeHtml: "",
    guestNotesHtml: "",
    turutMengundangHtml: "",
    customMessageHtml: "",
    weddingFilterHtml: "",
    liveStreamingHtml: "",
    wishesHtml: `<p style="font-size:0.8rem; font-style:italic; color:rgba(255,255,255,0.5); text-align:center;">Jadilah yang pertama mengirimkan ucapan &amp; doa restu.</p>`,
    qrAccessCardHtml: `
      <div style="text-align:center; padding:1rem 0;">
        <span style="font-size:0.65rem; letter-spacing:0.3em; text-transform:uppercase; color:rgba(255,255,255,0.6); display:block; margin-bottom:0.4rem; font-weight:600;">Check-In Ticket</span>
        <h3 style="font-size:1.4rem; color:#fff; font-family:'Cormorant Garamond',serif; margin-bottom:0.2rem;" id="modalGuestName">Tamu Undangan</h3>
        <p style="font-size:0.75rem; color:rgba(255,255,255,0.65); margin-bottom:1.2rem;">Tunjukkan kode QR ini kepada petugas buku tamu di lokasi acara.</p>
        <div style="background:#ffffff; padding:14px; display:inline-block; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=LUX-DEMO" alt="QR Check-In" style="width:160px; height:160px; display:block;">
        </div>
      </div>
    `,
  };

  const html = renderTemplateFile(theme, data);

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
