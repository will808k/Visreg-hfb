import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import {
  getAllAuditLogs,
  getAuditLogs,
  getUserAuditLogs,
} from "@/lib/audit-logger";
import { getLoginLogs } from "@/lib/login-logger";

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

    // Check if user is admin (only admins should see audit logs)
    if (!decoded.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("table");
    const operation = searchParams.get("operation");
    const userId = searchParams.get("user_id");
    const recordId = searchParams.get("record_id");
    const includeLogins = searchParams.get("include_logins") === "true";
    const limit = parseInt(searchParams.get("limit") || "50") || 50;
    const offset = parseInt(searchParams.get("offset") || "0") || 0;

    let logs;

    if (includeLogins) {
      // Get combined audit logs and login logs
      const auditLogs = await getAllAuditLogs(
        Math.ceil(limit / 2),
        offset,
        tableName || undefined,
        operation || undefined
      );

      const loginLogs = await getLoginLogs(
        Math.ceil(limit / 2),
        offset,
        userId ? parseInt(userId) : undefined
      );

      // Transform login logs to match audit log format
      const transformedLoginLogs = (loginLogs as any[]).map((log) => ({
        id: `login_${log.id}`,
        table_name: "login_logs",
        record_id: log.id,
        operation: log.success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
        old_values: null,
        new_values: {
          email: log.email,
          success: log.success,
          failure_reason: log.failure_reason,
        },
        changed_fields: null,
        user_id: log.user_id,
        user_name: log.user_name,
        branch_name: log.branch_name,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        timestamp: log.timestamp,
      }));

      // Combine and sort by timestamp
      logs = [...auditLogs, ...transformedLoginLogs]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit);
    } else if (userId) {
      // Get logs for specific user
      logs = await getUserAuditLogs(parseInt(userId), limit, offset);
    } else if (tableName && recordId) {
      // Get logs for specific table and record
      logs = await getAuditLogs(tableName, parseInt(recordId), limit, offset);
    } else {
      // Get all logs with optional filters
      logs = await getAllAuditLogs(
        limit,
        offset,
        tableName || undefined,
        operation || undefined
      );
    }

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
