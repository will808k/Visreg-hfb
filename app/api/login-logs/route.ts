import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getLoginLogs, getLoginStats } from "@/lib/login-logger";

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

    // Check if user is admin (only admins should see login logs)
    if (!decoded.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      // Return login statistics
      const startDate = searchParams.get("start_date")
        ? new Date(searchParams.get("start_date")!)
        : undefined;
      const endDate = searchParams.get("end_date")
        ? new Date(searchParams.get("end_date")!)
        : undefined;

      const stats = await getLoginStats(startDate, endDate);
      return NextResponse.json(stats);
    }

    // Return login logs
    const userId = searchParams.get("user_id");
    const email = searchParams.get("email");
    const success = searchParams.get("success");
    const startDate = searchParams.get("start_date")
      ? new Date(searchParams.get("start_date")!)
      : undefined;
    const endDate = searchParams.get("end_date")
      ? new Date(searchParams.get("end_date")!)
      : undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const logs = await getLoginLogs(
      limit,
      offset,
      userId ? parseInt(userId) : undefined,
      email || undefined,
      success !== null ? success === "true" : undefined,
      startDate,
      endDate
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Login logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch login logs" },
      { status: 500 }
    );
  }
}
