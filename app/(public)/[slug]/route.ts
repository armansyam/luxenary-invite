import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublishedHtml, buildAndSavePublishedHtml } from "@/lib/staticPublisher";
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
  });

  if (!invitation) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Jika acara sudah selesai (dalam masa galeri), alihkan otomatis ke Galeri Momen
  if (invitation.status === "EVENT_FINISHED") {
    const memoriesUrl = new URL(`/${slug}/memories`, req.url);
    memoriesUrl.search = req.nextUrl.search;
    return NextResponse.redirect(memoriesUrl);
  }

  // Jika undangan sudah berstatus ARCHIVED (masa galeri telah berakhir)
  if (invitation.status === "ARCHIVED") {
    const portfolioExists = await hasPortfolio(slug);
    if (portfolioExists) {
      return NextResponse.redirect(new URL(`/portfolio/${slug}`, req.url));
    }

    // Jika tidak ada portofolio, tampilkan Halaman Penutupan Elegan (Graceful Expired)
    const settings = await getPublicPlatformSettings();
    const platformName = settings.platformName || "Platform Kami";

    const expiredHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Masa Aktif Undangan Berakhir — ${platformName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: radial-gradient(circle at top, #1c1917 0%, #0c0a09 100%);
      color: #fafaf9;
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      max-width: 460px;
      width: 100%;
      background: rgba(28, 25, 23, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(217, 119, 6, 0.25);
      border-radius: 1.75rem;
      padding: 2.5rem 2rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .brand {
      font-family: 'Cinzel', serif;
      font-size: 0.85rem;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #d97706;
      margin-bottom: 1.5rem;
    }
    .icon-badge {
      width: 3.75rem;
      height: 3.75rem;
      margin: 0 auto 1.25rem;
      border-radius: 1.25rem;
      background: rgba(217, 119, 6, 0.1);
      border: 1px solid rgba(217, 119, 6, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    h1 {
      font-size: 1.3rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.75rem;
      line-height: 1.35;
    }
    p {
      font-size: 0.875rem;
      line-height: 1.6;
      color: #a8a29e;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 0.875rem 1.5rem;
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.875rem;
      border-radius: 1rem;
      box-shadow: 0 10px 20px -5px rgba(217, 119, 6, 0.3);
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">${platformName}</div>
    <div class="icon-badge">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h1>Masa Aktif Undangan Telah Berakhir</h1>
    <p>Acara pernikahan ini telah selesai diselenggarakan dan masa tayang undangan digital telah berakhir. Terima kasih atas segala doa restu dan perhatian yang telah diberikan.</p>
    <a href="/" class="btn">Kunjungi Halaman Utama ${platformName} &rarr;</a>
  </div>
</body>
</html>`;

    return new NextResponse(expiredHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 1. Direct Static Serving: Load standalone HTML file if already baked
  let html = await getPublishedHtml(invitation.id);

  // 2. If not baked yet, compile standalone HTML and save for future instant requests
  if (!html) {
    html = await buildAndSavePublishedHtml(invitation.id);
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
