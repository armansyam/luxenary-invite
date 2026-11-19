import { escapeHtml } from "@/lib/escapeHtml";
import { jsonForInlineScript } from "@/lib/safeJson";
import { getLocaleDict, type InvitationLocale } from "@/lib/themeEngine/locale";

export interface RenderRsvpItem {
  id?: string;
  guestName?: string | null;
  status?: string | null;
  attendance?: string | null;
  guestCount?: number | null;
  message?: string | null;
  replyMessage?: string | null;
  isHidden?: boolean | null;
}

/** Merender kartu ucapan untuk tema pernikahan (menggunakan kelas `.wish-item`, `.wish-name`, `.wish-msg`). */
export function renderWeddingWishCardsHtml(rsvps: RenderRsvpItem[], locale: InvitationLocale = "id"): string {
  const dict = getLocaleDict(locale);
  const visible = (rsvps || []).filter((r) => !r.isHidden);
  if (visible.length === 0) {
    return `<p style="font-size:0.8rem; font-style:italic; color:var(--text-muted, rgba(255,255,255,0.5)); text-align:center;">${escapeHtml(dict.wishesEmptyWedding)}</p>`;
  }
  return visible
    .map((r) => {
      const isHadir = String(r.status || "").toLowerCase() === "hadir";
      const badgeText = isHadir ? dict.attending : dict.declined;
      return `
      <div class="wish-item">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
          <span class="wish-name">${escapeHtml(r.guestName || dict.guestFallback)}</span>
          <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:${isHadir ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, var(--text-muted) 18%, transparent)"}; color:${isHadir ? "var(--primary)" : "var(--text-muted)"}; font-weight:600;">${escapeHtml(badgeText)}</span>
        </div>
        ${r.message ? `<p class="wish-msg">“${escapeHtml(r.message)}”</p>` : ""}
        ${r.replyMessage ? `<div class="wish-reply" style="margin-top:0.5rem; padding:0.45rem 0.7rem; border-left:2px solid var(--primary); background:color-mix(in srgb, var(--primary) 10%, transparent); border-radius:0 8px 8px 0;"><span style="display:block; font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary); margin-bottom:2px;">${escapeHtml(dict.replyBadge)}</span><p style="margin:0; font-size:0.78rem; color:var(--card-text, var(--text-main)); line-height:1.45;">${escapeHtml(r.replyMessage)}</p></div>` : ""}
      </div>
    `;
    })
    .join("");
}

/** Merender blok ucapan & pembaruan runtime untuk tema satu nama / universal. */
export function buildUniversalWishesSectionHtml(
  rsvps: RenderRsvpItem[] = [],
  invitationId = "",
  locale: InvitationLocale = "id",
): string {
  const dict = getLocaleDict(locale);
  const visible = (rsvps || []).filter((r) => !r.isHidden);
  const wishesList = visible
    .map((r) => {
      const hadir = r.status === "hadir" || r.attendance === "HADIR";
      const badgeLabel = hadir ? `${dict.attending} (${r.guestCount || 1})` : dict.declined;
      return `
    <div style="background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); border-radius: var(--radius-md, 14px); padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="font-size: 13px; color: var(--card-text, var(--text-main));">${escapeHtml(r.guestName || dict.guestFallback)}</strong>
        <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full, 9999px); background: ${hadir ? "color-mix(in srgb, var(--primary) 25%, transparent)" : "color-mix(in srgb, var(--text-muted) 20%, transparent)"}; color: ${hadir ? "var(--card-accent, var(--primary))" : "var(--card-muted, var(--text-muted))"};">${escapeHtml(badgeLabel)}</span>
      </div>
      ${r.message ? `<p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); line-height: 1.5; margin: 0;">“${escapeHtml(r.message)}”</p>` : ""}
      ${r.replyMessage ? `<div style="margin-top: 8px; padding: 6px 10px; border-left: 2px solid var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); border-radius: 0 8px 8px 0;"><span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--card-accent, var(--primary)); margin-bottom: 2px;">${escapeHtml(dict.replyBadge)}</span><p style="font-size: 12px; color: var(--card-text, var(--text-main)); line-height: 1.45; margin: 0;">${escapeHtml(r.replyMessage)}</p></div>` : ""}
    </div>
  `;
    })
    .join("");

  return `
    <div class="wishes-stream-box" style="text-align: left;">
      <h3 class="serif" style="font-size: 18px; color: var(--text-main); margin-bottom: 12px; text-align: center;" data-lux-field="customLabels.wishesTitle">${escapeHtml(dict.wishesTitle)}</h3>
      <div id="universalWishesList" style="display: flex; flex-direction: column; gap: 10px; max-height: 380px; overflow-y: auto;">
        ${wishesList || `<p style="text-align: center; font-size: 12px; color: var(--text-muted); padding: 16px 0;">${escapeHtml(dict.wishesEmpty)}</p>`}
      </div>
    </div>
    <script>
      // HTML terbit adalah snapshot saat publikasi; ucapan & balasan tamu dimuat ulang dari API agar sinkron.
      (function () {
        var invId = ${jsonForInlineScript(String(invitationId))};
        var list = document.getElementById("universalWishesList");
        if (!invId || !list) return;
        var labelAttending = ${jsonForInlineScript(dict.attending)};
        var labelDeclined = ${jsonForInlineScript(dict.declined)};
        var labelReply = ${jsonForInlineScript(dict.replyBadge)};
        var labelFallback = ${jsonForInlineScript(dict.guestFallback)};
        fetch("/api/public/rsvp?invitationId=" + encodeURIComponent(invId))
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data || !data.success || !Array.isArray(data.rsvps) || data.rsvps.length === 0) return;
            var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
            list.innerHTML = data.rsvps.map(function (r) {
              var hadir = String(r.status).toLowerCase() === "hadir";
              var replyHtml = r.replyMessage
                ? '<div style="margin-top: 8px; padding: 6px 10px; border-left: 2px solid var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); border-radius: 0 8px 8px 0;"><span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--card-accent, var(--primary)); margin-bottom: 2px;">' + esc(labelReply) + '</span><p style="font-size: 12px; color: var(--card-text, var(--text-main)); line-height: 1.45; margin: 0;">' + esc(r.replyMessage) + '</p></div>'
                : '';
              return '<div style="background: color-mix(in srgb, var(--card-bg) 70%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); border-radius: var(--radius-md, 14px); padding: 14px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;"><strong style="font-size: 13px; color: var(--card-text, var(--text-main));">' + esc(r.guestName || labelFallback) + '</strong>' +
                '<span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full, 9999px); background: ' + (hadir ? 'color-mix(in srgb, var(--primary) 25%, transparent)' : 'color-mix(in srgb, var(--text-muted) 20%, transparent)') + '; color: ' + (hadir ? 'var(--card-accent, var(--primary))' : 'var(--card-muted, var(--text-muted))') + ';">' + (hadir ? esc(labelAttending) + ' (' + esc(r.guestCount || 1) + ')' : esc(labelDeclined)) + '</span></div>' +
                (r.message ? '<p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); line-height: 1.5; margin: 0;">“' + esc(r.message) + '”</p>' : '') +
                replyHtml +
                '</div>';
            }).join("");
          })
          .catch(function (err) { console.warn("Ucapan terbaru tidak termuat", err); });
      })();
    </script>
  `;
}
