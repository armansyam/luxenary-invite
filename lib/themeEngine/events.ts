import { escapeHtml } from "@/lib/escapeHtml";
import { safeHref } from "@/lib/safeUrl";
import { buildCalendarButtonsHtml } from "@/lib/calendarLinks";
import { buildCalendarTitle } from "@/lib/invitationUtils";
import { getLocaleDict, type InvitationLocale } from "@/lib/themeEngine/locale";

function nl2brText(str: string): string {
  if (!str) return "";
  return escapeHtml(str).replace(/\r\n|\r|\n/g, "<br />");
}

/**
 * Membangun HTML kartu sesi acara pernikahan beserta deduplikasi lokasi/maps & tombol kalender.
 */
export function buildWeddingEventsHtml(params: {
  rawEventsList: any[];
  firstName: string;
  secondName: string;
  weddingDate: string;
  realSlug?: string;
  eventsVariant: string;
  locale: InvitationLocale;
}): string {
  const { rawEventsList, firstName, secondName, weddingDate, realSlug, eventsVariant, locale } = params;
  if (!Array.isArray(rawEventsList) || rawEventsList.length === 0) return "";

  const dict = getLocaleDict(locale);
  const normalizeLoc = (s: string) => (s || "").trim().toLowerCase();
  const firstDate = (rawEventsList[0]?.date || "").trim();
  const firstLoc = normalizeLoc(rawEventsList[0]?.location);
  const firstAddr = normalizeLoc(rawEventsList[0]?.address);
  const firstMap = (rawEventsList[0]?.mapsUrl || "").trim();

  const isSameLocationForAll =
    rawEventsList.length > 1 &&
    rawEventsList.every((ev: any) => {
      const d = (ev.date || "").trim();
      const l = normalizeLoc(ev.location);
      const a = normalizeLoc(ev.address);
      const m = (ev.mapsUrl || "").trim();
      const isSameDate = !d || !firstDate || d === firstDate;
      const isSameLocation = (l === firstLoc || (!l && firstLoc)) && (a === firstAddr || (!a && firstAddr));
      const isSameMapsUrl = m === firstMap || (!m && firstMap);
      return isSameDate && isSameLocation && isSameMapsUrl;
    });

  const weddingCalPrefix = buildCalendarTitle("WEDDING", { groomName: firstName, brideName: secondName });

  if (isSameLocationForAll) {
    const unifiedVenueRaw = rawEventsList[0]?.location || "";
    const unifiedAddressRaw = rawEventsList[0]?.address || "";
    const sessionsListHtml = rawEventsList
      .map(
        (ev: any, idx: number) => `
        <div class="event-block-item unified-session">
          <span class="ev-cat">${escapeHtml((ev.badge || (idx === 0 ? "SAKRAMEN / AKAD" : "RESEPSI")).toUpperCase())}</span>
          <h3 class="ev-name serif" data-lux-field="events.${idx}.title">${escapeHtml((ev.title || (idx === 0 ? "Akad Nikah" : "Resepsi Pernikahan")).toUpperCase())}</h3>
          ${ev.time ? `<p class="ev-time" data-lux-field="events.${idx}.time">${escapeHtml(ev.time)}</p>` : ""}
          ${ev.notes ? `<p class="ev-notes" style="font-size:0.75rem; font-style:italic; margin-top:0.3rem; color:rgba(255,255,255,0.7);">${nl2brText(ev.notes)}</p>` : ""}
          ${buildCalendarButtonsHtml({
            event: {
              ...ev,
              date: ev.date || firstDate,
              location: ev.location || unifiedVenueRaw,
              address: ev.address || unifiedAddressRaw,
            },
            idx,
            slug: realSlug,
            sessionQuery: idx,
            titlePrefix: weddingCalPrefix,
            locale,
          })}
        </div>
      `,
      )
      .join("");

    const unifiedVenue = escapeHtml(unifiedVenueRaw);
    const unifiedAddress = escapeHtml(unifiedAddressRaw);
    const unifiedMapUrl = safeHref(rawEventsList[0]?.mapsUrl);

    return `
        <div class="events-unified-container events-variant-${eventsVariant}" data-events-variant="${eventsVariant}">
          <div class="events-sessions-stack">
            ${sessionsListHtml}
          </div>
          ${
            unifiedVenue || unifiedAddress || unifiedMapUrl
              ? `
          <div class="event-unified-venue-card">
            <span class="venue-card-lbl">${escapeHtml(dict.venueLabel)}</span>
            ${unifiedVenue ? `<h4 class="ev-venue-unified serif" data-lux-field="events.0.location">${unifiedVenue}</h4>` : ""}
            ${unifiedAddress ? `<p class="ev-addr-unified" data-lux-field="events.0.address">${unifiedAddress}</p>` : ""}
            ${
              unifiedMapUrl
                ? `
              <a href="${unifiedMapUrl}" target="_blank" rel="noopener noreferrer" class="btn-map-outline">
                ${escapeHtml(dict.openDirections)}
              </a>
            `
                : ""
            }
          </div>
          `
              : ""
          }
        </div>
      `;
  }

  return rawEventsList
    .map((ev: any, idx: number) => {
      let sessionDateFormatted = "";
      if (ev.date) {
        try {
          const sd = new Date(ev.date);
          if (!isNaN(sd.getTime())) {
            sessionDateFormatted = sd.toLocaleDateString(dict.intlLocale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            });
          }
        } catch {}
      }
      const showSessionDate = Boolean(sessionDateFormatted && sessionDateFormatted !== weddingDate);

      return `
        <div class="event-block-item">
          <span class="ev-cat">${escapeHtml((ev.badge || (idx === 0 ? "SAKRAMEN / AKAD" : "RESEPSI")).toUpperCase())}</span>
          <h3 class="ev-name serif" data-lux-field="events.${idx}.title">${escapeHtml((ev.title || (idx === 0 ? "Akad Nikah" : "Resepsi Pernikahan")).toUpperCase())}</h3>
          ${showSessionDate ? `<p class="ev-session-date" style="font-size:0.85rem; letter-spacing:0.04em; color:rgba(255,255,255,0.92); font-weight:500; margin-bottom:0.25rem;">${sessionDateFormatted}</p>` : ""}
          ${ev.time ? `<p class="ev-time" data-lux-field="events.${idx}.time">${escapeHtml(ev.time)}</p>` : ""}
          ${ev.location ? `<h4 class="ev-venue" data-lux-field="events.${idx}.location">${escapeHtml(ev.location)}</h4>` : ""}
          ${ev.address ? `<p class="ev-addr" data-lux-field="events.${idx}.address">${escapeHtml(ev.address)}</p>` : ""}
          ${ev.notes ? `<p class="ev-notes" style="font-size:0.75rem; font-style:italic; margin-top:0.3rem; color:rgba(255,255,255,0.7);">${nl2brText(ev.notes)}</p>` : ""}
          ${
            safeHref(ev.mapsUrl)
              ? `
            <a href="${safeHref(ev.mapsUrl)}" target="_blank" rel="noopener noreferrer" class="btn-map-outline">
              ${escapeHtml(dict.openMaps)}
            </a>
          `
              : ""
          }
          ${buildCalendarButtonsHtml({
            event: ev,
            idx,
            slug: realSlug,
            sessionQuery: idx,
            titlePrefix: weddingCalPrefix,
            locale,
          })}
        </div>
      `;
    })
    .join("");
}
