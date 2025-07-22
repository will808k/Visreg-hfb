import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const visitId = Number.parseInt(params.id)
    if (isNaN(visitId)) {
      return NextResponse.json({ error: "Invalid visit ID" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "photo" // photo, id_front, id_back

    let column = "photo"
    if (type === "id_front") column = "id_photo_front"
    if (type === "id_back") column = "id_photo_back"

    // Fetch from visits table since photos are now stored there
    const [rows] = await pool.execute(`SELECT ${column} FROM visits WHERE id = ?`, [visitId])

    const visit = (rows as any[])[0]
    if (!visit || !visit[column]) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    // Convert buffer to base64 and return as data URL
    const imageBuffer = visit[column]
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const dataUrl = `data:image/jpeg;base64,${base64Image}`

    return NextResponse.json({ photo: dataUrl })
  } catch (error) {
    console.error("Error fetching visit photo:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
