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

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const vendorFilter = searchParams.get("vendor") || "all"
    const offset = (page - 1) * limit

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute("SELECT id, branch_id, isAdmin FROM users WHERE id = ?", [decoded.userId])
    const user = (userRows as any[])[0]

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    // Build parameters array
    const params: any[] = []
    let whereClause = ""

    // Add search filtering
    if (search.trim()) {
      whereClause += " AND vis.name LIKE ?"
      params.push(`%${search}%`)
    }

    // Add vendor filtering
    if (vendorFilter === "vendors") {
      whereClause += " AND EXISTS (SELECT 1 FROM visits v WHERE v.visitor_id = vis.id AND v.company IS NOT NULL)"
    } else if (vendorFilter === "regular") {
      whereClause += " AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.visitor_id = vis.id AND v.company IS NOT NULL)"
    }

    // Add branch filtering for non-admin users
    if (!user.isAdmin && user.branch_id) {
      whereClause += " AND EXISTS (SELECT 1 FROM visits v WHERE v.visitor_id = vis.id AND v.branch_id = ?)"
      params.push(user.branch_id)
    }

    // Simple query - just get visitor info and their visit count
    const visitorsQuery = `
      SELECT 
        vis.id,
        vis.name,
        vis.visits as visit_count,
        vis.created_at,
        vis.updated_at as last_visit
      FROM visitors vis
      WHERE 1=1 ${whereClause}
      ORDER BY vis.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    console.log("Visitors Query:", visitorsQuery)
    console.log("Params:", params)

    const [visitors] = await pool.execute(visitorsQuery, params)

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM visitors vis
      WHERE 1=1 ${whereClause}
    `

    const [countResult] = await pool.execute(countQuery, params)
    const total = (countResult as any[])[0].total
    const totalPages = Math.ceil(total / limit)

    // Format the response data
    const formattedVisitors = (visitors as any[]).map((visitor) => ({
      id: visitor.id,
      name: visitor.name,
      visit_count: visitor.visit_count || 0,
      avg_duration_minutes: 0, // Remove this complexity
      last_visit: visitor.last_visit || visitor.created_at,
      total_visits: visitor.visit_count || 0,
    }))

    return NextResponse.json({
      visitors: formattedVisitors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Reports error:", error)
    return NextResponse.json({ error: "Failed to fetch visitor reports" }, { status: 500 })
  }
}
