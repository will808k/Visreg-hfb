import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const visitorId = Number.parseInt(params.id)
    if (isNaN(visitorId)) {
      return NextResponse.json({ error: "Invalid visitor ID" }, { status: 400 })
    }

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute("SELECT id, branch_id, isAdmin FROM users WHERE id = ?", [decoded.userId])
    const user = (userRows as any[])[0]

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    // Get visitor basic info
    const [visitorRows] = await pool.execute(
      "SELECT id, name, visits as total_visits, created_at, updated_at FROM visitors WHERE id = ?",
      [visitorId],
    )

    if ((visitorRows as any[]).length === 0) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 })
    }

    const visitor = (visitorRows as any[])[0]

    // Build where clause for branch filtering
    let whereClause = "WHERE vis.visitor_id = ?"
    const queryParams = [visitorId]

    // Add branch filtering for non-admin users
    if (!user.isAdmin && user.branch_id) {
      whereClause += " AND vis.branch_id = ?"
      queryParams.push(user.branch_id)
    }

    // Get all visits for this visitor
    const [visitsRows] = await pool.execute(
      `SELECT 
        vis.id,
        vis.digital_card_no,
        vis.reason,
        vis.office,
        vis.has_laptop,
        vis.laptop_brand,
        vis.laptop_model,
        vis.company,
        vis.person_in_charge,
        vis.photo,
        vis.id_photo_front,
        vis.id_photo_back,
        vis.signature,
        vis.sign_in_time,
        vis.sign_out_time,
        CASE 
          WHEN vis.sign_out_time IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, vis.sign_in_time, vis.sign_out_time)
          ELSE NULL 
        END as duration_minutes,
        b.name as branch_name,
        u.name as registered_by_name,
        CASE 
          WHEN vis.sign_out_time IS NULL THEN 'active'
          ELSE 'completed'
        END as status
      FROM visits vis
      LEFT JOIN branches b ON vis.branch_id = b.id
      LEFT JOIN users u ON vis.registered_by = u.id
      ${whereClause}
      ORDER BY vis.sign_in_time DESC`,
      queryParams,
    )

    // Convert photo buffers to base64
    const visits = (visitsRows as any[]).map((visit) => ({
      ...visit,
      photo: visit.photo ? visit.photo.toString("base64") : null,
      id_photo_front: visit.id_photo_front ? visit.id_photo_front.toString("base64") : null,
      id_photo_back: visit.id_photo_back ? visit.id_photo_back.toString("base64") : null,
      signature: visit.signature ? visit.signature.toString("base64") : null,
    }))

    // Calculate statistics
    const totalVisits = visits.length
    const completedVisits = visits.filter((v) => v.status === "completed").length
    const activeVisits = visits.filter((v) => v.status === "active").length
    const avgDuration =
      completedVisits > 0
        ? Math.round(
            visits.filter((v) => v.duration_minutes !== null).reduce((sum, v) => sum + (v.duration_minutes || 0), 0) /
              completedVisits,
          )
        : 0

    const statistics = {
      total_visits: totalVisits,
      completed_visits: completedVisits,
      active_visits: activeVisits,
      avg_duration_minutes: avgDuration,
    }

    return NextResponse.json({
      visitor,
      visits,
      statistics,
    })
  } catch (error) {
    console.error("Error fetching visitor details:", error)
    return NextResponse.json({ error: "Failed to fetch visitor details" }, { status: 500 })
  }
}
