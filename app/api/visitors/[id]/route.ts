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
    const visitorId = Number.parseInt(id);
    if (isNaN(visitorId)) {
      return NextResponse.json(
        { error: "Invalid visitor ID" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { name, phone_number, residence } = data;

    // Validate required fields
    if (!name || !phone_number) {
      return NextResponse.json(
        { error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    // Check if visitor exists
    const [visitorCheck] = await pool.execute(
      "SELECT id FROM visitors WHERE id = ?",
      [visitorId]
    );

    if ((visitorCheck as any[]).length === 0) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    // Update visitor
    await pool.execute(
      "UPDATE visitors SET name = ?, phone_number = ?, residence = ? WHERE id = ?",
      [name, phone_number, residence || null, visitorId]
    );

    return NextResponse.json({
      success: true,
      message: "Visitor updated successfully",
    });
  } catch (error) {
    console.error("Update visitor error:", error);
    return NextResponse.json(
      { error: "Failed to update visitor" },
      { status: 500 }
    );
  }
}

