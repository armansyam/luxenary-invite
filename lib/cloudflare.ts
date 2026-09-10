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
