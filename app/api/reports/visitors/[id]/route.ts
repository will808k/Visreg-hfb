import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { id } = await params
    const visitorId = Number.parseInt(id)
    if (isNaN(visitorId)) {
      return NextResponse.json({ error: "Invalid visitor ID" }, { status: 400 })
    }

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute("SELECT id, branch_id, isAdmin FROM users WHERE id = ?", [decoded.userId])
    const user = (userRows as any[])[0]

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    // Get visitor details
    const [visitorRows] = await pool.execute(
      "SELECT id, name, visits, created_at, updated_at FROM visitors WHERE id = ?",
      [visitorId],
    )

    const visitorResults = visitorRows as any[]
    if (visitorResults.length === 0) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 })
    }

    const visitor = visitorResults[0]

    // Build branch filter for visits if user is not admin
    let branchFilter = ""
    const branchParams: any[] = []
    if (!user.isAdmin && user.branch_id) {
      branchFilter = " AND v.branch_id = ?"
      branchParams.push(user.branch_id)
    }

    // Get all visits for this visitor with detailed information
    const [visitsRows] = await pool.execute(
      `SELECT 
        v.id,
        v.digital_card_no,
        v.reason,
        v.office,
        v.has_laptop,
        v.laptop_brand,
        v.laptop_model,
        v.photo,
        v.id_photo_front,
        v.id_photo_back,
        v.signature,
        v.sign_in_time,
        v.sign_out_time,
        v.created_at,
        TIMESTAMPDIFF(MINUTE, v.sign_in_time, v.sign_out_time) as duration_minutes,
        b.name as branch_name,
        u.name as registered_by_name
      FROM visits v
      LEFT JOIN branches b ON v.branch_id = b.id
      LEFT JOIN users u ON v.registered_by = u.id
      WHERE v.visitor_id = ? ${branchFilter}
      ORDER BY v.sign_in_time DESC`,
      [visitorId, ...branchParams],
    )

    const visits = visitsRows as any[]

    // Calculate statistics
    const totalVisits = visits.length
    const completedVisits = visits.filter((visit) => visit.sign_out_time).length
    const activeVisits = totalVisits - completedVisits
    const avgDuration =
      completedVisits > 0
        ? Math.round(
            visits.filter((visit) => visit.duration_minutes).reduce((sum, visit) => sum + visit.duration_minutes, 0) /
              completedVisits,
          )
        : 0

    // Format visits data
    const formattedVisits = visits.map((visit) => ({
      id: visit.id,
      digital_card_no: visit.digital_card_no,
      reason: visit.reason,
      office: visit.office,
      has_laptop: Boolean(visit.has_laptop),
      laptop_brand: visit.laptop_brand,
      laptop_model: visit.laptop_model,
      photo: visit.photo ? Buffer.from(visit.photo).toString("base64") : null,
      id_photo_front: visit.id_photo_front ? Buffer.from(visit.id_photo_front).toString("base64") : null,
      id_photo_back: visit.id_photo_back ? Buffer.from(visit.id_photo_back).toString("base64") : null,
      signature: visit.signature ? Buffer.from(visit.signature).toString("base64") : null,
      sign_in_time: visit.sign_in_time,
      sign_out_time: visit.sign_out_time,
      duration_minutes: visit.duration_minutes,
      branch_name: visit.branch_name,
      registered_by_name: visit.registered_by_name,
      status: visit.sign_out_time ? "completed" : "active",
    }))

    return NextResponse.json({
      visitor: {
        id: visitor.id,
        name: visitor.name,
        total_visits: visitor.visits,
        created_at: visitor.created_at,
        updated_at: visitor.updated_at,
      },
      visits: formattedVisits,
      statistics: {
        total_visits: totalVisits,
        completed_visits: completedVisits,
        active_visits: activeVisits,
        avg_duration_minutes: avgDuration,
      },
    })
  } catch (error) {
    console.error("Visitor details error:", error)
    return NextResponse.json({ error: "Failed to fetch visitor details" }, { status: 500 })
  }
}
