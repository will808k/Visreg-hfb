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

    // Check if user is admin (only admins should download audit logs)
    if (!decoded.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    if (!["csv", "pdf"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Supported formats: csv, pdf" },
        { status: 400 }
      );
    }

    // Get filter parameters
    const tableName = searchParams.get("table");
    const operation = searchParams.get("operation");
    const userId = searchParams.get("user_id");
    const recordId = searchParams.get("record_id");
    const includeLogins = searchParams.get("include_logins") === "true";
    const startDate = searchParams.get("start_date")
      ? new Date(searchParams.get("start_date")!)
      : undefined;
    const endDate = searchParams.get("end_date")
      ? new Date(searchParams.get("end_date")!)
      : undefined;

    let logs;

    if (includeLogins) {
      // Get combined audit logs and login logs
      const auditLogs = await getAllAuditLogs(
        5000, // Large limit to get all records
        0,
        tableName || undefined,
        operation || undefined
      );

      const loginLogs = await getLoginLogs(
        5000, // Large limit to get all records
        0,
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
      logs = [...(auditLogs as any[]), ...transformedLoginLogs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } else if (userId) {
      // Get logs for specific user
      logs = await getUserAuditLogs(parseInt(userId), 10000, 0);
    } else if (tableName && recordId) {
      // Get logs for specific table and record
      logs = await getAuditLogs(tableName, parseInt(recordId), 10000, 0);
    } else {
      // Get all logs with optional filters
      logs = await getAllAuditLogs(
        10000, // Large limit to get all records
        0,
        tableName || undefined,
        operation || undefined
      );
    }

    // Apply date filtering if provided
    if (startDate || endDate) {
      logs = (logs as any[]).filter((log) => {
        const logDate = new Date(log.timestamp);
        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
        return true;
      });
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `audit-logs-${timestamp}.${format}`;

    if (format === "csv") {
      // Generate CSV content
      const headers = [
        "ID",
        "Table Name",
        "Record ID",
        "Operation",
        "User ID",
        "User Name",
        "Branch Name",
        "IP Address",
        "Timestamp",
        "Old Values",
        "New Values",
        "Changed Fields",
      ];

      const csvContent = [
        headers.join(","),
        ...(logs as any[]).map((log) =>
          [
            log.id,
            `"${log.table_name}"`,
            log.record_id,
            log.operation,
            log.user_id || "",
            `"${log.user_name || ""}"`,
            `"${log.branch_name || ""}"`,
            `"${log.ip_address || ""}"`,
            `"${new Date(log.timestamp).toISOString()}"`,
            `"${
              log.old_values
                ? JSON.stringify(log.old_values).replace(/"/g, '""')
                : ""
            }"`,
            `"${
              log.new_values
                ? JSON.stringify(log.new_values).replace(/"/g, '""')
                : ""
            }"`,
            `"${
              log.changed_fields
                ? JSON.stringify(log.changed_fields).replace(/"/g, '""')
                : ""
            }"`,
          ].join(",")
        ),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } else if (format === "pdf") {
      // For PDF generation, we'll create a simple HTML table that can be printed as PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Audit Logs Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .create { color: green; }
            .update { color: blue; }
            .delete { color: red; }
            .login-success { color: green; }
            .login-failed { color: orange; }
          </style>
        </head>
        <body>
          <h1>Audit Logs Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${(logs as any[]).length}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Table</th>
                <th>Operation</th>
                <th>Record ID</th>
                <th>User</th>
                <th>Branch</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${(logs as any[])
                .map(
                  (log) => `
                <tr>
                  <td>${log.id}</td>
                  <td>${log.table_name}</td>
                  <td class="${log.operation
                    .toLowerCase()
                    .replace("_", "-")}">${log.operation}</td>
                  <td>${log.record_id}</td>
                  <td>${log.user_name || "System"}</td>
                  <td>${log.branch_name || "N/A"}</td>
                  <td>${log.ip_address || "N/A"}</td>
                  <td>${new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Audit logs download error:", error);
    return NextResponse.json(
      { error: "Failed to download audit logs" },
      { status: 500 }
    );
  }
}
