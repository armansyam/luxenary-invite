import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";
import { forwardException } from "@/lib/errorTracker";

/**
 * Galat yang pesannya memang ditujukan ke pengguna (validasi atau aturan bisnis). Dilempar dari dalam handler atau
 * transaksi agar `routeError` meneruskan pesan dan statusnya apa adanya.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Respons untuk `catch` terakhir sebuah route handler. `HttpError` diteruskan; galat lain dianggap tak terduga:
 * dicatat lewat `logger.error`, dan di produksi pesannya diganti `message` agar detail internal (Prisma, SDK,
 * path berkas) tidak sampai ke klien.
 */
export function routeError(context: string, err: unknown, message = "Terjadi kesalahan server"): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  // Pelanggaran unik dan baris yang hilang di tengah jalan adalah hasil balapan permintaan, bukan galat server.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      logger.warn(context, "Permintaan bentrok dengan data yang sudah ada", { target: err.meta?.target });
      return NextResponse.json({ error: "Data yang sama sudah ada. Muat ulang lalu coba lagi." }, { status: 409 });
    }
    if (err.code === "P2025") {
      logger.warn(context, "Data yang diubah tidak ditemukan", { cause: err.meta?.cause });
      return NextResponse.json({ error: "Data tidak ditemukan atau sudah dihapus." }, { status: 404 });
    }
  }
  logger.error(context, message, err);
  forwardException(err, { tags: { route: context } });
  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: process.env.NODE_ENV === "production" ? message : detail }, { status: 500 });
}
