import { HttpError } from "@/lib/routeError";

/** Body JSON rusak adalah kesalahan pengirim (400), bukan galat server; `routeError` meneruskan HttpError apa adanya. */
export async function readJsonBody<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Format data tidak valid.");
  }
}

/** Body bukan multipart/form-data (atau terpotong) adalah kesalahan pengirim (400). */
export async function readFormBody(req: Request): Promise<FormData> {
  try {
    return await req.formData();
  } catch {
    throw new HttpError(400, "Data formulir tidak valid. Kirim ulang berkas lewat formulir unggah.");
  }
}
