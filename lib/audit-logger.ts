import pool from "./db";

export interface AuditLogEntry {
  id?: number;
  table_name: string;
  record_id: number;
  operation: "CREATE" | "UPDATE" | "DELETE";
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  user_id?: number;
  user_name?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp?: Date;
}

/**
 * Set the current user context for database triggers
 * This allows triggers to capture who performed the operation
 */
export async function setUserContext(
  userId: number,
  userName: string,
  connection?: any
) {
  const conn = connection || pool;
  await conn.execute("SET @current_user_id = ?", [userId]);
  await conn.execute("SET @current_user_name = ?", [userName]);
}

/**
 * Clear the user context after operations
 */
export async function clearUserContext(connection?: any) {
  const conn = connection || pool;
  await conn.execute("SET @current_user_id = NULL");
  await conn.execute("SET @current_user_name = NULL");
}

/**
 * Manually log an audit entry (for cases where triggers aren't sufficient)
 */
export async function logAuditEntry(entry: AuditLogEntry, connection?: any) {
  const conn = connection || pool;

  const query = `
    INSERT INTO audit_logs (
      table_name, 
      record_id, 
      operation, 
      old_values, 
      new_values, 
      changed_fields,
      user_id,
      user_name,
      ip_address,
      user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    entry.table_name,
    entry.record_id,
    entry.operation,
    entry.old_values ? JSON.stringify(entry.old_values) : null,
    entry.new_values ? JSON.stringify(entry.new_values) : null,
    entry.changed_fields ? JSON.stringify(entry.changed_fields) : null,
    entry.user_id,
    entry.user_name,
    entry.ip_address,
    entry.user_agent,
  ];

  await conn.execute(query, values);
}

/**
 * Get audit logs for a specific table and record
 */
export async function getAuditLogs(
  tableName: string,
  recordId?: number,
  limit: number = 50,
  offset: number = 0
) {
  let query = `
    SELECT 
      al.*,
      u.name as user_name,
      b.name as branch_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE al.table_name = ?
  `;

  const values: any[] = [tableName];

  if (recordId) {
    query += " AND al.record_id = ?";
    values.push(recordId);
  }

  query += " ORDER BY al.timestamp DESC LIMIT ? OFFSET ?";
  values.push(limit, offset);

  const [rows] = await pool.execute(query, values);
  return rows;
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: number,
  limit: number = 50,
  offset: number = 0
) {
  const query = `
    SELECT 
      al.*,
      u.name as user_name,
      b.name as branch_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE al.user_id = ?
    ORDER BY al.timestamp DESC 
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.execute(query, [userId, limit, offset]);
  return rows;
}

/**
 * Get all audit logs with pagination
 */
export async function getAllAuditLogs(
  limit: number = 50,
  offset: number = 0,
  tableName?: string,
  operation?: string
) {
  let query = `
    SELECT 
      al.*,
      u.name as user_name,
      b.name as branch_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN branches b ON u.branch_id = b.id
    WHERE 1=1
  `;

  const values: any[] = [];

  if (tableName) {
    query += " AND al.table_name = ?";
    values.push(tableName);
  }

  if (operation) {
    query += " AND al.operation = ?";
    values.push(operation);
  }

  query += " ORDER BY al.timestamp DESC LIMIT ? OFFSET ?";
  values.push(limit, offset);

  const [rows] = await pool.execute(query, values);
  return rows;
}

/**
 * Extract user information from request headers and token
 */
export function extractUserInfo(request: Request, token?: any) {
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  return {
    userId: token?.id,
    userName: token?.name,
    ipAddress,
    userAgent,
  };
}
