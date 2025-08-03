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
    const phoneQuery = searchParams.get("phone")

    if (!phoneQuery || phoneQuery.length < 3) {
      return NextResponse.json([])
    }

    // Clean the phone number for better matching
    const cleanedPhone = phoneQuery.replace(/\D/g, "")

    // Search for visitors by phone number with flexible matching
    const [visitors] = await pool.execute(
      `
      SELECT 
        v.id,
        v.name,
        v.phone_number,
        v.visits,
        v.created_at,
        (
          SELECT MAX(vis.sign_in_time)
          FROM visits vis 
          WHERE vis.visitor_id = v.id
        ) as last_visit,
        (
          SELECT vis2.reason
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_reason,
        (
          SELECT vis2.office
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_office,
        (
          SELECT vis2.has_laptop
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_has_laptop,
        (
          SELECT vis2.laptop_brand
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_laptop_brand,
        (
          SELECT vis2.laptop_model
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_laptop_model,
        (
          SELECT vis2.company
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_company,
        (
          SELECT vis2.person_in_charge
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_person_in_charge,
        (
          SELECT vis2.other_items
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_other_items,
        (
          SELECT vis2.visitee_name
          FROM visits vis2 
          WHERE vis2.visitor_id = v.id 
          ORDER BY vis2.sign_in_time DESC 
          LIMIT 1
        ) as last_visitee_name
      FROM visitors v
      WHERE 
        REPLACE(REPLACE(REPLACE(REPLACE(v.phone_number, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ? 
        OR v.phone_number LIKE ?
        OR v.name LIKE ?
      ORDER BY 
        CASE 
          WHEN REPLACE(REPLACE(REPLACE(REPLACE(v.phone_number, ' ', ''), '-', ''), '(', ''), ')', '') = ? THEN 1
          WHEN REPLACE(REPLACE(REPLACE(REPLACE(v.phone_number, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ? THEN 2
          WHEN v.phone_number LIKE ? THEN 3
          ELSE 4
        END,
        v.created_at DESC
      LIMIT 10`,
      [`%${cleanedPhone}%`, `%${phoneQuery}%`, `%${phoneQuery}%`, cleanedPhone, `${cleanedPhone}%`, `%${phoneQuery}%`],
    )

    const formattedVisitors = (visitors as any[]).map((visitor) => {
      let lastVisitDetails = null

      if (visitor.last_reason || visitor.last_office) {
        // Parse other_items if it exists
        let otherItems = []
        if (visitor.last_other_items) {
          try {
            otherItems = JSON.parse(visitor.last_other_items)
          } catch (e) {
            otherItems = []
          }
        }

        lastVisitDetails = {
          reason: visitor.last_reason || "",
          office: visitor.last_office || "",
          has_laptop: Boolean(visitor.last_has_laptop),
          laptop_brand: visitor.last_laptop_brand || undefined,
          laptop_model: visitor.last_laptop_model || undefined,
          is_vendor: Boolean(visitor.last_company && visitor.last_company.trim() !== ""),
          company: visitor.last_company || undefined,
          person_in_charge: visitor.last_person_in_charge || undefined,
          other_items: otherItems,
          visitee_name: visitor.last_visitee_name || undefined,
        }
      }

      return {
        id: visitor.id,
        name: visitor.name,
        phone_number: visitor.phone_number,
        visits: visitor.visits,
        last_visit: visitor.last_visit,
        last_visit_details: lastVisitDetails,
      }
    })

    return NextResponse.json(formattedVisitors)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
