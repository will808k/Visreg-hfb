import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute("SELECT id, branch_id, isAdmin FROM users WHERE id = ?", [decoded.userId])
    const user = (userRows as any[])[0]

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let whereClause = "WHERE DATE(vis.sign_in_time) = CURDATE()"
    const queryParams: any[] = []

    // Add branch filtering for non-admin users
    if (!user.isAdmin && user.branch_id) {
      whereClause += " AND vis.branch_id = ?"
      queryParams.push(user.branch_id)
    }

    // Add status filtering
    if (status === "active") {
      whereClause += " AND vis.sign_out_time IS NULL"
    } else if (status === "inactive") {
      whereClause += " AND vis.sign_out_time IS NOT NULL"
    }

    const [visitors] = await pool.execute(
      `SELECT 
        vis.id,
        vis.digital_card_no,
        v.name,
        vis.reason,
        vis.office,
        vis.sign_in_time,
        vis.sign_out_time,
        vis.has_laptop,
        vis.laptop_brand,
        vis.laptop_model,
        vis.photo,
        b.name as branch_name,
        u.name as registered_by_name,
        v.visits as total_visits
      FROM visits vis
      JOIN visitors v ON vis.visitor_id = v.id
      LEFT JOIN branches b ON vis.branch_id = b.id
      LEFT JOIN users u ON vis.registered_by = u.id
      ${whereClause}
      ORDER BY vis.sign_in_time DESC`,
      queryParams,
    )

    // Convert photo buffer to base64 if present
    const formattedVisitors = (visitors as any[]).map((visitor) => ({
      ...visitor,
      photo: visitor.photo ? `data:image/jpeg;base64,${visitor.photo.toString("base64")}` : null,
    }))

    return NextResponse.json(formattedVisitors)
  } catch (error) {
    console.error("Error fetching today's visitors:", error)
    return NextResponse.json({ error: "Failed to fetch visitors" }, { status: 500 })
  }
}
