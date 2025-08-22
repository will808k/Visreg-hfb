import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get user data from database
    const [rows] = await pool.execute(
      "SELECT id, name, email, branch_id, isAdmin, is_active FROM users WHERE id = ? AND is_active = TRUE",
      [decoded.userId]
    );

    const users = rows as any[];

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const user = users[0];

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        branch_id: user.branch_id,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Verify token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
