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

    const visitId = params.id

    // Check if visit exists and is not already signed out
    const [visitCheck] = await pool.execute("SELECT id, sign_out_time FROM visits WHERE id = ?", [visitId])

    if ((visitCheck as any[]).length === 0) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 })
    }

    const visit = (visitCheck as any[])[0]
    if (visit.sign_out_time) {
      return NextResponse.json({ error: "Visitor already signed out" }, { status: 400 })
    }

    // Update the visit with sign out time
    await pool.execute("UPDATE visits SET sign_out_time = NOW() WHERE id = ?", [visitId])

    return NextResponse.json({ success: true, message: "Visitor signed out successfully" })
  } catch (error) {
    console.error("Sign out error:", error)
    return NextResponse.json({ error: "Failed to sign out visitor" }, { status: 500 })
  }
}
