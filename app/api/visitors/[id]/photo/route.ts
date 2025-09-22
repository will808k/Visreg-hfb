import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const visitorId = params.id;
    const { searchParams } = new URL(request.url);
    const photoType = searchParams.get("type") || "photo"; // photo, id_front, id_back

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute(
      "SELECT id, branch_id, isAdmin FROM users WHERE id = ?",
      [decoded.userId]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Build the query based on photo type
    let photoColumn = "v.photo";
    if (photoType === "id_front") {
      photoColumn = "v.id_photo_front";
    } else if (photoType === "id_back") {
      photoColumn = "v.id_photo_back";
    }

    // Build WHERE clause with branch filtering
    let whereClause = "WHERE v.visitor_id = ?";
    const queryParams: any[] = [visitorId];

    if (!user.isAdmin && user.branch_id) {
      whereClause += " AND v.branch_id = ?";
      queryParams.push(user.branch_id);
    }

    const [visits] = await pool.execute(
      `
      SELECT ${photoColumn} as photo_data
      FROM visits v
      ${whereClause}
      ORDER BY v.sign_in_time DESC
      LIMIT 1
      `,
      queryParams
    );

    const visit = (visits as any[])[0];
    if (!visit || !visit.photo_data) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Convert BLOB to base64
    const photoBase64 = Buffer.from(visit.photo_data).toString("base64");

    return NextResponse.json({
      photo: photoBase64,
      type: photoType,
      visitor_id: visitorId,
    });
  } catch (error) {
    console.error("Error fetching visitor photo:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}
