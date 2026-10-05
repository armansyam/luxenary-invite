/**
 * Pemeriksaan environment saat server start (dipanggil dari instrumentation.ts).
 *
 * - `fatal`: tanpa nilai ini aplikasi tidak dapat melayani apa pun; di produksi server menolak start.
 * - `problems`: fitur tertentu akan gagal saat dipakai; dicatat sebagai galat di log tanpa menghentikan server,
 *   karena menghentikan start akibat fitur sampingan lebih merugikan daripada fitur itu sendiri gagal.
 *
 * Hanya nama variabel yang dilaporkan, tidak pernah nilainya.
 */
export type EnvReport = { fatal: string[]; problems: string[] };

type Env = Record<string, string | undefined>;

const present = (env: Env, key: string) => Boolean(env[key]?.trim());

export function checkServerEnv(env: Env = process.env): EnvReport {
  const fatal: string[] = [];
  const problems: string[] = [];

  if (!present(env, "DATABASE_URL")) fatal.push("DATABASE_URL belum diisi");
  if (!present(env, "AUTH_SECRET") && !present(env, "NEXTAUTH_SECRET")) {
    fatal.push("AUTH_SECRET (atau NEXTAUTH_SECRET) belum diisi: sesi login, token pratinjau, dan token resepsionis tidak dapat ditandatangani");
  }

  const pinKey = env.PIN_ENCRYPTION_KEY?.trim();
  if (!pinKey) {
    problems.push("PIN_ENCRYPTION_KEY belum diisi: PIN resepsionis tidak dapat dienkripsi");
  } else if (!/^[0-9a-fA-F]{64}$/.test(pinKey)) {
    problems.push("PIN_ENCRYPTION_KEY harus 64 karakter hex (32 byte)");
  }

  const provider = env.STORAGE_PROVIDER?.trim() || "local";
  if (!["local", "r2", "s3"].includes(provider)) {
    problems.push(`STORAGE_PROVIDER "${provider}" tidak dikenal; yang sah: local, r2, s3`);
  } else if (provider !== "local") {
    for (const key of ["S3_ENDPOINT", "S3_BUCKET_NAME", "S3_ACCESS_KEY", "S3_SECRET_KEY"]) {
      if (!present(env, key)) problems.push(`${key} belum diisi padahal STORAGE_PROVIDER=${provider}`);
    }
    if (!present(env, "S3_CUSTOM_DOMAIN") && !present(env, "S3_PUBLIC_URL")) {
      problems.push(`S3_CUSTOM_DOMAIN (atau S3_PUBLIC_URL) belum diisi: URL berkas yang diunggah ke ${provider} tidak dapat dibentuk`);
    }
  }

  // Nama yang mirip tetapi tidak pernah dibaca kode; nilainya diam-diam diabaikan.
  const misnamed: Record<string, string> = {
    S3_BUCKET: "S3_BUCKET_NAME",
    S3_ACCESS_KEY_ID: "S3_ACCESS_KEY",
    S3_SECRET_ACCESS_KEY: "S3_SECRET_KEY",
  };
  for (const [wrong, right] of Object.entries(misnamed)) {
    if (present(env, wrong) && !present(env, right)) {
      problems.push(`${wrong} diisi tetapi kode membaca ${right}`);
    }
  }

  if (!present(env, "CRON_SECRET")) {
    problems.push("CRON_SECRET belum diisi: endpoint cron hanya dapat dipanggil dari sesi admin");
  }

  return { fatal, problems };
}
