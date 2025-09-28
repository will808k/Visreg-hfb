import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateDigitalCardNumber } from "@/lib/card-generator";
import { verifyToken } from "@/lib/auth";

interface DatabaseResult {
  insertId: number;
  affectedRows: number;
}

interface UserRow {
  id: number;
  branch_id: number;
  isAdmin: boolean;
}

interface BranchRow {
  id: number;
}

interface VisitorRow {
  id: number;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get user info to determine branch_id
    const [userRows] = await pool.execute(
      "SELECT id, branch_id, isAdmin FROM users WHERE id = ?",
      [decoded.userId]
    );
    const user = (userRows as UserRow[])[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const data = await request.json();
    const {
      name,
      phone_number,
      office_visits = [], // Array of {office, reason, visitee_name}
      reason,
      office,
      visitee_name,
      branch_id: requestedBranchId,
      has_laptop,
      laptop_brand,
      laptop_model,
      photo,
      id_photo_front,
      id_photo_back,
      sign_in_time,
      visitor_id,
      is_new_visitor = true,
      digital_card_no: manualCardNo,
      is_vendor = false,
      company,
      person_in_charge,
      other_items = [],
      category = "Normal",
    } = data;

    let finalOfficeVisits = [];
    if (office_visits && office_visits.length > 0) {
      // New format with multiple offices
      finalOfficeVisits = office_visits;
    } else if (office && reason) {
      // Legacy format with single office
      finalOfficeVisits = [{ office, reason, visitee_name }];
    }

    // Validate required fields
    if (!name || !phone_number || finalOfficeVisits.length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, phone_number, and at least one office visit",
        },
        { status: 400 }
      );
    }

    // Validate each office visit
    for (const visit of finalOfficeVisits) {
      if (!visit.office || !visit.reason) {
        return NextResponse.json(
          { error: "Each office visit must have office and reason" },
          { status: 400 }
        );
      }
    }

    // Determine which branch_id to use
    let finalBranchId: number;

    if (user.isAdmin && requestedBranchId) {
      finalBranchId = Number.parseInt(requestedBranchId);
    } else if (user.branch_id) {
      finalBranchId = user.branch_id;
    } else {
      return NextResponse.json(
        { error: "No branch assigned to user" },
        { status: 400 }
      );
    }

    // Validate that the branch exists
    const [branchCheck] = await pool.execute(
      "SELECT id FROM branches WHERE id = ?",
      [finalBranchId]
    );
    if ((branchCheck as BranchRow[]).length === 0) {
      return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
    }

    let finalVisitorId: number;

    // Handle new vs returning visitor
    if (is_new_visitor) {
      const [existingVisitor] = await pool.execute(
        "SELECT id FROM visitors WHERE phone_number = ? LIMIT 1",
        [phone_number]
      );

      if ((existingVisitor as VisitorRow[]).length > 0) {
        finalVisitorId = (existingVisitor as VisitorRow[])[0].id;
        await pool.execute(
          "UPDATE visitors SET name = ?, visits = visits + ? WHERE id = ?",
          [name, finalOfficeVisits.length, finalVisitorId]
        );
      } else {
        const [visitorResult] = (await pool.execute(
          "INSERT INTO visitors (name, phone_number, visits) VALUES (?, ?, ?)",
          [name, phone_number, finalOfficeVisits.length]
        )) as [DatabaseResult, any];
        finalVisitorId = visitorResult.insertId;
      }
    } else {
      if (!visitor_id) {
        return NextResponse.json(
          { error: "Visitor ID required for returning visitor" },
          { status: 400 }
        );
      }
      finalVisitorId = visitor_id;
      await pool.execute(
        "UPDATE visitors SET visits = visits + ?, phone_number = ? WHERE id = ?",
        [finalOfficeVisits.length, phone_number, finalVisitorId]
      );
    }

    // Convert base64 images to buffer if present
    const photoBuffer = photo
      ? Buffer.from(photo.split(",")[1], "base64")
      : null;
    const idFrontBuffer = id_photo_front
      ? Buffer.from(id_photo_front.split(",")[1], "base64")
      : null;
    const idBackBuffer = id_photo_back
      ? Buffer.from(id_photo_back.split(",")[1], "base64")
      : null;

    const visitIds: number[] = [];
    const digitalCardNumbers: string[] = [];

    for (const officeVisit of finalOfficeVisits) {
      // Generate or use manual card number for each visit
      let digitalCardNo: string | null = null;
      if (manualCardNo && manualCardNo.trim()) {
        digitalCardNo = `${manualCardNo.trim()}`;
      } else {
        digitalCardNo = await generateDigitalCardNumber();
      }

      const [visitResult] = (await pool.execute(
        `INSERT INTO visits (
          visitor_id, category, digital_card_no, reason, office, branch_id, has_laptop, 
          laptop_brand, laptop_model, company, person_in_charge, photo, id_photo_front, id_photo_back, 
          sign_in_time, registered_by, other_items, visitee_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalVisitorId,
          category || "Normal",
          digitalCardNo,
          officeVisit.reason,
          officeVisit.office,
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
          JSON.stringify(other_items),
          officeVisit.visitee_name || null,
        ]
      )) as [DatabaseResult, any];

      visitIds.push(visitResult.insertId);
      digitalCardNumbers.push(digitalCardNo);
    }

    return NextResponse.json({
      success: true,
      digital_card_numbers: digitalCardNumbers,
      visit_ids: visitIds,
      visitor_id: finalVisitorId,
      is_new_visitor,
      office_visits_created: finalOfficeVisits.length,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
