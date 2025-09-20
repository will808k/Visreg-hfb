import pool from "./db";

export interface LoginLogEntry {
  id?: number;
  user_id?: number;
  email: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  failure_reason?: string;
  timestamp?: Date;
}

/**
 * Log a login attempt (successful or failed)
 */
export async function logLoginAttempt(
  entry: LoginLogEntry,
  connection?: any
): Promise<void> {
  const conn = connection || pool;

  const query = `
    INSERT INTO login_logs (
      user_id,
      email,
      success,
      ip_address,
      user_agent,
      failure_reason
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const values = [
    entry.user_id || null,
    entry.email,
    entry.success,
    entry.ip_address || null,
    entry.user_agent || null,
    entry.failure_reason || null,
  ];

  await conn.execute(query, values);
}

/**
 * Get login logs with optional filters
 */
export async function getLoginLogs(
  limit: number = 50,
  offset: number = 0,
  userId?: number,
  email?: string,
  success?: boolean,
  startDate?: Date,
  endDate?: Date
) {
  let query = `
    SELECT 
      ll.*,
      u.name as user_name,
      b.name as branch_name
    FROM login_logs ll
    LEFT JOIN users u ON ll.user_id = u.id
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE 1=1
  `;

  const values: any[] = [];

  if (userId) {
    query += " AND ll.user_id = ?";
    values.push(userId);
  }

  if (email) {
    query += " AND ll.email LIKE ?";
    values.push(`%${email}%`);
  }

  if (success !== undefined) {
    query += " AND ll.success = ?";
    values.push(success);
  }

  if (startDate) {
    query += " AND ll.timestamp >= ?";
    values.push(startDate);
  }

  if (endDate) {
    query += " AND ll.timestamp <= ?";
    values.push(endDate);
  }

  query += " ORDER BY ll.timestamp DESC LIMIT ? OFFSET ?";
  values.push(limit, offset);

  const [rows] = await pool.execute(query, values);
  return rows;
}

/**
 * Get login statistics
 */
export async function getLoginStats(
  startDate?: Date,
  endDate?: Date
): Promise<{
  total_logins: number;
  successful_logins: number;
  failed_logins: number;
  unique_users: number;
  top_ips: Array<{ ip_address: string; count: number }>;
}> {
  let whereClause = "";
  const values: any[] = [];

  if (startDate || endDate) {
    const conditions = [];
    if (startDate) {
      conditions.push("timestamp >= ?");
      values.push(startDate);
    }
    if (endDate) {
      conditions.push("timestamp <= ?");
      values.push(endDate);
    }
    whereClause = "WHERE " + conditions.join(" AND ");
  }

  // Get basic stats
  const [statsRows] = await pool.execute(
    `
    SELECT 
      COUNT(*) as total_logins,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logins,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_logins,
      COUNT(DISTINCT user_id) as unique_users
    FROM login_logs
    ${whereClause}
  `,
    values
  );

  // Get top IPs
  const [ipRows] = await pool.execute(
    `
    SELECT 
      ip_address,
      COUNT(*) as count
    FROM login_logs
    ${whereClause}
    GROUP BY ip_address
    ORDER BY count DESC
    LIMIT 10
  `,
    values
  );

  const stats = (statsRows as any[])[0];
  const topIps = ipRows as any[];

  return {
    total_logins: stats.total_logins || 0,
    successful_logins: stats.successful_logins || 0,
    failed_logins: stats.failed_logins || 0,
    unique_users: stats.unique_users || 0,
    top_ips: topIps.map((row) => ({
      ip_address: row.ip_address || "Unknown",
      count: row.count,
    })),
  };
}

/**
 * Extract IP address and user agent from request
 */
export function extractRequestInfo(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  return {
    ipAddress: ipAddress.split(",")[0].trim(), // Get first IP if multiple
    userAgent,
  };
}

/**
 * Get recent failed login attempts for an IP (for security monitoring)
 */
export async function getRecentFailedLogins(
  ipAddress: string,
  minutes: number = 15
): Promise<number> {
  const [rows] = await pool.execute(
    `
    SELECT COUNT(*) as count
    FROM login_logs
    WHERE ip_address = ? 
      AND success = 0 
      AND timestamp >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
  `,
    [ipAddress, minutes]
  );

  return (rows as any[])[0]?.count || 0;
}
