import { type NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id } = await params;
    const visitId = Number.parseInt(id);
    if (isNaN(visitId)) {
      return NextResponse.json(
        { error: "Invalid visit ID" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const {
      branch_id,
      office,
      reason,
      visitee_name,
      has_laptop,
      laptop_brand,
      laptop_model,
      company,
      person_in_charge,
      other_items,
      category,
    } = data;

    // Validate required fields
    if (!office || !reason) {
      return NextResponse.json(
        { error: "Office and reason are required" },
        { status: 400 }
      );
    }

    // Check if visit exists
    const [visitCheck] = await pool.execute(
      "SELECT id FROM visits WHERE id = ?",
      [visitId]
    );

    if ((visitCheck as any[]).length === 0) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Convert other_items array to JSON string
    const otherItemsJson = other_items && other_items.length > 0
      ? JSON.stringify(other_items)
      : null;

    // Update visit
    await pool.execute(
      `UPDATE visits 
       SET branch_id = ?,
           office = ?, 
           reason = ?, 
           visitee_name = ?,
           has_laptop = ?,
           laptop_brand = ?,
           laptop_model = ?,
           company = ?,
           person_in_charge = ?,
           other_items = ?,
           category = ?
       WHERE id = ?`,
      [
        branch_id || null,
        office,
        reason,
        visitee_name || null,
        has_laptop ? 1 : 0,
        laptop_brand || null,
        laptop_model || null,
        company || null,
        person_in_charge || null,
        otherItemsJson,
        category || "Normal",
        visitId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Visit updated successfully",
    });
  } catch (error) {
    console.error("Update visit error:", error);
    return NextResponse.json(
      { error: "Failed to update visit" },
      { status: 500 }
    );
  }
}

