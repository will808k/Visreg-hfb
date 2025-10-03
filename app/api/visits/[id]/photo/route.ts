import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(
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
    const { searchParams } = new URL(request.url);
    const photoType = searchParams.get("type") || "photo";

    // Map photo types to database columns
    const photoColumnMap = {
      photo: "photo",
      id_front: "id_photo_front",
      id_back: "id_photo_back",
      signature: "signature",
    };

    const columnName =
      photoColumnMap[photoType as keyof typeof photoColumnMap] || "photo";

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute(
      "SELECT id, branch_id, isAdmin FROM users WHERE id = ?",
      [decoded.userId]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get the photo from the specific visit
    let query = `
      SELECT ${columnName}
      FROM visits v
      WHERE v.id = ?
    `;

    const params_array: any[] = [id];

    // Add branch filtering for non-admin users
    if (!user.isAdmin && user.branch_id) {
      query += " AND v.branch_id = ?";
      params_array.push(user.branch_id);
    }

    const [photoRows] = await pool.execute(query, params_array);
    const photoData = (photoRows as any[])[0];

    if (!photoData || !photoData[columnName]) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Convert buffer to base64
    const photoBase64 = photoData[columnName].toString("base64");

    return NextResponse.json({
      photo: photoBase64,
    });
  } catch (error) {
    console.error("Photo fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}
