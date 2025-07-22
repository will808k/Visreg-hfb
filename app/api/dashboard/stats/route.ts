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

    // Total visits from the visits table
    const [totalVisitsResult] = await pool.execute("SELECT COUNT(*) as count FROM visits")
    const totalVisits = (totalVisitsResult as any[])[0].count

    // Average duration (in minutes) from visits table
    const [avgDurationResult] = await pool.execute(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, sign_in_time, sign_out_time)) as avg_duration 
      FROM visits 
      WHERE sign_out_time IS NOT NULL
    `)
    const averageDuration = (avgDurationResult as any[])[0].avg_duration || 0

    // Total active users
    const [totalUsersResult] = await pool.execute("SELECT COUNT(*) as count FROM users WHERE is_active = TRUE")
    const totalUsers = (totalUsersResult as any[])[0].count

    // Today's visits from visits table
    const [todayVisitsResult] = await pool.execute(`
      SELECT COUNT(*) as count FROM visits 
      WHERE DATE(sign_in_time) = CURDATE()
    `)
    const todayVisits = (todayVisitsResult as any[])[0].count

    // Unique visitors count
    const [uniqueVisitorsResult] = await pool.execute(`
      SELECT COUNT(DISTINCT visitor_id) as count FROM visits
    `)
    const uniqueVisitors = (uniqueVisitorsResult as any[])[0].count

    // Active visits (signed in but not signed out)
    const [activeVisitsResult] = await pool.execute(`
      SELECT COUNT(*) as count FROM visits 
      WHERE sign_out_time IS NULL
    `)
    const activeVisits = (activeVisitsResult as any[])[0].count

    return NextResponse.json({
      totalVisits,
      averageDuration: Math.round(averageDuration),
      totalUsers,
      todayVisits,
      uniqueVisitors,
      activeVisits,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
