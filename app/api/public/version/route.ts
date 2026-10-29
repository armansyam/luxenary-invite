import { NextResponse } from "next/server";
import { exec } from "child_process";
import packageJson from "@/package.json";

// Commit tidak berubah selama proses hidup; tanpa memo, setiap permintaan publik memunculkan proses git baru.
let commitHash: Promise<string> | null = null;

function getCurrentCommitHash(): Promise<string> {
  return (commitHash ??= new Promise((resolve) => {
    const envCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || process.env.COMMIT_HASH;
    if (envCommit) return resolve(envCommit.substring(0, 7));

    exec("git rev-parse --short HEAD", { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) return resolve("");
      resolve(stdout.trim());
    });
  }));
}

export async function GET() {
  const hash = await getCurrentCommitHash();
  const releaseTag = hash ? `v${packageJson.version} (${hash})` : `v${packageJson.version}`;

  return NextResponse.json({
    success: true,
    version: packageJson.version,
    hash: hash || undefined,
    release: releaseTag,
    updateAvailable: false,
  });
}
