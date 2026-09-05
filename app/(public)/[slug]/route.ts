import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublishedHtml, buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { getPublicPlatformSettings } from "@/lib/settings";
import { STORAGE_PROVIDER, s3Client } from "@/lib/storage";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// Helper memeriksa keberadaan file portofolio
async function hasPortfolio(slug: string): Promise<boolean> {
  const localPortfolio = path.join(process.cwd(), "public", "portfolio", `${slug}.html`);
  try {
    await fs.promises.access(localPortfolio);
    return true;
  } catch {}

  if ((STORAGE_PROVIDER === "r2" || STORAGE_PROVIDER === "s3") && s3Client && process.env.S3_BUCKET_NAME) {
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `portfolio/${slug}.html`,
      }));
      return true;
    } catch {}
  }

  return false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { invitationSlug: slug },
    include: {
      order: { select: { planType: true } },
    },
  });

  if (!invitation) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Jika acara sudah selesai
  if (invitation.status === "EVENT_FINISHED") {
    // Jika paket PREMIUM (memiliki hak akses galeri kenangan tamu), alihkan ke /memories
    if (invitation.order?.planType === "PREMIUM") {
      const memoriesUrl = new URL(`/${slug}/memories`, req.url);
      memoriesUrl.search = req.nextUrl.search;
      return NextResponse.redirect(memoriesUrl);
    }

    // Untuk Traditional & Modern (tanpa galeri kenangan tamu): Tampilkan layar penutup resmi yang anggun
    const coupleName = `${invitation.groomNickname || "Mempelai"} & ${invitation.brideNickname || "Mempelai"}`;
    const finishedHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acara Telah Selesai — ${coupleName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: radial-gradient(circle at top, #1c1917 0%, #0c0a09 100%);
      color: #fafaf9;
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 500px;
      width: 100%;
      background: rgba(28, 25, 23, 0.9);
      border: 1px solid rgba(217, 119, 6, 0.25);
      border-radius: 1.5rem;
      padding: 2.75rem 2rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      background: rgba(217, 119, 6, 0.15);
      border: 1px solid rgba(217, 119, 6, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #fff; font-family: serif; }
    .couple { font-size: 1.1rem; color: #f59e0b; font-weight: 600; margin-bottom: 1.25rem; }
    p { font-size: 0.875rem; color: #d6d3d1; line-height: 1.7; margin-bottom: 1.5rem; }
    .footer { font-size: 0.75rem; color: #78716c; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.25rem; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Rangkaian Acara Selesai</span>
    <h1>Terima Kasih</h1>
    <div class="couple">${coupleName}</div>
    <p>Rangkaian acara pernikahan kami telah selesai dilaksanakan dengan khidmat, lancar, dan penuh kebahagiaan. Dari lubuk hati terdalam, kami mengucapkan terima kasih yang tulus kepada seluruh keluarga, kerabat, dan sahabat atas kehadiran, doa restu, serta berkah yang telah dicurahkan.</p>
    <div class="footer">Semoga kebaikan dan tali silaturahmi senantiasa tercurah untuk kita semua.</div>
  </div>
</body>
</html>`;

    return new NextResponse(finishedHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Jika undangan masih berstatus DRAFT (belum dipublikasikan)
  if (invitation.status === "DRAFT") {
    const isPreview = req.nextUrl.searchParams.get("preview") === "true";
    if (!isPreview) {
      const unreleasedHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Undangan Belum Dipublikasikan</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: radial-gradient(circle at top, #1c1917 0%, #0c0a09 100%);
      color: #fafaf9;
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: rgba(28, 25, 23, 0.85);
      border: 1px solid rgba(217, 119, 6, 0.25);
      border-radius: 1.5rem;
      padding: 2.5rem 2rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      background: rgba(217, 119, 6, 0.15);
      border: 1px solid rgba(217, 119, 6, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #f59e0b;
      margin-bottom: 1.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; color: #fff; }
    p { font-size: 0.875rem; color: #a8a29e; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Belum Dipublikasikan</span>
    <h1>Undangan Sedang Disiapkan</h1>
    <p>Halaman undangan pernikahan ini masih dalam tahap penyusunan dan belum dipublikasikan secara resmi oleh penyelenggara.</p>
  </div>
</body>
</html>`;

    return new NextResponse(unreleasedHtml, {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    }
  }

  // Jika undangan sudah berstatus ARCHIVED (masa galeri telah berakhir)
  if (invitation.status === "ARCHIVED") {
    const portfolioExists = await hasPortfolio(slug);
    if (portfolioExists) {
      return NextResponse.redirect(new URL(`/portfolio/${slug}`, req.url));
    }

    // Jika tidak ada portofolio, langsung alihkan ke halaman utama
    return NextResponse.redirect(new URL("/", req.url));
  }

  let html: string | null = null;
  const isPreview = req.nextUrl.searchParams.get("preview") === "true";

  if (invitation.status === "DRAFT" || isPreview) {
    // Mode DRAFT / Preview: Selalu render data mutakhir langsung dari DB (Dynamic Live Preview)
    const data = await composeTemplateData(invitation.id);
    if (data && invitation.themeId) {
      html = await renderTemplateFile(invitation.themeId, data, { editMode: false, invitationId: invitation.id });
    }
  } else {
    // Mode PUBLISHED: Gunakan file statis yang telah dibake (Zero Overhead)
    html = await getPublishedHtml(invitation.id);
    if (!html) {
      html = await buildAndSavePublishedHtml(invitation.id);
    }
  }

  if (!html) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Handle guest parameter dynamically if present
  const searchParams = req.nextUrl.searchParams;
  const to = searchParams.get('to') || searchParams.get('v');
  
  if (to) {
    // If the template engine uses a specific placeholder for the guest name, we can inject it here.
    // For now, the client-side JS typically reads the URL params, but if needed, we can replace it.
    // html = html.replace(/<span id="guest-name">.*?<\/span>/, `<span id="guest-name">${to}</span>`);
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
