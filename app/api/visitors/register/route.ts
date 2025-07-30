import { type NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"
import { generateDigitalCardNumber } from "@/lib/card-generator"
import { verifyToken } from "@/lib/auth"

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

    // Get user info to determine branch_id
    const [userRows] = await pool.execute("SELECT id, branch_id, isAdmin FROM users WHERE id = ?", [decoded.userId])
    const user = (userRows as any[])[0]

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const data = await request.json()
    const {
      name,
      phone_number, // Added phone_number
      reason,
      office,
      branch_id: requestedBranchId,
      has_laptop,
      laptop_brand,
      laptop_model,
      photo,
      id_photo_front,
      id_photo_back,
      sign_in_time,
      visitor_id, // For returning visitors
      is_new_visitor = true,
      digital_card_no: manualCardNo, // Manual card number input
      is_vendor = false,
      company,
      person_in_charge,
    } = data

    // Validate required fields - now including phone_number
    if (!name || !phone_number || !reason || !office) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Determine which branch_id to use
    let finalBranchId: number

    if (user.isAdmin && requestedBranchId) {
      // Admin can specify branch
      finalBranchId = Number.parseInt(requestedBranchId)
    } else if (user.branch_id) {
      // Regular user uses their assigned branch
      finalBranchId = user.branch_id
    } else {
      return NextResponse.json({ error: "No branch assigned to user" }, { status: 400 })
    }

    // Validate that the branch exists
    const [branchCheck] = await pool.execute("SELECT id FROM branches WHERE id = ?", [finalBranchId])
    if ((branchCheck as any[]).length === 0) {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 })
    }

    let finalVisitorId: number

    // Handle new vs returning visitor
    if (is_new_visitor) {
      // Check if visitor already exists by phone number
      const [existingVisitor] = await pool.execute("SELECT id FROM visitors WHERE phone_number = ? LIMIT 1", [
        phone_number,
      ])

      if ((existingVisitor as any[]).length > 0) {
        // Update existing visitor
        finalVisitorId = (existingVisitor as any[])[0].id
        await pool.execute("UPDATE visitors SET name = ?, visits = visits + 1 WHERE id = ?", [name, finalVisitorId])
      } else {
        // Create new visitor with phone_number
        const [visitorResult] = await pool.execute(
          "INSERT INTO visitors (name, phone_number, visits) VALUES (?, ?, 1)",
          [name, phone_number],
        )
        finalVisitorId = (visitorResult as any).insertId
      }
    } else {
      // Use existing visitor
      if (!visitor_id) {
        return NextResponse.json({ error: "Visitor ID required for returning visitor" }, { status: 400 })
      }
      finalVisitorId = visitor_id

      // Update visit count and phone number
      await pool.execute("UPDATE visitors SET visits = visits + 1, phone_number = ? WHERE id = ?", [
        phone_number,
        finalVisitorId,
      ])
    }

    // Handle digital card number
    let digitalCardNo: string | null = null

    if (manualCardNo && manualCardNo.trim()) {
      // Use manual card number
      digitalCardNo = manualCardNo.trim()
    } else {
      // Generate automatic card number
      digitalCardNo = await generateDigitalCardNumber()
    }

    // Convert base64 images to buffer if present
    const photoBuffer = photo ? Buffer.from(photo.split(",")[1], "base64") : null
    const idFrontBuffer = id_photo_front ? Buffer.from(id_photo_front.split(",")[1], "base64") : null
    const idBackBuffer = id_photo_back ? Buffer.from(id_photo_back.split(",")[1], "base64") : null

    // Create visit record
    const [visitResult] = await pool.execute(
      `INSERT INTO visits (
        visitor_id, digital_card_no, reason, office, branch_id, has_laptop, 
        laptop_brand, laptop_model, company, person_in_charge, photo, id_photo_front, id_photo_back, 
        sign_in_time, registered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalVisitorId,
        digitalCardNo,
        reason,
        office,
        finalBranchId,
        has_laptop,
        laptop_brand || null,
        laptop_model || null,
        is_vendor ? company || null : null,
        is_vendor ? person_in_charge || null : null,
        photoBuffer,
        idFrontBuffer,
        idBackBuffer,
        new Date(sign_in_time),
        decoded.userId,
      ],
    )

    return NextResponse.json({
      success: true,
      digital_card_no: digitalCardNo,
      visit_id: (visitResult as any).insertId,
      visitor_id: finalVisitorId,
      is_new_visitor,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 })
  }
}
