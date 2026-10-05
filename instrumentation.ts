import type { Instrumentation } from "next";

export async function register() {
  // Pemeriksaan memakai modul Node (logger menulis ke process.stdout); runtime edge tidak perlu memeriksa ulang.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkServerEnv } = await import("./lib/env");
  const { logger } = await import("./lib/logger");
  const { fatal, problems } = checkServerEnv();

  for (const problem of problems) logger.error("EnvCheck", problem);
  if (fatal.length === 0) return;

  for (const message of fatal) logger.error("EnvCheck", message);
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Konfigurasi environment tidak lengkap: ${fatal.join("; ")}`);
  }
}

/** Galat server yang tidak ditangkap route handler (render halaman, server action) diteruskan ke pelacak galat. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureException } = await import("./lib/errorTracker");
  captureException(err, {
    path: request.path,
    method: request.method,
    tags: { routerKind: context.routerKind, routeType: context.routeType },
    extra: { routePath: context.routePath },
  });
};
