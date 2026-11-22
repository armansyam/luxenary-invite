import { escapeHtml } from "@/lib/escapeHtml";
import { jsonForInlineScript } from "@/lib/safeJson";
import { safeHref, safeExternalUrl } from "@/lib/safeUrl";
import { safeCssColor } from "@/lib/safeCss";
import { buildCheckinQrUrl, qrInitials } from "@/lib/checkinQr";
import { getEventTimezoneOffset, resolveEventTimezone } from "@/lib/lifecycleDates";
import { buildCalendarButtonsHtml } from "@/lib/calendarLinks";
import { buildUniversalWishesSectionHtml } from "@/lib/themeEngine/wishes";
import { getLocaleDict, normalizeInvitationLocale } from "@/lib/themeEngine/locale";

export function nl2br(str: string): string {
  if (!str) return "";
  return escapeHtml(str).replace(/\r\n|\r|\n/g, "<br />");
}

export function formatDateId(dateStr: string | Date, locale: "id" | "en" = "id"): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Label acara dan tautan peta memakai `--event-accent` bila master menetapkannya (kanvas gelap yang `--primary`-nya
 * tidak terbaca di atas kartu), selain itu `--primary`.
 */
export function buildUniversalEventCards(
  events: any[],
  fallbackName: string,
  opts?: { slug?: string; titlePrefix?: string; locale?: "id" | "en" },
): string {
  const locale = opts?.locale || "id";
  const dict = getLocaleDict(locale);
  const titlePrefix = opts?.titlePrefix || fallbackName;
  const cards = events.map((ev: any, idx: number) => {
    const dateLabel = ev.date ? formatDateId(ev.date, locale) : "";
    const mapsHref = safeHref(ev.mapsUrl);
    const calButtons = buildCalendarButtonsHtml({
      event: ev,
      idx,
      slug: opts?.slug,
      sessionQuery: idx,
      titlePrefix,
      locale,
    });
    return `
    <div class="event-block-item" style="background: color-mix(in srgb, var(--card-bg) 60%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); border-radius: var(--radius-md, 14px); padding: 18px; margin-bottom: 12px; text-align: left;">
      <span style="font-size: 11px; font-weight: 700; color: var(--event-accent, var(--primary)); text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(ev.title || "Acara")}</span>
      <h3 class="serif" style="font-size: 18px; color: var(--card-text, var(--text-main)); margin: 6px 0 4px;">${escapeHtml(ev.name || ev.title || fallbackName)}</h3>
      ${dateLabel ? `<p style="font-size: 13px; color: var(--card-text, var(--text-main));">${escapeHtml(dateLabel)}</p>` : ""}
      ${ev.time ? `<p style="font-size: 13px; color: var(--card-muted, var(--text-muted));">${escapeHtml(ev.time)}</p>` : ""}
      ${ev.location ? `<p style="font-size: 13px; color: var(--card-text, var(--text-main)); margin-top: 6px;"><b>${escapeHtml(ev.location)}</b></p>` : ""}
      ${ev.address ? `<p style="font-size: 12px; color: var(--card-muted, var(--text-muted));">${escapeHtml(ev.address)}</p>` : ""}
      ${mapsHref ? `<a href="${mapsHref}" target="_blank" rel="noopener noreferrer" class="btn-map-outline" style="display: inline-block; margin-top: 10px; font-size: 12px; color: var(--event-accent, var(--primary)); text-decoration: underline; font-weight: 600;">${escapeHtml(dict.googleMapsDirections)}</a>` : ""}
      ${calButtons}
    </div>
  `;
  }).join("");
  return `<div class="events-stack events-sessions-stack">${cards}</div>`;
}

export function buildUniversalGallerySection(
  galleryPhotos: string[],
  galleryTitle: string = "Dokumentasi Momen",
  showGallery: boolean = true,
  galleryVariant: string = "grid",
): string {
  if (!showGallery || galleryPhotos.length === 0) return "";

  const galleryItemsHtml = galleryPhotos.map((src, idx) => `
    <div class="moment-photo-item" data-idx="${idx}" onclick="luxOpenZoom(${idx})" style="aspect-ratio: 1/1; border-radius: var(--radius-md, 14px); overflow: hidden; border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); background: var(--card-bg);">
      <img src="${escapeHtml(src)}" alt="Momen ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover; display: block;" loading="lazy" referrerpolicy="no-referrer" />
    </div>
  `).join("");

  return `
    <section class="sec-block gallery-variant-${galleryVariant}" id="gallery" data-lux-section="gallery" data-gallery-variant="${galleryVariant}">
      <!-- lux-ornaments:gallery -->
      <span class="sec-lbl" data-lux-field="customLabels.galleryEyebrow" data-lux-block="gallery-eyebrow">Galeri</span>
      <h2 class="sec-h2 serif" data-lux-field="customLabels.galleryTitle" data-lux-block="gallery-title">${escapeHtml(galleryTitle)}</h2>
      <div class="moments-grid-wrap moments-carousel-wrap" style="margin-top: 16px;">
        <div class="moments-grid-10 is-${galleryVariant}" data-lux-block="gallery-grid" id="momentsGridContainer" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          ${galleryItemsHtml}
        </div>
        ${galleryVariant === "carousel" ? `
        <button type="button" class="carousel-nav-btn carousel-nav-prev" onclick="luxScrollCarousel(-1)" aria-label="Foto sebelumnya">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button type="button" class="carousel-nav-btn carousel-nav-next" onclick="luxScrollCarousel(1)" aria-label="Foto selanjutnya">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
        <script>
          window.luxScrollCarousel = window.luxScrollCarousel || function(dir) {
            var el = document.getElementById("momentsGridContainer") || document.querySelector(".moments-grid-10.is-carousel");
            if (!el) return;
            var step = Math.min(el.clientWidth * 0.75, 300);
            el.scrollBy({ left: dir * step, behavior: "smooth" });
          };
        </script>
        ` : ""}
      </div>
    </section>
  `;
}

export function buildUniversalGiftSection(
  bankAccounts: any[],
  giftTitle: string = "Kado Digital",
  fallbackOwnerName: string = "",
  showGift: boolean = true,
  opts?: { giftRegistryHtml?: string; locale?: "id" | "en" },
): string {
  const locale = opts?.locale || "id";
  const dict = getLocaleDict(locale);
  const giftRegistryHtml = opts?.giftRegistryHtml || "";
  const hasBanks = Array.isArray(bankAccounts) && bankAccounts.length > 0;
  if (!showGift || (!hasBanks && !giftRegistryHtml)) return "";
  const bankCardsHtml = (bankAccounts || []).map((b: any) => `
    <div class="bank-card" style="background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: var(--radius-md, 14px); padding: 18px; text-align: center;">
      <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: color-mix(in srgb, var(--card-accent, var(--primary)) 30%, var(--card-text, var(--text-main))); letter-spacing: 1px;">${escapeHtml(b.bank || "Bank")}</span>
      <div style="font-family: monospace; font-size: 18px; font-weight: 700; color: var(--card-text, var(--text-main)); margin: 8px 0; letter-spacing: 1px;">${escapeHtml(b.number || b.accountNumber || "")}</div>
      <p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); margin-bottom: 12px;">a.n ${escapeHtml(b.name || b.accountName || fallbackOwnerName)}</p>
      <button type="button" data-copy="${escapeHtml(b.number || b.accountNumber || "")}" onclick="navigator.clipboard.writeText(this.dataset.copy).then(function(){alert(${jsonForInlineScript(dict.giftCopiedAlert)});})" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 20px; border-radius: var(--radius-full, 9999px); background: color-mix(in srgb, var(--primary) 15%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 40%, transparent); color: color-mix(in srgb, var(--card-accent, var(--primary)) 30%, var(--card-text, var(--text-main))); font-size: 12px; font-weight: 700; cursor: pointer;">${escapeHtml(dict.giftCopyBtn)}</button>
    </div>
  `).join("");

  return `
    <section class="sec-block" id="gift">
      <span class="sec-lbl" data-lux-field="customLabels.giftEyebrow">${escapeHtml(dict.giftEyebrow)}</span>
      <h2 class="sec-h2 serif" data-lux-field="customLabels.giftTitle">${escapeHtml(giftTitle)}</h2>
      ${hasBanks ? `<div class="bank-cards-list gift-cards-stack" style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">${bankCardsHtml}</div>` : ""}
      ${giftRegistryHtml}
    </section>
  `;
}

// HTML terbit dibangun sekali untuk semua tamu; nama tamu diisi di perangkat dari ?to= oleh skrip runtime (renderTemplate).
export function buildUniversalRsvpSection(invitationId: string, locale: "id" | "en" = "id"): string {
  const dict = getLocaleDict(locale);
  return `
    <div class="rsvp-card-box" style="text-align: left; margin-bottom: 24px;">
      <span class="sec-lbl" style="display: block; text-align: center; margin-bottom: 4px;">${escapeHtml(dict.rsvpEyebrow)}</span>
      <h2 class="sec-h2 serif" style="text-align: center; font-size: 22px; margin-bottom: 16px;" data-lux-field="customLabels.rsvpTitle">${escapeHtml(dict.rsvpHeading)}</h2>
      <form onsubmit="handleUniversalRsvpSubmit(event, '${escapeHtml(invitationId || "")}')" style="display: flex; flex-direction: column; gap: 12px; background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); padding: 20px; border-radius: var(--radius-md, 14px);">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpNameLabel">${escapeHtml(dict.rsvpNameLabel)}</label>
          <input type="text" id="universalRsvpName" required placeholder="${escapeHtml(dict.rsvpNamePlaceholder)}" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpStatusLabel">${escapeHtml(dict.rsvpStatusLabel)}</label>
          <select id="universalRsvpStatus" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px;">
            <option value="hadir">${escapeHtml(dict.attending)}</option>
            <option value="tidak_hadir">${escapeHtml(dict.declinedFull)}</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpCountLabel">${escapeHtml(dict.rsvpCountLabel)}</label>
          <input type="number" id="universalRsvpCount" min="1" max="10" value="1" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--card-muted, var(--text-muted)); margin-bottom: 4px;" data-lux-field="customLabels.rsvpMessageLabel">${escapeHtml(dict.rsvpMessageLabel)}</label>
          <textarea id="universalRsvpMessage" rows="3" placeholder="${escapeHtml(dict.rsvpMessagePlaceholder)}" style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-sm, 8px); background: color-mix(in srgb, var(--bg-canvas, var(--card-bg)) 80%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); color: var(--text-main); font-size: 13px; resize: vertical;"></textarea>
        </div>
        <button type="submit" id="universalRsvpBtn" style="padding: 12px; border-radius: var(--radius-full, 9999px); background: linear-gradient(135deg, var(--primary), var(--secondary)); color: #ffffff; font-size: 13px; font-weight: 700; border: none; cursor: pointer; margin-top: 4px;" data-lux-field="customLabels.rsvpBtnText">${escapeHtml(dict.rsvpBtn)}</button>
        <div id="universalRsvpAlert" style="display: none; text-align: center; font-size: 12px; font-weight: 600; color: var(--card-accent, var(--primary)); margin-top: 6px;"></div>
      </form>
    </div>
    <script>
      async function handleUniversalRsvpSubmit(e, invId) {
        e.preventDefault();
        var btn = document.getElementById("universalRsvpBtn");
        var alertBox = document.getElementById("universalRsvpAlert");
        var name = (document.getElementById("universalRsvpName") || {}).value || "";
        var status = (document.getElementById("universalRsvpStatus") || {}).value || "hadir";
        var count = (document.getElementById("universalRsvpCount") || {}).value || "1";
        var msg = (document.getElementById("universalRsvpMessage") || {}).value || "";
        if (!name.trim()) return;
        var btnLabel = btn ? btn.textContent : "";
        if (btn) { btn.disabled = true; btn.textContent = ${jsonForInlineScript(dict.rsvpBtnSending)}; }
        try {
          var res = await fetch("/api/public/rsvp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationId: invId, guestName: name, status: status, guestCount: count, message: msg })
          });
          var data = await res.json();
          if (data && data.success) {
            if (alertBox) { alertBox.style.display = "block"; alertBox.textContent = ${jsonForInlineScript(dict.rsvpSentSuccess)}; }
            var list = document.getElementById("universalWishesList");
            if (list && msg) {
              var esc = function(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
              var item = document.createElement("div");
              item.style = "background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); border-radius: var(--radius-md, 14px); padding: 14px; margin-bottom: 10px;";
              item.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;"><strong style="font-size: 13px; color: var(--card-text, var(--text-main));">' + esc(name) + '</strong><span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full, 9999px); background: color-mix(in srgb, var(--primary) 25%, transparent); color: var(--card-accent, var(--primary));">' + (status === "hadir" ? ${jsonForInlineScript(dict.attending)} + " (" + esc(count) + ")" : ${jsonForInlineScript(dict.declined)}) + '</span></div><p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); line-height: 1.5; margin: 0;">“' + esc(msg) + '”</p>';
              list.insertBefore(item, list.firstChild);
            }
            var msgBox = document.getElementById("universalRsvpMessage");
            if (msgBox) msgBox.value = "";
          } else {
            if (alertBox) { alertBox.style.display = "block"; alertBox.textContent = (data && data.error) || ${jsonForInlineScript(dict.rsvpSendError)}; }
          }
        } catch(err) {
          if (alertBox) { alertBox.style.display = "block"; alertBox.textContent = ${jsonForInlineScript(dict.rsvpNetworkError)}; }
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        }
      }
    </script>
  `;
}

export function buildUniversalWishesSection(rsvps: any[] = [], invitationId = "", locale: "id" | "en" = "id"): string {
  return buildUniversalWishesSectionHtml(rsvps, invitationId, locale);
}

/** Waktu mulai acara utama berzona waktu (ISO 8601) untuk hitung mundur; kosong bila tanggalnya belum diisi. */
export function countdownTargetOf(primary: any): string {
  const day = typeof primary?.date === "string" ? primary.date.split("T")[0] : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const rawTime = String(primary.startTime || primary.time || "").match(/\d{1,2}[:.]\d{2}/)?.[0]?.replace(".", ":") || "00:00";
  const time = rawTime.length === 4 ? `0${rawTime}` : rawTime;
  return `${day}T${time}:00${getEventTimezoneOffset(resolveEventTimezone(primary))}`;
}

export function buildUniversalCountdown(primary: any, locale: "id" | "en" = "id"): string {
  const target = countdownTargetOf(primary);
  if (!target) return "";
  const dict = getLocaleDict(locale);
  const cell = (id: string, label: string) => `
      <div style="min-width: 64px; padding: 12px 8px; border-radius: var(--radius-md, 14px); background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);">
        <span id="${id}" style="display: block; font-size: 22px; font-weight: 800; color: var(--card-text, var(--text-main));">00</span>
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--card-muted, var(--text-muted));">${label}</span>
      </div>`;
  return `
    <div class="countdown-timer" data-target="${escapeHtml(target)}" style="display: flex; justify-content: center; gap: 8px; margin: 16px 0;">
      ${cell("cdDays", dict.days)}${cell("cdHours", dict.hours)}${cell("cdMinutes", dict.minutes)}${cell("cdSeconds", dict.seconds)}
    </div>
    <script>
      (function () {
        var box = document.querySelector('.countdown-timer[data-target]');
        if (!box || box.__luxCountdown) return;
        box.__luxCountdown = true;
        var target = new Date(box.getAttribute('data-target')).getTime();
        if (isNaN(target)) return;
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = pad(v); };
        var tick = function () {
          var diff = Math.max(0, target - Date.now());
          set('cdDays', Math.floor(diff / 86400000));
          set('cdHours', Math.floor(diff / 3600000) % 24);
          set('cdMinutes', Math.floor(diff / 60000) % 60);
          set('cdSeconds', Math.floor(diff / 1000) % 60);
        };
        tick();
        setInterval(tick, 1000);
      })();
    </script>
  `;
}

/** Audio + tombol putar; pemutaran, autoplay setelah sampul dibuka, dan status tombol ditangani skrip runtime. */
export function buildUniversalMusicPlayer(audioUrl: string): string {
  if (!audioUrl) return "";
  return `
    <audio id="luxAudioPlayer" loop preload="none"><source src="${escapeHtml(audioUrl)}" /></audio>
    <button type="button" id="musicFab" aria-label="Putar atau jeda musik" onclick="window.luxToggleAudio && window.luxToggleAudio()" style="position: fixed; right: 16px; bottom: 88px; z-index: 900; width: 44px; height: 44px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent); background: color-mix(in srgb, var(--card-bg) 85%, transparent); color: var(--card-accent, var(--primary)); display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(6px);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    </button>
    <style>#musicFab.playing svg { animation: luxMusicSpin 4s linear infinite; } @keyframes luxMusicSpin { to { transform: rotate(360deg); } }</style>
  `;
}

/** Kartu QR check-in tamu; nama tamu dan isi QR diisi skrip runtime dari ?to= (#passGuestName, #passQrImg). */
export function buildUniversalQrPass(inv: any, eventLabel: string, mainName: string, dateLabel: string, locale: "id" | "en" = "id"): string {
  const dict = getLocaleDict(locale);
  const qrSrc = escapeHtml(buildCheckinQrUrl(inv.id, dict.honorableGuest, qrInitials(inv)));
  return `
    <section class="sec-block" id="checkin">
      <span class="sec-lbl">${escapeHtml(dict.qrEyebrow)}</span>
      <h2 class="sec-h2 serif">${escapeHtml(dict.qrTitle)}</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${escapeHtml(dict.qrDesc)}</p>
      <div style="background: var(--card-bg); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); border-radius: var(--radius-lg, 20px); padding: 20px; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--card-accent, var(--primary));">${escapeHtml(eventLabel)}</span>
        <h3 class="serif" style="font-size: 20px; color: var(--card-text, var(--text-main)); margin: 6px 0 2px;">${escapeHtml(mainName)}</h3>
        ${dateLabel ? `<p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); margin-bottom: 14px;">${escapeHtml(dateLabel)}</p>` : ""}
        <!-- Latar putih wajib: pemindai QR membutuhkan kontras gelap di atas terang, apa pun palet temanya. -->
        <div style="display: inline-block; padding: 12px; border-radius: var(--radius-md, 14px); background: #ffffff;">
          <img class="pass-qr-img" id="passQrImg" src="${qrSrc}" alt="QR Check-In" style="width: 160px; height: 160px; display: block;" />
        </div>
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--card-muted, var(--text-muted)); margin-top: 14px;">${escapeHtml(dict.qrToLabel)}</p>
        <h4 class="serif" id="passGuestName" style="font-size: 17px; color: var(--card-text, var(--text-main));">${escapeHtml(dict.honorableGuest)}</h4>
      </div>
    </section>
  `;
}

/** Ajakan kamera tamu dan tautan galeri; alamat mengikuti subdomain atau slug undangan. */
export function buildUniversalMemoriesCta(inv: any, customLabels: Record<string, string>, locale: "id" | "en" = "id"): string {
  const dict = getLocaleDict(locale);
  const base = inv.subdomain ? `/s/${encodeURIComponent(inv.subdomain)}` : `/${encodeURIComponent(inv.invitationSlug)}`;
  return `
    <section class="sec-block" id="memories">
      <span class="sec-lbl">${escapeHtml(customLabels.memoriesEyebrow || dict.memoriesEyebrow)}</span>
      <h2 class="sec-h2 serif">${escapeHtml(customLabels.memoriesTitle || dict.memoriesTitle)}</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">${escapeHtml(customLabels.memoriesSubtitle || dict.memoriesSubtitle)}</p>
      <a href="${base}/sharemoment" style="display: inline-block; padding: 12px 28px; border-radius: var(--radius-full, 9999px); background: linear-gradient(135deg, var(--primary), var(--secondary, var(--primary))); color: var(--on-primary, var(--text-main)); font-size: 13px; font-weight: 700; text-decoration: none;">${escapeHtml(dict.memoriesOpenCam)}</a>
      <div style="margin-top: 12px;"><a href="${base}/memories" style="font-size: 12px; color: var(--canvas-accent, var(--primary)); text-decoration: underline;">${escapeHtml(dict.memoriesViewGallery)}</a></div>
    </section>
  `;
}

/** Seksi opsional dari studio: dress code, siaran langsung, filter Instagram, turut mengundang, vendor. */
export function buildUniversalExtraSections(inv: any, featureSettings: Record<string, any>): string {
  const dict = getLocaleDict(normalizeInvitationLocale(featureSettings.language));
  const sections: string[] = [];
  const block = (id: string, label: string, title: string, body: string) => `
    <section class="sec-block" id="${id}">
      <span class="sec-lbl">${label}</span>
      <h2 class="sec-h2 serif">${title}</h2>
      ${body}
    </section>`;

  const rawStories = Array.isArray(inv.loveStory) ? inv.loveStory : [];
  const validStories = rawStories.filter(
    (s: any) => s && (String(s.title || "").trim() || String(s.content || s.description || "").trim()),
  );
  if (featureSettings.showStory !== false && validStories.length > 0) {
    const customLabels = (featureSettings.customLabels || {}) as Record<string, string>;
    const isEventMode = (inv.eventType || "").toUpperCase() === "EVENT";
    const defaultEyebrow = isEventMode
      ? (dict.intlLocale.startsWith("en") ? "Milestones" : "Tonggak Perjalanan")
      : (dict.intlLocale.startsWith("en") ? "Life Journey" : "Kisah & Perjalanan");
    const defaultTitle = isEventMode
      ? (dict.intlLocale.startsWith("en") ? "Our Journey & Milestones" : "Riwayat & Perjalanan")
      : (dict.intlLocale.startsWith("en") ? "Life Story" : "Perjalanan Hidup");
    const eyebrow = escapeHtml(customLabels.storyEyebrow || defaultEyebrow);
    const title = escapeHtml(customLabels.storyTitle || defaultTitle);
    const itemsHtml = validStories
      .map((st: any, idx: number) => {
        const chapterDate = String(st.date || "").trim();
        const chapterTitle = String(st.title || `Babak ${idx + 1}`).trim();
        const chapterBody = String(st.content || st.description || "").trim();
        return `
        <div class="story-chapter-block" style="background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent); border-radius: var(--radius-md, 14px); padding: 16px 18px; text-align: left;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: var(--card-accent, var(--primary));">${escapeHtml(chapterDate || `BABAK ${idx + 1}`)}</span>
          </div>
          <h3 class="serif" style="font-size: 17px; color: var(--card-text, var(--text-main)); margin: 2px 0 6px;" data-lux-field="stories.${idx}.title">${escapeHtml(chapterTitle)}</h3>
          ${chapterBody ? `<p style="font-size: 13px; color: var(--card-muted, var(--text-muted)); line-height: 1.65; margin: 0;" data-lux-field="stories.${idx}.content">${nl2br(chapterBody)}</p>` : ""}
        </div>`;
      })
      .join("");
    sections.push(
      block(
        "story",
        eyebrow,
        title,
        `<div class="journey-timeline" style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">${itemsHtml}</div>`,
      ),
    );
  }

  const colors = String(featureSettings.dressCodeColors || "").split(",").map((c) => safeCssColor(c.trim())).filter(Boolean);
  const dressNote = String(featureSettings.dressCodeNote || inv.dresscode || "").trim();
  if (featureSettings.showDresscode !== false && (colors.length > 0 || dressNote)) {
    const swatches = colors.map((c) => `<span style="width: 28px; height: 28px; border-radius: 50%; display: inline-block; background: ${escapeHtml(c)}; border: 2px solid color-mix(in srgb, var(--text-main) 60%, transparent);"></span>`).join("");
    sections.push(block("dresscode", "Dress Code", escapeHtml(dict.dressCodeTitle), `${swatches ? `<div style="display: flex; justify-content: center; gap: 10px; margin: 12px 0;">${swatches}</div>` : ""}${dressNote ? `<p style="font-size: 13px; color: var(--text-muted);">${escapeHtml(dressNote)}</p>` : ""}`));
  }

  const liveLinks = [
    ["YouTube", safeHref(featureSettings.liveStreamYoutubeUrl)],
    ["Instagram", safeHref(featureSettings.liveStreamInstagramUrl)],
    ["Zoom", safeHref(featureSettings.liveStreamZoomUrl)],
  ].filter(([, href]) => href);
  if (featureSettings.showLiveStream !== false && liveLinks.length > 0) {
    const buttons = liveLinks.map(([name, href]) => `<a href="${href}" target="_blank" rel="noopener noreferrer" style="padding: 10px 18px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent); color: var(--canvas-accent, var(--primary)); font-size: 12px; font-weight: 700; text-decoration: none;">${name} Live</a>`).join("");
    sections.push(block("live", escapeHtml(dict.liveStreamEyebrow), escapeHtml(dict.liveStreamTitle), `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 12px;">${buttons}</div>`));
  }

  const filterUrl = safeHref(featureSettings.instagramFilterUrl);
  if (featureSettings.showFilter && filterUrl) {
    sections.push(block("frame", "Filter Instagram", "Abadikan dengan Bingkai Resmi", `<a href="${filterUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 12px; padding: 10px 22px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent); color: var(--canvas-accent, var(--primary)); font-size: 12px; font-weight: 700; text-decoration: none;">Buka Filter Instagram</a>`));
  }

  const invitedBy = String(featureSettings.turutMengundang || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (featureSettings.showTurutMengundang !== false && invitedBy.length > 0) {
    sections.push(block("turut-mengundang", "Turut Mengundang", "Keluarga &amp; Kerabat", invitedBy.map((l) => `<p style="font-size: 13px; color: var(--text-main); padding: 6px 0; border-bottom: 1px dashed color-mix(in srgb, var(--primary) 20%, transparent);">${escapeHtml(l)}</p>`).join("")));
  }

  let vendors: any[] = [];
  if (Array.isArray(featureSettings.vendors)) vendors = featureSettings.vendors;
  else if (typeof featureSettings.vendors === "string") {
    try { vendors = JSON.parse(featureSettings.vendors); } catch { vendors = []; }
  }
  const validVendors = vendors.filter((v) => v && (String(v.name || "").trim() || String(v.logoUrl || "").trim()));
  if (featureSettings.showVendors !== false && validVendors.length > 0) {
    const items = validVendors.map((v) => {
      const logo = safeExternalUrl(v.logoUrl);
      return `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(v.name || "Vendor")}" style="max-height: 44px; max-width: 120px; object-fit: contain;" loading="lazy" />` : ""}${v.name ? `<span style="font-size: 12px; color: var(--text-main);">${escapeHtml(v.name)}</span>` : ""}${v.category ? `<span style="font-size: 10px; color: var(--text-muted);">${escapeHtml(v.category)}</span>` : ""}</div>`;
    }).join("");
    sections.push(block("vendors", "Vendor", "Didukung Oleh", `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-top: 12px;">${items}</div>`));
  }

  return sections.join("");
}
