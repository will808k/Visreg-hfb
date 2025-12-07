import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const visitId = Number.parseInt(id);
    if (isNaN(visitId)) {
      return NextResponse.json({ error: "Invalid visit ID" }, { status: 400 });
    }

    // Get request body for leftwithdevice data
    const body = await request.json().catch(() => ({}));
    const leftwithdevice = body.leftwithdevice || null;

    // Check if visit exists and is not already signed out
    const [visitCheck] = await pool.execute(
      "SELECT id, sign_out_time FROM visits WHERE id = ?",
      [visitId]
    );

    if ((visitCheck as any[]).length === 0) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const visit = (visitCheck as any[])[0];
    if (visit.sign_out_time) {
      return NextResponse.json(
        { error: "Visitor already signed out" },
        { status: 400 }
      );
    }

    // Update the visit with sign out time, signed out by user, and leftwithdevice
    await pool.execute(
      "UPDATE visits SET sign_out_time = NOW(), signedout_by = ?, leftwithdevice = ? WHERE id = ?",
      [decoded.userId, leftwithdevice, visitId]
    );

    return NextResponse.json({
      success: true,
      message: "Visitor signed out successfully",
    });
  } catch (error) {
    console.error("Sign out error:", error);
    return NextResponse.json(
      { error: "Failed to sign out visitor" },
      { status: 500 }
    );
  }
}
