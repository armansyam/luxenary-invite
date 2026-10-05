import { describe, it, expect, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { HttpError, routeError } from "@/lib/routeError";
import { logger } from "@/lib/logger";

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("detail internal Prisma", { code, clientVersion: "test" });

describe("routeError", () => {
  const error = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);

  afterEach(() => {
    vi.unstubAllEnvs();
    error.mockClear();
    warn.mockClear();
  });

  it("HttpError diteruskan apa adanya tanpa dicatat sebagai galat", async () => {
    const res = routeError("Uji", new HttpError(400, "Kode promo tidak ditemukan."));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Kode promo tidak ditemukan." });
    expect(error).not.toHaveBeenCalled();
  });

  it("galat tak terduga dicatat, dan di produksi pesannya diganti pesan umum", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = routeError("Uji", new Error("relation \"orders\" does not exist"), "Gagal memuat");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Gagal memuat" });
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("di luar produksi detail galat ditampilkan untuk debugging", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = routeError("Uji", new Error("detail"), "Gagal memuat");
    expect(await res.json()).toEqual({ error: "detail" });
  });

  it("pelanggaran unik Prisma (P2002) menjadi 409 tanpa membocorkan detail", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = routeError("Uji", prismaError("P2002"));
    expect(res.status).toBe(409);
    expect(JSON.stringify(await res.json())).not.toContain("Prisma");
    expect(error).not.toHaveBeenCalled();
  });

  it("baris yang hilang (P2025) menjadi 404", async () => {
    const res = routeError("Uji", prismaError("P2025"));
    expect(res.status).toBe(404);
  });

  it("galat Prisma lain (mis. FK P2003) tetap 500", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = routeError("Uji", prismaError("P2003"), "Gagal menyimpan");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Gagal menyimpan" });
  });
});
