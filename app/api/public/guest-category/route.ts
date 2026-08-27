import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");
  const name = searchParams.get("name");

  if (!invitationId || !name) {
    return NextResponse.json({ success: false, error: "Missing params" }, { status: 400 });
  }

  try {
    const guest = await prisma.guest.findFirst({
      where: {
        invitationId,
        name: name
      },
      select: { category: true }
    });

    return NextResponse.json(
      { success: true, category: guest?.category || "Umum" },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
