import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { name, location, offices, reasons } = await request.json()
    const branchId = params.id

    // Start transaction
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Update branch basic info
      await connection.execute("UPDATE branches SET name = ?, location = ? WHERE id = ?", [name, location, branchId])

      // Delete existing offices and reasons
      await connection.execute("DELETE FROM branch_offices WHERE branch_id = ?", [branchId])
      await connection.execute("DELETE FROM branch_reasons WHERE branch_id = ?", [branchId])

      // Insert new offices
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

      // Insert new reasons
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

      return NextResponse.json({ success: true })
    } catch (error) {
      await connection.rollback()
      connection.release()
      throw error
    }
  } catch (error) {
    console.error("Branch update error:", error)
    return NextResponse.json({ error: "Failed to update branch" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // The foreign key constraints will automatically delete related offices and reasons
    await pool.execute("DELETE FROM branches WHERE id = ?", [params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Branch deletion error:", error)
    return NextResponse.json({ error: "Failed to delete branch" }, { status: 500 })
  }
}
