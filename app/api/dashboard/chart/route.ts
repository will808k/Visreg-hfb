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
    const mode = searchParams.get("mode") || "visits"
    const range = searchParams.get("range") || "daily"

    let query = ""
    let data: any[] = []

    if (mode === "visits") {
      if (range === "daily") {
        query = `
          SELECT HOUR(sign_in_time) as hour, COUNT(*) as count
          FROM visits 
          WHERE DATE(sign_in_time) = CURDATE()
          GROUP BY HOUR(sign_in_time)
          ORDER BY hour
        `
        const [rows] = await pool.execute(query)
        data = Array.from({ length: 24 }, (_, i) => {
          const found = (rows as any[]).find((row) => row.hour === i)
          return {
            period: `${i}:00`,
            count: found ? found.count : 0,
          }
        })
      } else if (range === "monthly") {
        query = `
          SELECT DAY(sign_in_time) as day, COUNT(*) as count
          FROM visits 
          WHERE MONTH(sign_in_time) = MONTH(CURDATE()) 
          AND YEAR(sign_in_time) = YEAR(CURDATE())
          GROUP BY DAY(sign_in_time)
          ORDER BY day
        `
        const [rows] = await pool.execute(query)
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
        data = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const found = (rows as any[]).find((row) => row.day === day)
          return {
            period: day.toString(),
            count: found ? found.count : 0,
          }
        })
      } else if (range === "yearly") {
        query = `
          SELECT MONTH(sign_in_time) as month, COUNT(*) as count
          FROM visits 
          WHERE YEAR(sign_in_time) = YEAR(CURDATE())
          GROUP BY MONTH(sign_in_time)
          ORDER BY month
        `
        const [rows] = await pool.execute(query)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        data = months.map((month, i) => {
          const found = (rows as any[]).find((row) => row.month === i + 1)
          return {
            period: month,
            count: found ? found.count : 0,
          }
        })
      }
    } else if (mode === "duration") {
      if (range === "monthly") {
        query = `
          SELECT DAY(sign_in_time) as day, 
                 AVG(TIMESTAMPDIFF(MINUTE, sign_in_time, sign_out_time)) as duration
          FROM visits 
          WHERE MONTH(sign_in_time) = MONTH(CURDATE()) 
          AND YEAR(sign_in_time) = YEAR(CURDATE())
          AND sign_out_time IS NOT NULL
          GROUP BY DAY(sign_in_time)
          ORDER BY day
        `
        const [rows] = await pool.execute(query)
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
        data = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const found = (rows as any[]).find((row) => row.day === day)
          return {
            period: day.toString(),
            duration: found ? Math.round(found.duration) : 0,
          }
        })
      } else if (range === "yearly") {
        query = `
          SELECT MONTH(sign_in_time) as month, 
                 AVG(TIMESTAMPDIFF(MINUTE, sign_in_time, sign_out_time)) as duration
          FROM visits 
          WHERE YEAR(sign_in_time) = YEAR(CURDATE())
          AND sign_out_time IS NOT NULL
          GROUP BY MONTH(sign_in_time)
          ORDER BY month
        `
        const [rows] = await pool.execute(query)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        data = months.map((month, i) => {
          const found = (rows as any[]).find((row) => row.month === i + 1)
          return {
            period: month,
            duration: found ? Math.round(found.duration) : 0,
          }
        })
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Chart data error:", error)
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
  }
}
