import { escapeHtml } from "@/lib/escapeHtml";
import { jsonForInlineScript } from "@/lib/safeJson";
import { safeHref } from "@/lib/safeUrl";
import { getLocaleDict, type InvitationLocale } from "@/lib/themeEngine/locale";
import type { GiftRegistryItem } from "@/lib/giftRegistry";

export interface GiftClaimRow {
  itemId: string;
  guestName?: string | null;
  quantity?: number | null;
}

/**
 * Merender Daftar Kado Fisik (Gift Registry) menggunakan token CSS tema aktif (tanpa warna hardcode)
 * serta formulir reservasi inline anti-dobel melalui `/api/public/gift-claim` (tanpa window.prompt/alert).
 */
export function buildGiftRegistryHtml(opts: {
  items: GiftRegistryItem[];
  claims?: GiftClaimRow[];
  invitationId?: string;
  locale?: InvitationLocale;
}): string {
  const { items, claims = [], invitationId = "", locale = "id" } = opts;
  if (!items || items.length === 0) return "";

  const dict = getLocaleDict(locale);
  const claimedTotals = new Map<string, number>();
  for (const c of claims) {
    if (!c?.itemId) continue;
    claimedTotals.set(c.itemId, (claimedTotals.get(c.itemId) || 0) + Math.max(1, Number(c.quantity || 1)));
  }

  const cardsHtml = items
    .map((item) => {
      const claimed = claimedTotals.get(item.id) || 0;
      const remaining = Math.max(0, item.qtyNeeded - claimed);
      const isFull = remaining <= 0;
      const safeUrl = item.url ? safeHref(item.url) : "";
      return `
      <div class="gift-registry-item" data-gift-item="${escapeHtml(item.id)}" style="background: color-mix(in srgb, var(--card-bg) 75%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent); border-radius: var(--radius-md, 14px); padding: 14px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div style="min-width: 0; flex: 1;">
            <strong style="display: block; font-size: 14px; color: var(--card-text, var(--text-main));">${escapeHtml(item.name)}</strong>
            ${item.note ? `<p style="font-size: 12px; color: var(--card-muted, var(--text-muted)); margin: 4px 0 0; line-height: 1.4;">${escapeHtml(item.note)}</p>` : ""}
          </div>
          <span class="gift-reg-qty" data-needed="${item.qtyNeeded}" style="font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: var(--radius-full, 9999px); white-space: nowrap; background: ${isFull ? "color-mix(in srgb, var(--text-muted) 18%, transparent)" : "color-mix(in srgb, var(--primary) 18%, transparent)"}; color: ${isFull ? "var(--card-muted, var(--text-muted))" : "var(--card-accent, var(--primary))"};">
            ${isFull ? escapeHtml(dict.giftClaimed) : `${escapeHtml(dict.giftRemaining)} ${remaining} ${escapeHtml(dict.giftOf)} ${item.qtyNeeded}`}
          </span>
        </div>
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px;">
          ${safeUrl ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 600; color: var(--card-accent, var(--primary)); text-decoration: underline;">${escapeHtml(dict.referenceLink)}</a>` : ""}
          <button
            type="button"
            class="btn-gift-claim"
            data-gift-claim="${escapeHtml(item.id)}"
            ${isFull ? "disabled" : ""}
            style="margin-left: auto; padding: 6px 14px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 45%, transparent); background: ${isFull ? "transparent" : "color-mix(in srgb, var(--primary) 16%, transparent)"}; color: ${isFull ? "var(--card-muted, var(--text-muted))" : "var(--card-text, var(--text-main))"}; font-size: 11px; font-weight: 700; cursor: ${isFull ? "not-allowed" : "pointer"}; opacity: ${isFull ? "0.6" : "1"};"
          >
            ${isFull ? escapeHtml(dict.giftClaimed) : escapeHtml(dict.claimGift)}
          </button>
        </div>
        <div class="gift-claim-form" hidden style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed color-mix(in srgb, var(--primary) 26%, transparent); display: none; flex-direction: column; gap: 8px;">
          <input type="text" class="gift-claim-name" maxlength="100" placeholder="${escapeHtml(dict.rsvpNamePlaceholder)}" style="width: 100%; padding: 8px 10px; border-radius: var(--radius-sm, 8px); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent); background: color-mix(in srgb, var(--bg-dark) 12%, var(--card-bg)); color: var(--card-text, var(--text-main)); font-size: 12px; outline: none;" />
          <input type="text" class="gift-claim-note" maxlength="200" placeholder="${escapeHtml(dict.giftNotePlaceholder)}" style="width: 100%; padding: 8px 10px; border-radius: var(--radius-sm, 8px); border: 1px solid color-mix(in srgb, var(--primary) 24%, transparent); background: color-mix(in srgb, var(--bg-dark) 12%, var(--card-bg)); color: var(--card-text, var(--text-main)); font-size: 12px; outline: none;" />
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn-gift-cancel" style="padding: 6px 12px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--text-muted) 30%, transparent); background: transparent; color: var(--card-muted, var(--text-muted)); font-size: 11px; font-weight: 600; cursor: pointer;">${escapeHtml(dict.giftCancelBtn)}</button>
            <button type="button" class="btn-gift-confirm" style="padding: 6px 14px; border-radius: var(--radius-full, 9999px); border: 1px solid color-mix(in srgb, var(--primary) 65%, transparent); background: var(--primary); color: var(--on-primary, var(--bg-dark)); font-size: 11px; font-weight: 700; cursor: pointer;">${escapeHtml(dict.giftSubmitBtn)}</button>
          </div>
          <p class="gift-claim-feedback" style="margin: 0; font-size: 11px; line-height: 1.4; color: var(--card-accent, var(--primary));"></p>
        </div>
      </div>`;
    })
    .join("");

  const boxId = `giftRegistryBox_${invitationId ? invitationId.replace(/[^a-zA-Z0-9]/g, "") : "demo"}`;

  return `
    <div id="${boxId}" class="gift-registry-section" style="margin-top: 18px; text-align: center;">
      <span class="sec-eyebrow" style="display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--card-accent, var(--primary)); margin-bottom: 4px;">${escapeHtml(dict.giftRegistryEyebrow)}</span>
      <h3 class="serif" style="font-size: 18px; color: var(--text-main); margin: 0 0 6px;">${escapeHtml(dict.giftRegistryTitle)}</h3>
      <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 14px; line-height: 1.5;">${escapeHtml(dict.giftRegistrySubtitle)}</p>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${cardsHtml}
      </div>
    </div>
    <script>
      (function () {
        var invId = ${jsonForInlineScript(String(invitationId))};
        var root = document.getElementById(${jsonForInlineScript(boxId)});
        if (!root || !invId || invId.indexOf("demo") === 0) return;
        var labelClaim = ${jsonForInlineScript(dict.claimGift)};
        var labelClaimed = ${jsonForInlineScript(dict.giftClaimed)};
        var labelClaiming = ${jsonForInlineScript(dict.giftClaiming)};
        var labelRemaining = ${jsonForInlineScript(dict.giftRemaining)};
        var labelOf = ${jsonForInlineScript(dict.giftOf)};
        var labelSuccess = ${jsonForInlineScript(dict.giftClaimSuccess)};
        var labelSubmit = ${jsonForInlineScript(dict.giftSubmitBtn)};
        var labelError = ${jsonForInlineScript(dict.giftErrorFallback)};

        function applyClaimTotals(totals) {
          var cards = root.querySelectorAll("[data-gift-item]");
          for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var itemId = card.getAttribute("data-gift-item");
            var qtyEl = card.querySelector(".gift-reg-qty");
            var btnEl = card.querySelector("[data-gift-claim]");
            var formEl = card.querySelector(".gift-claim-form");
            var needed = Number(qtyEl && qtyEl.getAttribute("data-needed")) || 1;
            var used = Number(totals[itemId] || 0);
            var rem = Math.max(0, needed - used);
            if (qtyEl) qtyEl.textContent = rem <= 0 ? labelClaimed : (labelRemaining + " " + rem + " " + labelOf + " " + needed);
            if (btnEl) {
              btnEl.disabled = rem <= 0;
              btnEl.textContent = rem <= 0 ? labelClaimed : labelClaim;
              btnEl.style.opacity = rem <= 0 ? "0.6" : "1";
              btnEl.style.cursor = rem <= 0 ? "not-allowed" : "pointer";
            }
            if (rem <= 0 && formEl) {
              formEl.style.display = "none";
              formEl.hidden = true;
            }
          }
        }

        fetch("/api/public/gift-claim?invitationId=" + encodeURIComponent(invId))
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.success || !Array.isArray(d.claims)) return;
            var map = {};
            for (var i = 0; i < d.claims.length; i++) {
              map[d.claims[i].itemId] = Number(d.claims[i].claimedQty || 0);
            }
            applyClaimTotals(map);
          })
          .catch(function () {});

        root.addEventListener("click", function (ev) {
          var openBtn = ev.target && ev.target.closest ? ev.target.closest("[data-gift-claim]") : null;
          if (openBtn && !openBtn.disabled) {
            var card = openBtn.closest("[data-gift-item]");
            var form = card && card.querySelector(".gift-claim-form");
            if (!form) return;
            var isHidden = form.hidden || form.style.display === "none";
            form.hidden = !isHidden;
            form.style.display = isHidden ? "flex" : "none";
            if (isHidden) {
              var nameEl = form.querySelector(".gift-claim-name");
              if (nameEl && !nameEl.value) {
                var urlTo = new URLSearchParams(window.location.search).get("to") || "";
                var rsvpInput = document.getElementById("rsvpName") || document.getElementById("universalRsvpName");
                nameEl.value = ((rsvpInput && rsvpInput.value) || urlTo || "").trim();
              }
              if (nameEl) nameEl.focus();
            }
            return;
          }

          var cancelBtn = ev.target && ev.target.closest ? ev.target.closest(".btn-gift-cancel") : null;
          if (cancelBtn) {
            var cancelForm = cancelBtn.closest(".gift-claim-form");
            if (cancelForm) {
              cancelForm.hidden = true;
              cancelForm.style.display = "none";
            }
            return;
          }

          var submitBtn = ev.target && ev.target.closest ? ev.target.closest(".btn-gift-confirm") : null;
          if (!submitBtn || submitBtn.disabled) return;
          var itemCard = submitBtn.closest("[data-gift-item]");
          var itemId = itemCard && itemCard.getAttribute("data-gift-item");
          var formBox = submitBtn.closest(".gift-claim-form");
          var nameField = formBox && formBox.querySelector(".gift-claim-name");
          var noteField = formBox && formBox.querySelector(".gift-claim-note");
          var fb = formBox && formBox.querySelector(".gift-claim-feedback");
          var guestName = ((nameField && nameField.value) || "").trim();
          var note = ((noteField && noteField.value) || "").trim();

          if (!itemId || !guestName) {
            if (fb) fb.textContent = ${jsonForInlineScript(dict.giftClaimPromptName)};
            if (nameField) nameField.focus();
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = labelClaiming;
          if (fb) fb.textContent = "";

          fetch("/api/public/gift-claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitationId: invId, itemId: itemId, guestName: guestName, note: note, quantity: 1 })
          })
            .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); })
            .then(function (res) {
              submitBtn.disabled = false;
              submitBtn.textContent = labelSubmit;
              if (!res.ok || !res.json.success) {
                if (fb) fb.textContent = (res.json && res.json.error) || labelError;
                return;
              }
              var map = {};
              if (Array.isArray(res.json.claims)) {
                for (var i = 0; i < res.json.claims.length; i++) {
                  map[res.json.claims[i].itemId] = Number(res.json.claims[i].claimedQty || 0);
                }
              }
              applyClaimTotals(map);
              if (noteField) noteField.value = "";
              if (typeof window.showToast === "function") {
                window.showToast(labelSuccess);
              } else if (fb) {
                fb.textContent = labelSuccess;
              }
            })
            .catch(function () {
              submitBtn.disabled = false;
              submitBtn.textContent = labelSubmit;
              if (fb) fb.textContent = labelError;
            });
        });
      })();
    </script>`;
}
