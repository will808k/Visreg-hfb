import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET() {
  try {
    // Get branches with their offices and reasons from separate tables
    const [rows] = await pool.execute(`
      SELECT 
        b.id,
        b.name,
        b.location,
        b.created_at,
        b.updated_at,
        GROUP_CONCAT(DISTINCT bo.office_name ORDER BY bo.office_name) as offices_string,
        GROUP_CONCAT(DISTINCT br.reason_name ORDER BY br.reason_name) as reasons_string
      FROM branches b
      LEFT JOIN branch_offices bo ON b.id = bo.branch_id
      LEFT JOIN branch_reasons br ON b.id = br.branch_id
      GROUP BY b.id, b.name, b.location, b.created_at, b.updated_at
      ORDER BY b.name
    `)

    if (!Array.isArray(rows)) {
      console.log("No branches found or invalid response")
      return NextResponse.json([])
    }

    const branches = (rows as any[]).map((branch) => {
      // Convert comma-separated strings back to arrays
      const offices = branch.offices_string ? branch.offices_string.split(",").map((s: string) => s.trim()) : []
      const reasons = branch.reasons_string ? branch.reasons_string.split(",").map((s: string) => s.trim()) : []

      console.log(`Branch ${branch.name}:`, {
        offices,
        reasons,
      })

      return {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        created_at: branch.created_at,
        updated_at: branch.updated_at,
        offices,
        reasons,
      }
    })

    console.log("Final branches data:", branches)
    return NextResponse.json(branches)
  } catch (error) {
    console.error("Branches fetch error:", error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, location, offices, reasons } = await request.json()

    if (!name || !location) {
      return NextResponse.json({ error: "Name and location are required" }, { status: 400 })
    }

    // Start transaction
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Insert branch
      const [result] = await connection.execute("INSERT INTO branches (name, location) VALUES (?, ?)", [name, location])

      const branchId = (result as any).insertId

      // Insert offices
      if (Array.isArray(offices) && offices.length > 0) {
        for (const office of offices) {
          if (office.trim()) {
            await connection.execute("INSERT INTO branch_offices (branch_id, office_name) VALUES (?, ?)", [
              branchId,
              office.trim(),
            ])
          }
        }
      }

      // Insert reasons
      if (Array.isArray(reasons) && reasons.length > 0) {
        for (const reason of reasons) {
          if (reason.trim()) {
            await connection.execute("INSERT INTO branch_reasons (branch_id, reason_name) VALUES (?, ?)", [
              branchId,
              reason.trim(),
            ])
          }
        }
      }

      await connection.commit()
      connection.release()

      return NextResponse.json({
        success: true,
        id: branchId,
      })
    } catch (error) {
      await connection.rollback()
      connection.release()
      throw error
    }
  } catch (error) {
    console.error("Branch creation error:", error)
    return NextResponse.json({ error: "Failed to create branch" }, { status: 500 })
  }
}
