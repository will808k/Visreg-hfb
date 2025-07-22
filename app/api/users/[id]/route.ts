import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { hashPassword, verifyToken } from "@/lib/auth"

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

    const { name, email, phone_number, password, branch_id, is_active, isAdmin } = await request.json()
    const userId = params.id

    let query = "UPDATE users SET name = ?, email = ?, phone_number = ?, branch_id = ?, is_active = ?, isAdmin = ?"
    const values = [
      name,
      email,
      phone_number,
      branch_id ? Number.parseInt(branch_id) : null,
      is_active,
      isAdmin || false,
    ]

    if (password) {
      const hashedPassword = await hashPassword(password)
      query += ", password = ?"
      values.push(hashedPassword)
    }

    query += " WHERE id = ?"
    values.push(userId)

    await pool.execute(query, values)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
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

    await pool.execute("DELETE FROM users WHERE id = ?", [params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("User deletion error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
