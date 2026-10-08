import dns from "dns";
import { prisma } from "@/lib/prisma";

export interface DomainDnsCheck {
  pointsToUs: boolean;
  detectedA: string[];
  detectedCname: string[];
  wwwDetectedA: string[];
  wwwDetectedCname: string[];
  expectedIp: string;
  expectedCname: string;
}

const stripDot = (name: string) => name.toLowerCase().replace(/\.$/, "");

/** Domain tanpa A/CNAME (NXDOMAIN, ENODATA, timeout) diperlakukan sebagai belum mengarah ke platform. */
async function resolveOrEmpty(resolve: () => Promise<string[]>): Promise<string[]> {
  try {
    return await resolve();
  } catch {
    return [];
  }
}

/**
 * Bukti kepemilikan custom domain: DNS domain (atau www-nya) harus mengarah ke IP server atau CNAME target
 * platform. Hanya pemilik domain yang dapat mengubah DNS-nya, sehingga domain orang lain tidak dapat diklaim.
 */
export async function checkDomainPointsToPlatform(domain: string): Promise<DomainDnsCheck> {
  const [ipSetting, cnameSetting] = await Promise.all([
    prisma.adminSetting.findUnique({ where: { key: "server_public_ip" } }),
    prisma.adminSetting.findUnique({ where: { key: "cname_target" } }),
  ]);
  const expectedIp = (ipSetting?.value || process.env.SERVER_PUBLIC_IP || "").trim();
  const expectedCname = stripDot((cnameSetting?.value || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").trim());

  const resolver = new dns.promises.Resolver({ timeout: 4000, tries: 1 });
  const withWww = !domain.startsWith("www.");
  const [detectedA, detectedCname, wwwDetectedA, wwwDetectedCname] = await Promise.all([
    resolveOrEmpty(() => resolver.resolve4(domain)),
    resolveOrEmpty(() => resolver.resolveCname(domain)),
    withWww ? resolveOrEmpty(() => resolver.resolve4(`www.${domain}`)) : Promise.resolve([]),
    withWww ? resolveOrEmpty(() => resolver.resolveCname(`www.${domain}`)) : Promise.resolve([]),
  ]);

  const cnameMatches = (records: string[]) => Boolean(expectedCname) && records.some((c) => stripDot(c) === expectedCname);
  const pointsToUs =
    (Boolean(expectedIp) && detectedA.includes(expectedIp)) || cnameMatches(detectedCname) || cnameMatches(wwwDetectedCname);

  return { pointsToUs, detectedA, detectedCname, wwwDetectedA, wwwDetectedCname, expectedIp, expectedCname };
}
