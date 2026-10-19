const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Formulir RSVP, unggah kamera, dan tautan galeri di salinan portofolio tidak boleh menulis ke atau membuka undangan
 * asli. ID diganti dengan awalan "demo-" yang dijawab data contoh oleh rute RSVP; ID di dalam path media
 * (".../<id>/...") dibiarkan agar media yang gagal disalin tetap tampil.
 */
export function anonymizePortfolioHtml(html: string, { invitationId, slug, subdomain }: { invitationId: string; slug: string; subdomain: string | null }): string {
  let out = html.replace(new RegExp(`(?<!/)${escapeRegExp(invitationId)}`, "g"), `demo-portfolio-${slug}`);
  for (const base of [`/${slug}`, ...(subdomain ? [`/s/${subdomain}`] : [])]) {
    out = out.split(`"${base}/sharemoment"`).join(`"/demo/sharemoment"`).split(`"${base}/memories"`).join(`"/demo/memories"`);
  }
  return out;
}
