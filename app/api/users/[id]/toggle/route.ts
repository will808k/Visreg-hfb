import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { is_active } = await request.json()

    await pool.execute("UPDATE users SET is_active = ? WHERE id = ?", [is_active, params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("User toggle error:", error)
    return NextResponse.json({ error: "Failed to update user status" }, { status: 500 })
  }
}
