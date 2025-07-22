import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { hashPassword } from "@/lib/auth"
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

    const [rows] = await pool.execute(`
      SELECT u.*, b.name as branch_name 
      FROM users u 
      LEFT JOIN branches b ON u.branch_id = b.id 
      ORDER BY u.created_at DESC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const hashedPassword = await hashPassword(password)

    const [result] = await pool.execute(
      "INSERT INTO users (name, email, phone_number, password, branch_id, is_active, isAdmin) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        email,
        phone_number,
        hashedPassword,
        branch_id ? Number.parseInt(branch_id) : null,
        is_active,
        isAdmin || false,
      ],
    )

    return NextResponse.json({
      success: true,
      id: (result as any).insertId,
    })
  } catch (error) {
    console.error("User creation error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
