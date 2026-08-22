import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;

  // Extract subdomain from hostname (e.g., adi-irma.invited.id -> adi-irma)
  const hostname = process.env.NEXT_PUBLIC_BASE_DOMAIN || "invited.id";
  const fullSubdomain = subdomain.replace(`.${hostname}`, "");

  const invitation = await prisma.invitation.findUnique({
    where: { subdomain: fullSubdomain },
  });

  if (!invitation || invitation.status !== "PUBLISHED") {
    notFound();
  }

  const data = await composeTemplateData(invitation.id);
  if (!data) notFound();

  const html = renderTemplateFile("kila", data);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}