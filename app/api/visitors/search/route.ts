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
    // Fix: Look for 'phone' parameter instead of 'q'
    const phoneQuery = searchParams.get("phone")
    const generalQuery = searchParams.get("q")

    const query = phoneQuery || generalQuery

    if (!query || query.length < 3) {
      return NextResponse.json([])
    }

    // Search for visitors by phone number (primary) and name (secondary)
    const [visitors] = await pool.execute(
      `
      SELECT 
        v.id,
        v.name,
        v.phone_number,
        v.visits,
        v.created_at,
        (
          SELECT MAX(vis.sign_in_time)
          FROM visits vis 
          WHERE vis.visitor_id = v.id
        ) as last_visit,
        (
          SELECT JSON_OBJECT(
            'reason', vis2.reason,
            'office', vis2.office,
            'has_laptop', vis2.has_laptop,
            'laptop_brand', vis2.laptop_brand,
            'laptop_model', vis2.laptop_model
          )
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_visit_details
      FROM visitors v
      WHERE v.phone_number LIKE ? OR v.name LIKE ?
      ORDER BY v.created_at DESC
      LIMIT 10`,
      [`%${query}%`, `%${query}%`],
    )

    const formattedVisitors = (visitors as any[]).map((visitor) => ({
      id: visitor.id,
      name: visitor.name,
      phone_number: visitor.phone_number,
      visits: visitor.visits,
      last_visit: visitor.last_visit,
      last_visit_details: visitor.last_visit_details ? JSON.parse(visitor.last_visit_details) : null,
    }))

    return NextResponse.json(formattedVisitors)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
