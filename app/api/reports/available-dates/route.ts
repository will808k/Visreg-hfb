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

    // Build query to get distinct dates with visits
    let whereClause = ""
    const params: any[] = []

    // Add branch filtering for non-admin users
    if (!user.isAdmin && user.branch_id) {
      whereClause = "WHERE v.branch_id = ?"
      params.push(user.branch_id)
    }

    const query = `
      SELECT DISTINCT DATE(v.sign_in_time) as visit_date
      FROM visits v
      ${whereClause}
      ORDER BY visit_date DESC
      LIMIT 30
    `

    const [dates] = await pool.execute(query, params)

    const availableDates = (dates as any[]).map((row) => {
      // Format the date as YYYY-MM-DD
      const date = new Date(row.visit_date)
      return date.toISOString().split("T")[0]
    })

    return NextResponse.json(availableDates)
  } catch (error) {
    console.error("Error fetching available dates:", error)
    return NextResponse.json({ error: "Failed to fetch available dates" }, { status: 500 })
  }
}
