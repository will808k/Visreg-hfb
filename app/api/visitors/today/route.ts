import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get user info to determine branch filtering
    const [userRows] = await pool.execute(
      "SELECT id, branch_id, isAdmin FROM users WHERE id = ?",
      [decoded.userId]
    );
    const user = (userRows as any[])[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    // Build the WHERE clause
    let whereClause = "WHERE DATE(v.sign_in_time) = CURDATE()";
    const queryParams: any[] = [];

    // Add branch filtering for non-admin users
    if (!user.isAdmin && user.branch_id) {
      whereClause += " AND v.branch_id = ?";
      queryParams.push(user.branch_id);
    }

    const [visits] = await pool.execute(
      `
      SELECT 
        v.id,
        v.visitor_id,
        v.digital_card_no,
        v.reason,
        v.office,
        v.sign_in_time,
        v.sign_out_time,
        v.has_laptop,
        v.laptop_brand,
        v.laptop_model,
        v.photo,
        v.id_photo_front,
        v.id_photo_back,
        v.company,
        v.person_in_charge,
        v.other_items,
        v.visitee_name,
        vis.name,
        vis.phone_number,
        vis.visits as total_visits,
        b.name as branch_name,
        u.name as registered_by_name
      FROM visits v
      JOIN visitors vis ON v.visitor_id = vis.id
      JOIN branches b ON v.branch_id = b.id
      JOIN users u ON v.registered_by = u.id
      ${whereClause}
      ORDER BY v.sign_in_time DESC
      `,
      queryParams
    );

    const visitorsMap = new Map();
    (visits as any[]).forEach((visit) => {
      // Parse other_items if it exists
      let otherItems = [];
      if (visit.other_items) {
        try {
          otherItems = JSON.parse(visit.other_items);
        } catch (e) {
          otherItems = [];
        }
      }

      // Convert BLOB data to base64 for photos
      const photoBase64 = visit.photo
        ? Buffer.from(visit.photo).toString("base64")
        : null;
      const idFrontBase64 = visit.id_photo_front
        ? Buffer.from(visit.id_photo_front).toString("base64")
        : null;
      const idBackBase64 = visit.id_photo_back
        ? Buffer.from(visit.id_photo_back).toString("base64")
        : null;

      const visitData = {
        id: visit.id,
        digital_card_no: visit.digital_card_no,
        reason: visit.reason,
        office: visit.office,
        sign_in_time: visit.sign_in_time,
        sign_out_time: visit.sign_out_time,
        has_laptop: Boolean(visit.has_laptop),
        laptop_brand: visit.laptop_brand,
        laptop_model: visit.laptop_model,
        visitee_name: visit.visitee_name,
        company: visit.company,
        person_in_charge: visit.person_in_charge,
        other_items: otherItems,
      };

      if (visitorsMap.has(visit.visitor_id)) {
        // Add visit to existing visitor
        const existingVisitor = visitorsMap.get(visit.visitor_id);
        existingVisitor.visits.push(visitData);

        // Update overall status - visitor is active if any visit is active
        if (!visit.sign_out_time) {
          existingVisitor.has_active_visits = true;
        }
      } else {
        // Create new visitor entry
        visitorsMap.set(visit.visitor_id, {
          visitor_id: visit.visitor_id,
          name: visit.name,
          phone_number: visit.phone_number,
          photo: photoBase64,
          id_photo_front: idFrontBase64,
          id_photo_back: idBackBase64,
          branch_name: visit.branch_name,
          registered_by_name: visit.registered_by_name,
          total_visits: visit.total_visits,
          has_active_visits: !visit.sign_out_time,
          visits: [visitData],
        });
      }
    });

    // Convert map to array and apply status filtering
    let formattedVisitors = Array.from(visitorsMap.values());

    // Apply status filtering after grouping
    if (statusFilter === "active") {
      formattedVisitors = formattedVisitors.filter(
        (visitor) => visitor.has_active_visits
      );
    } else if (statusFilter === "inactive") {
      formattedVisitors = formattedVisitors.filter(
        (visitor) => !visitor.has_active_visits
      );
    }

    return NextResponse.json(formattedVisitors);
  } catch (error) {
    console.error("Error fetching today's visitors:", error);
    return NextResponse.json(
      { error: "Failed to fetch visitors" },
      { status: 500 }
    );
  }
}
