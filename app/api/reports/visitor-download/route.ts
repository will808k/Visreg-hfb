import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-edge";
import jsPDF from "jspdf";
import pool from "@/lib/db";

interface VisitData {
  id: number;
  visitor_name: string;
  phone_number: string | null;
  digital_card_no: string | null;
  reason: string;
  office: string;
  visitee_name: string | null;
  company: string | null;
  person_in_charge: string | null;
  has_laptop: boolean;
  laptop_brand: string | null;
  laptop_model: string | null;
  other_items: string | null;
  sign_in_time: string;
  sign_out_time: string | null;
  duration_minutes: number | null;
  status: string;
  branch_name: string;
  registered_by_name: string;
  signedout_by_name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const visitorId = searchParams.get("visitor_id");

    if (!visitorId) {
      return NextResponse.json(
        { error: "Visitor ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get visitor name for filename
    const [visitorRows] = (await pool.execute(
      "SELECT name FROM visitors WHERE id = ?",
      [visitorId]
    )) as [{ name: string }[], any];

    if (visitorRows.length === 0) {
      return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
    }

    const visitorName = visitorRows[0].name;

    // Build query for visitor's visits
    const query = `
      SELECT 
        vt.id,
        v.name as visitor_name,
        v.phone_number,
        vt.digital_card_no,
        vt.reason,
        vt.office,
        vt.visitee_name,
        vt.company,
        vt.person_in_charge,
        vt.has_laptop,
        vt.laptop_brand,
        vt.laptop_model,
        vt.other_items,
        vt.sign_in_time,
        vt.sign_out_time,
        CASE 
          WHEN vt.sign_out_time IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, vt.sign_in_time, vt.sign_out_time)
          ELSE NULL 
        END as duration_minutes,
        CASE 
          WHEN vt.sign_out_time IS NULL THEN 'Active'
          ELSE 'Signed Out'
        END as status,
        b.name as branch_name,
        u.name as registered_by_name,
        u2.name as signedout_by_name
      FROM visits vt
      JOIN visitors v ON vt.visitor_id = v.id
      JOIN branches b ON vt.branch_id = b.id
      JOIN users u ON vt.registered_by = u.id
      LEFT JOIN users u2 ON vt.signedout_by = u2.id
      WHERE vt.visitor_id = ?
      ORDER BY vt.sign_in_time DESC
    `;

    const [rows] = (await pool.execute(query, [visitorId])) as [
      VisitData[],
      any
    ];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No visits found for this visitor" },
        { status: 404 }
      );
    }

    // Format data for export
    const exportData = rows.map((row) => ({
      "Visit ID": row.id,
      "Visitor Name": row.visitor_name,
      "Phone Number": row.phone_number || "N/A",
      "Digital Card": row.digital_card_no || "N/A",
      Office: row.office,
      Reason: row.reason,
      "Person to Visit": row.visitee_name || "N/A",
      Company: row.company || "N/A",
      "Contact Person": row.person_in_charge || "N/A",
      "Has Laptop": row.has_laptop ? "Yes" : "No",
      "Laptop Brand": row.laptop_brand || "N/A",
      "Laptop Model": row.laptop_model || "N/A",
      "Other Items": row.other_items || "N/A",
      "Sign In Time": new Date(row.sign_in_time).toLocaleString(),
      "Sign Out Time": row.sign_out_time
        ? new Date(row.sign_out_time).toLocaleString()
        : "Still Active",
      Duration: row.duration_minutes
        ? `${Math.floor(row.duration_minutes / 60)}h ${
            row.duration_minutes % 60
          }m`
        : "N/A",
      Status: row.status,
      Branch: row.branch_name,
      "Registered By": row.registered_by_name,
      "Signed Out By": row.signedout_by_name || "N/A",
    }));

    const sanitizedVisitorName = visitorName.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${sanitizedVisitorName}_visits_${
      new Date().toISOString().split("T")[0]
    }`;

    if (format === "csv") {
      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((header) => `"${(row as any)[header]}"`).join(",")
        ),
      ].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else if (format === "pdf") {
      // Generate PDF
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text(`${visitorName} - Visit History`, 14, 15);

      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);
      doc.text(`Total Visits: ${rows.length}`, 14, 32);

      doc.setFontSize(8);
      let yPosition = 45;

      // Add headers
      doc.setFont(undefined, "bold");
      doc.text("Date", 14, yPosition);
      doc.text("Office", 50, yPosition);
      doc.text("Reason", 90, yPosition);
      doc.text("Sign In", 130, yPosition);
      doc.text("Sign Out", 170, yPosition);
      doc.text("Status", 200, yPosition);

      yPosition += 5;
      doc.line(14, yPosition, 210, yPosition); // Header line
      yPosition += 5;

      doc.setFont(undefined, "normal");

      // Add data rows
      exportData.forEach((row, index) => {
        if (yPosition > 280) {
          // Start new page if needed
          doc.addPage();
          yPosition = 20;

          // Re-add headers on new page
          doc.setFont(undefined, "bold");
          doc.text("Date", 14, yPosition);
          doc.text("Office", 50, yPosition);
          doc.text("Reason", 90, yPosition);
          doc.text("Sign In", 130, yPosition);
          doc.text("Sign Out", 170, yPosition);
          doc.text("Status", 200, yPosition);
          yPosition += 5;
          doc.line(14, yPosition, 210, yPosition);
          yPosition += 5;
          doc.setFont(undefined, "normal");
        }

        const signInDate = new Date(row["Sign In Time"]);
        const dateStr = signInDate.toLocaleDateString();
        const signInTime = signInDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const signOutTime =
          row["Sign Out Time"] === "Still Active"
            ? "Active"
            : row["Sign Out Time"] === "N/A"
            ? "N/A"
            : new Date(row["Sign Out Time"]).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

        doc.text(dateStr, 14, yPosition);
        doc.text(row["Office"].substring(0, 15), 50, yPosition);
        doc.text(row["Reason"].substring(0, 15), 90, yPosition);
        doc.text(signInTime, 130, yPosition);
        doc.text(signOutTime, 170, yPosition);
        doc.text(row["Status"], 200, yPosition);

        yPosition += 5;
      });

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Error generating visitor report:", error);
    return NextResponse.json(
      { error: "Failed to generate visitor report" },
      { status: 500 }
    );
  }
}
