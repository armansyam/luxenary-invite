import { getPublicPlatformSettings } from "@/lib/settings";
import { getApexRootDomain } from "@/lib/domainUtils";
import RegisterClient from "./RegisterClient";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const settings = await getPublicPlatformSettings();
  const rootDomain = getApexRootDomain();
  
  return <RegisterClient packages={settings.packages} rootDomain={rootDomain} />;
}
