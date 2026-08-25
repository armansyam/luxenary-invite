import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const body = await req.json();
    const clientId = String(body.clientId || "").trim();
    const clientSecret = String(body.clientSecret || "").trim();

    if (!clientId) {
      return NextResponse.json(
        { success: false, message: "Google Client ID tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!clientId.includes(".apps.googleusercontent.com")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Format Client ID tidak valid. Harus berakhiran '.apps.googleusercontent.com' dari Google Cloud Console.",
        },
        { status: 400 }
      );
    }

    // Probe Google OAuth Token Endpoint
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    if (clientSecret) {
      params.append("client_secret", clientSecret);
    }
    params.append("code", "probe_test_token_validation");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const protocol = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    const appOrigin = host ? `${protocol}://${host}` : (process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000");

    params.append("redirect_uri", `${appOrigin}/api/auth/callback/google`);

    const googleRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const googleData = await googleRes.json();

    // Analysis:
    // If invalid_client -> Google rejects client_id or client_secret
    if (googleData.error === "invalid_client") {
      return NextResponse.json({
        success: false,
        errorType: "invalid_client",
        message:
          googleData.error_description ||
          "Google menolak kredensial: Client ID atau Client Secret tidak cocok / tidak terdaftar di Google Cloud Console.",
      });
    }

    // If invalid_grant / invalid_request -> Google authenticated the client successfully!
    if (
      googleData.error === "invalid_grant" ||
      googleData.error === "invalid_request" ||
      googleData.error_description?.includes("Malformed") ||
      googleData.error_description?.includes("code") ||
      googleData.error_description?.includes("grant")
    ) {
      return NextResponse.json({
        success: true,
        message:
          "✓ Kredensial Google OAuth 2.0 Valid! Google Server berhasil memverifikasi Client ID & Secret Anda.",
      });
    }

    // Fallback if unexpected error
    return NextResponse.json({
      success: false,
      message: `Respon Google: ${googleData.error || "Gagal memverifikasi"} - ${googleData.error_description || ""}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Gagal menghubungi server Google: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
