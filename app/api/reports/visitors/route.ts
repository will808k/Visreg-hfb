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
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const vendorFilter = searchParams.get("vendor") || "all"
    const selectedDate = searchParams.get("date") || ""
    const offset = (page - 1) * limit

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute("SELECT id, branch_id, isAdmin FROM users WHERE id = ?", [decoded.userId])
    const user = (userRows as any[])[0]

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    // Build parameters array
    const params: any[] = []
    let whereClause = ""
    let joinClause = ""
    let selectClause = `
      vis.id,
      vis.name,
      vis.phone_number,
      vis.visits as visit_count,
      vis.created_at,
      vis.updated_at as last_visit
    `

    // If date filter is applied, we need to join with visits table and get visit details for that date
    if (selectedDate) {
      joinClause = `
        INNER JOIN visits v ON vis.id = v.visitor_id 
        AND DATE(v.sign_in_time) = ?
      `
      params.push(selectedDate)

      // Add visit details to select when filtering by date
      selectClause += `,
        v.id as visit_id,
        v.digital_card_no,
        v.reason,
        v.office,
        v.has_laptop,
        v.laptop_brand,
        v.laptop_model,
        v.company,
        v.person_in_charge,
        v.photo,
        v.id_photo_front,
        v.id_photo_back,
        v.signature,
        v.sign_in_time,
        v.sign_out_time,
        v.other_items,
        v.visitee_name,
        CASE 
          WHEN v.sign_out_time IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, v.sign_in_time, v.sign_out_time)
          ELSE NULL 
        END as duration_minutes,
        b.name as branch_name,
        u.name as registered_by_name,
        CASE 
          WHEN v.sign_out_time IS NULL THEN 'active'
          ELSE 'completed'
        END as status
      `
      joinClause += `
        LEFT JOIN branches b ON v.branch_id = b.id
        LEFT JOIN users u ON v.registered_by = u.id
      `
    } else {
      // For non-date filtered queries, get the last visit details
      selectClause += `,
        (
          SELECT JSON_OBJECT(
            'id', v2.id,
            'digital_card_no', v2.digital_card_no,
            'reason', v2.reason,
            'office', v2.office,
            'has_laptop', v2.has_laptop,
            'laptop_brand', v2.laptop_brand,
            'laptop_model', v2.laptop_model,
            'company', v2.company,
            'person_in_charge', v2.person_in_charge,
            'photo', CASE WHEN v2.photo IS NOT NULL THEN TO_BASE64(v2.photo) ELSE NULL END,
            'id_photo_front', CASE WHEN v2.id_photo_front IS NOT NULL THEN TO_BASE64(v2.id_photo_front) ELSE NULL END,
            'id_photo_back', CASE WHEN v2.id_photo_back IS NOT NULL THEN TO_BASE64(v2.id_photo_back) ELSE NULL END,
            'signature', CASE WHEN v2.signature IS NOT NULL THEN TO_BASE64(v2.signature) ELSE NULL END,
            'sign_in_time', v2.sign_in_time,
            'sign_out_time', v2.sign_out_time,
            'other_items', v2.other_items,
            'visitee_name', v2.visitee_name,
            'duration_minutes', CASE 
              WHEN v2.sign_out_time IS NOT NULL 
              THEN TIMESTAMPDIFF(MINUTE, v2.sign_in_time, v2.sign_out_time)
              ELSE NULL 
            END,
            'branch_name', b2.name,
            'registered_by_name', u2.name,
            'status', CASE 
              WHEN v2.sign_out_time IS NULL THEN 'active'
              ELSE 'completed'
            END
          )
          FROM visits v2
          LEFT JOIN branches b2 ON v2.branch_id = b2.id
          LEFT JOIN users u2 ON v2.registered_by = u2.id
          WHERE v2.visitor_id = vis.id
          ORDER BY v2.sign_in_time DESC
          LIMIT 1
        ) as last_visit_details
      `
    }

    // Add search filtering
    if (search.trim()) {
      whereClause += " AND vis.name LIKE ?"
      params.push(`%${search}%`)
    }

    // Add vendor filtering
    if (vendorFilter === "vendors") {
      if (selectedDate) {
        whereClause += " AND v.company IS NOT NULL"
      } else {
        whereClause += " AND EXISTS (SELECT 1 FROM visits v WHERE v.visitor_id = vis.id AND v.company IS NOT NULL)"
      }
    } else if (vendorFilter === "regular") {
      if (selectedDate) {
        whereClause += " AND v.company IS NULL"
      } else {
        whereClause += " AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.visitor_id = vis.id AND v.company IS NOT NULL)"
      }
    }

    // Add branch filtering for non-admin users
    if (!user.isAdmin && user.branch_id) {
      if (selectedDate) {
        whereClause += " AND v.branch_id = ?"
        params.push(user.branch_id)
      } else {
        whereClause += " AND EXISTS (SELECT 1 FROM visits v WHERE v.visitor_id = vis.id AND v.branch_id = ?)"
        params.push(user.branch_id)
      }
    }

    // Build the main query
    const visitorsQuery = `
      SELECT ${selectClause}
      FROM visitors vis
      ${joinClause}
      WHERE 1=1 ${whereClause}
      ORDER BY ${selectedDate ? "v.sign_in_time" : "vis.created_at"} DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    console.log("Visitors Query:", visitorsQuery)
    console.log("Params:", params)

    const [visitors] = await pool.execute(visitorsQuery, params)

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(${selectedDate ? "DISTINCT vis.id" : "*"}) as total
      FROM visitors vis
      ${joinClause}
      WHERE 1=1 ${whereClause}
    `

    const [countResult] = await pool.execute(countQuery, params)
    const total = (countResult as any[])[0].total
    const totalPages = Math.ceil(total / limit)

    // Format the response data
    const formattedVisitors = (visitors as any[]).map((visitor) => {
      let lastVisitDetails = null

      if (selectedDate) {
        // For date-filtered queries, construct the visit details from the joined data
        lastVisitDetails = {
          id: visitor.visit_id,
          digital_card_no: visitor.digital_card_no,
          reason: visitor.reason,
          office: visitor.office,
          has_laptop: visitor.has_laptop,
          laptop_brand: visitor.laptop_brand,
          laptop_model: visitor.laptop_model,
          company: visitor.company,
          person_in_charge: visitor.person_in_charge,
          photo: visitor.photo ? visitor.photo.toString("base64") : null,
          id_photo_front: visitor.id_photo_front ? visitor.id_photo_front.toString("base64") : null,
          id_photo_back: visitor.id_photo_back ? visitor.id_photo_back.toString("base64") : null,
          signature: visitor.signature ? visitor.signature.toString("base64") : null,
          sign_in_time: visitor.sign_in_time,
          sign_out_time: visitor.sign_out_time,
          other_items: visitor.other_items ? JSON.parse(visitor.other_items) : null,
          visitee_name: visitor.visitee_name,
          duration_minutes: visitor.duration_minutes,
          branch_name: visitor.branch_name,
          registered_by_name: visitor.registered_by_name,
          status: visitor.status,
        }
      } else if (visitor.last_visit_details) {
        // For non-date-filtered queries, parse the JSON object
        try {
          lastVisitDetails = JSON.parse(visitor.last_visit_details)
          if (lastVisitDetails && lastVisitDetails.other_items) {
            lastVisitDetails.other_items = JSON.parse(lastVisitDetails.other_items)
          }
        } catch (e) {
          console.error("Error parsing last_visit_details:", e)
          lastVisitDetails = null
        }
      }

      return {
        id: visitor.id,
        name: visitor.name,
        phone_number: visitor.phone_number,
        visit_count: visitor.visit_count || 0,
        last_visit: visitor.last_visit || visitor.created_at,
        total_visits: visitor.visit_count || 0,
        last_visit_details: lastVisitDetails,
      }
    })

    return NextResponse.json({
      visitors: formattedVisitors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Reports error:", error)
    return NextResponse.json({ error: "Failed to fetch visitor reports" }, { status: 500 })
  }
}
