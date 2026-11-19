import { invalidateInvitationLookup } from "./cache";
import { getDynamicServerRootDomain } from "./serverDomainUtils";

/**
 * Halaman undangan terbit di-cache edge 1 jam (s-maxage), jadi setiap perubahan status atau isi wajib membersihkan
 * cache lookup L1 dan URL publiknya (subdomain, slug, custom domain). Dipanggil juga dari cron, di luar request:
 * domain akar lalu diambil dari NEXT_PUBLIC_ROOT_DOMAIN.
 */
export async function purgeInvitationEdgeCache(inv: {
  id?: string | null;
  invitationSlug: string | null;
  subdomain: string | null;
  customDomain?: string | null;
}): Promise<Awaited<ReturnType<typeof purgeCloudflareCache>> | null> {
  invalidateInvitationLookup(inv.invitationSlug, inv.subdomain, inv.id);
  const rootDomain = (await getDynamicServerRootDomain("")).split(":")[0].toLowerCase();
  const urls: string[] = [];
  if (rootDomain && inv.subdomain) urls.push(`https://${inv.subdomain}.${rootDomain}/`);
  if (rootDomain && inv.invitationSlug) urls.push(`https://${rootDomain}/${inv.invitationSlug}`);
  if (inv.customDomain) urls.push(`https://${inv.customDomain}/`);
  return urls.length > 0 ? purgeCloudflareCache({ files: urls }) : null;
}

/** Membersihkan edge cache Cloudflare untuk halaman daftar dan detail portofolio saat admin menambah/menghapus. */
export async function purgePortfolioEdgeCache(slug: string): Promise<Awaited<ReturnType<typeof purgeCloudflareCache>>> {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!origin.startsWith("https://")) return { success: false, skipped: true, reason: "NEXT_PUBLIC_APP_URL bukan URL https" };
  const apex = new URL(origin).host.replace(/^www\./, "");
  const paths = ["/portfolio", `/portfolio/${slug}`];
  const files = [...new Set([`https://${apex}`, `https://www.${apex}`].flatMap((host) => paths.map((p) => host + p)))];
  return purgeCloudflareCache({ files });
}

/**
 * Yang basi di edge setelah data, aset, atau master demo satu tema berubah: katalog publik, halaman demo tema itu, dan
 * berkas aset yang ditimpa dengan nama sama. Purge seluruh zona (dipakai sampai 18 Nov 2026) memaksa gambar, CSS, dan
 * font semua undangan diambil ulang dari server setiap admin menyimpan. Host apex dan www di-cache terpisah; Cloudflare
 * menerima paling banyak 30 URL per permintaan.
 */
export async function purgeThemeEdgeCache(
  themeId: string,
  assetPaths: string[] = [],
  opts: { pages?: boolean } = {},
): Promise<Awaited<ReturnType<typeof purgeCloudflareCache>>> {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!origin.startsWith("https://")) return { success: false, skipped: true, reason: "NEXT_PUBLIC_APP_URL bukan URL https" };
  const apex = new URL(origin).host.replace(/^www\./, "");
  const paths = [
    ...(opts.pages === false ? [] : ["/api/public/themes", `/demo/${themeId}`]),
    ...assetPaths.map((p) => p.split("?")[0]).filter((p) => p.startsWith("/")),
  ];
  const files = [...new Set([`https://${apex}`, `https://www.${apex}`].flatMap((host) => paths.map((p) => host + p)))];
  if (files.length === 0) return { success: true, skipped: true, reason: "tidak ada URL" };
  const results = [];
  for (let i = 0; i < files.length; i += 30) results.push(await purgeCloudflareCache({ files: files.slice(i, i + 30) }));
  const failed = results.find((r) => !r.success && !r.skipped);
  return failed ?? results[0];
}

/**
 * Cloudflare Cache Purge Utility
 * Digunakan untuk membersihkan edge cache Cloudflare secara terprogram.
 */
export async function purgeCloudflareCache(options?: {
  purgeEverything?: boolean;
  files?: string[];
}): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  errors?: any[];
  error?: string;
}> {
  const cfZoneId = process.env.CF_ZONE_ID;
  const cfApiToken = process.env.CF_API_TOKEN;

  if (!cfZoneId || !cfApiToken) {
    return {
      success: false,
      skipped: true,
      reason: "CF_ZONE_ID atau CF_API_TOKEN belum dikonfigurasi di environment",
    };
  }

  try {
    const payload =
      options?.files && options.files.length > 0 && !options?.purgeEverything
        ? { files: options.files }
        : { purge_everything: true };

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const cfData = await cfRes.json();
    return {
      success: cfData.success === true,
      ...(cfData.errors?.length ? { errors: cfData.errors } : {}),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Gagal menghubungi Cloudflare API",
    };
  }
}
