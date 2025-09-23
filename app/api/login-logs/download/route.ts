import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
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

    // Check if user is admin (only admins should download login logs)
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
    const userId = searchParams.get("user_id");
    const email = searchParams.get("email");
    const success = searchParams.get("success");
    const startDate = searchParams.get("start_date")
      ? new Date(searchParams.get("start_date")!)
      : undefined;
    const endDate = searchParams.get("end_date")
      ? new Date(searchParams.get("end_date")!)
      : undefined;

    // Get all logs without limit for download
    const logs = await getLoginLogs(
      10000, // Large limit to get all records
      0,
      userId ? parseInt(userId) : undefined,
      email || undefined,
      success !== null ? success === "true" : undefined,
      startDate,
      endDate
    );

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `login-logs-${timestamp}.${format}`;

    if (format === "csv") {
      // Generate CSV content
      const headers = [
        "ID",
        "User ID",
        "Email",
        "Success",
        "IP Address",
        "User Agent",
        "Failure Reason",
        "User Name",
        "Branch Name",
        "Timestamp",
      ];

      const csvContent = [
        headers.join(","),
        ...(logs as any[]).map((log) =>
          [
            log.id,
            log.user_id || "",
            `"${log.email}"`,
            log.success,
            `"${log.ip_address || ""}"`,
            `"${log.user_agent || ""}"`,
            `"${log.failure_reason || ""}"`,
            `"${log.user_name || ""}"`,
            `"${log.branch_name || ""}"`,
            `"${new Date(log.timestamp).toISOString()}"`,
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
      // In a real implementation, you might want to use a library like puppeteer or jsPDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login Logs Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .success { color: green; }
            .failure { color: red; }
          </style>
        </head>
        <body>
          <h1>Login Logs Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${(logs as any[]).length}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Success</th>
                <th>IP Address</th>
                <th>User Name</th>
                <th>Branch</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${(logs as any[])
                .map(
                  (log) => `
                <tr>
                  <td>${log.id}</td>
                  <td>${log.email}</td>
                  <td class="${log.success ? "success" : "failure"}">${
                    log.success ? "Success" : "Failed"
                  }</td>
                  <td>${log.ip_address || "N/A"}</td>
                  <td>${log.user_name || "N/A"}</td>
                  <td>${log.branch_name || "N/A"}</td>
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
    console.error("Login logs download error:", error);
    return NextResponse.json(
      { error: "Failed to download login logs" },
      { status: 500 }
    );
  }
}
