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
    const visitorId = Number.parseInt(id);
    if (isNaN(visitorId)) {
      return NextResponse.json(
        { error: "Invalid visitor ID" },
        { status: 400 }
      );
    }

    // Sign out all active visits for this visitor today
    const [result] = await pool.execute(
      `UPDATE visits 
       SET sign_out_time = NOW(), signedout_by = ? 
       WHERE visitor_id = ? 
       AND DATE(sign_in_time) = CURDATE() 
       AND sign_out_time IS NULL`,
      [decoded.userId, visitorId]
    );

    const updateResult = result as any;
    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { error: "No active visits found for this visitor" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "All visits signed out successfully",
      visits_signed_out: updateResult.affectedRows,
    });
  } catch (error) {
    console.error("Error signing out visitor:", error);
    return NextResponse.json(
      { error: "Failed to sign out visitor" },
      { status: 500 }
    );
  }
}
