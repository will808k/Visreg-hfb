# Audit Logging System Setup

This document explains how to set up and use the audit logging system for tracking CRUD operations on `branch_offices`, `branch_reasons`, and `users` tables, as well as user login attempts.

## Overview

The audit logging system automatically captures:

- **CREATE** operations: When new records are inserted
- **UPDATE** operations: When existing records are modified (with before/after values)
- **DELETE** operations: When records are removed
- **LOGIN_SUCCESS** operations: When users successfully log in
- **LOGIN_FAILED** operations: When login attempts fail

For each operation, the system logs:

- Table name and record ID
- Operation type (CREATE/UPDATE/DELETE/LOGIN_SUCCESS/LOGIN_FAILED)
- Old and new values (for updates)
- Changed fields (for updates)
- User who performed the operation
- Timestamp
- IP address and user agent (when available)
- Failure reason (for failed logins)

## Database Setup

### 1. Create the Audit Logs Table

Run the SQL script to create the audit logs table and triggers:

```bash
mysql -u your_username -p your_database < scripts/create-logs-table.sql
```

### 2. Create the Login Logs Table

Run the SQL script to create the login logs table:

```bash
mysql -u your_username -p your_database < scripts/create-login-logs-table.sql
```

Or execute the SQL directly in your MySQL client:

```sql
-- The audit logs script creates:
-- 1. audit_logs table
-- 2. Triggers for branch_offices table (INSERT, UPDATE, DELETE)
-- 3. Triggers for branch_reasons table (INSERT, UPDATE, DELETE)
-- 4. Triggers for users table (INSERT, UPDATE, DELETE)

-- The login logs script creates:
-- 1. login_logs table for tracking login attempts
```

### 3. Verify Table Creation

Check that the tables and triggers were created successfully:

```sql
-- Check if audit_logs table exists
SHOW TABLES LIKE 'audit_logs';

-- Check if login_logs table exists
SHOW TABLES LIKE 'login_logs';

-- Check triggers
SHOW TRIGGERS LIKE 'branch_%';
SHOW TRIGGERS LIKE 'users_%';
```

## API Endpoints

### View Audit Logs

**GET** `/api/audit-logs`

Query parameters:

- `table` (optional): Filter by table name (`branch_offices`, `branch_reasons`, `users`)
- `operation` (optional): Filter by operation (`CREATE`, `UPDATE`, `DELETE`, `LOGIN_SUCCESS`, `LOGIN_FAILED`)
- `user_id` (optional): Filter by user ID
- `record_id` (optional): Filter by specific record ID
- `include_logins` (optional): Include login logs in results (`true`/`false`)
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Number of records to skip (default: 0)

**Headers:**

- `Authorization: Bearer <token>` (required)
- User must be an admin

**Example:**

```bash
curl -H "Authorization: Bearer your_token" \
  "http://localhost:3000/api/audit-logs?table=users&operation=UPDATE&limit=10"

# Include login logs
curl -H "Authorization: Bearer your_token" \
  "http://localhost:3000/api/audit-logs?include_logins=true&limit=20"
```

### View Login Logs

**GET** `/api/login-logs`

Query parameters:

- `action` (optional): Set to `stats` to get login statistics
- `user_id` (optional): Filter by user ID
- `email` (optional): Filter by email address
- `success` (optional): Filter by success status (`true`/`false`)
- `start_date` (optional): Filter by start date (ISO format)
- `end_date` (optional): Filter by end date (ISO format)
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Number of records to skip (default: 0)

**Headers:**

- `Authorization: Bearer <token>` (required)
- User must be an admin

**Example:**

```bash
# Get login logs
curl -H "Authorization: Bearer your_token" \
  "http://localhost:3000/api/login-logs?success=false&limit=10"

# Get login statistics
curl -H "Authorization: Bearer your_token" \
  "http://localhost:3000/api/login-logs?action=stats"
```

## Frontend Dashboard

### Audit Logs Dashboard

Access the audit logs dashboard at `/dashboard/audit-logs` (admin users only).

Features:

- Filter by table, operation type, and limit
- Include login logs in the same view
- View detailed before/after values for updates
- See which fields were changed
- Track user activity and IP addresses
- Pagination support

### Login Logs Dashboard

Access the dedicated login logs dashboard at `/dashboard/login-logs` (admin users only).

Features:

- View login statistics (total, successful, failed, unique users)
- Filter by success status, email, and date range
- See failure reasons for failed login attempts
- Track IP addresses and user agents
- Monitor security events and suspicious activity

## How It Works

### 1. Database Triggers

The system uses MySQL triggers that automatically fire when:

- Records are inserted into `branch_offices`, `branch_reasons`, or `users`
- Records are updated in these tables
- Records are deleted from these tables

### 2. User Context

Before performing operations, the API routes set user context variables:

```typescript
await setUserContext(decoded.id, decoded.name, connection);
```

These variables are used by the triggers to capture who performed the operation.

### 3. Login Logging

Login attempts are logged directly in the login API route using the `logLoginAttempt` function:

```typescript
// Successful login
await logLoginAttempt({
  user_id: user.id,
  email,
  success: true,
  ip_address: ipAddress,
  user_agent: userAgent,
});

// Failed login
await logLoginAttempt({
  email,
  success: false,
  ip_address: ipAddress,
  user_agent: userAgent,
  failure_reason: "Invalid password",
});
```

This captures all login attempts including:

- Successful logins
- Failed logins with specific failure reasons
- IP addresses and user agents
- Timestamps

### 4. Audit Log Structure

Each audit log entry contains:

```json
{
  "id": 1,
  "table_name": "users",
  "record_id": 123,
  "operation": "UPDATE",
  "old_values": { "name": "Old Name", "email": "old@email.com" },
  "new_values": { "name": "New Name", "email": "new@email.com" },
  "changed_fields": ["name", "email"],
  "user_id": 456,
  "user_name": "Admin User",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Security Considerations

1. **Admin Only Access**: Only admin users can view audit logs
2. **Password Protection**: Password changes are logged but the actual password values are not stored in audit logs
3. **IP Tracking**: IP addresses are captured for security auditing
4. **User Context**: All operations are tied to authenticated users

## Maintenance

### Cleanup Old Logs

To prevent the audit logs table from growing too large, consider implementing a cleanup strategy:

```sql
-- Delete logs older than 1 year
DELETE FROM audit_logs
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Or archive old logs to a separate table
```

### Performance Considerations

- The audit_logs table has indexes on commonly queried fields
- Consider partitioning by date for very high-volume systems
- Monitor query performance and add additional indexes if needed

## Troubleshooting

### Triggers Not Firing

1. Check if triggers exist:

   ```sql
   SHOW TRIGGERS LIKE 'branch_%';
   ```

2. Verify user context is being set:
   ```sql
   SELECT @current_user_id, @current_user_name;
   ```

### Missing User Information

If user information is missing from logs:

1. Ensure the API route is calling `setUserContext()` before database operations
2. Check that the user is properly authenticated
3. Verify the user exists in the users table

### Performance Issues

1. Check if indexes are being used:

   ```sql
   EXPLAIN SELECT * FROM audit_logs WHERE table_name = 'users';
   ```

2. Consider adding additional indexes based on your query patterns

## Example Usage

### Creating a Branch with Offices and Reasons

When a user creates a branch with offices and reasons, the following audit logs will be created:

1. One log for each office created in `branch_offices`
2. One log for each reason created in `branch_reasons`

### Updating a User

When a user is updated, the system will:

1. Compare old and new values
2. Identify which fields changed
3. Create a single audit log entry with before/after values
4. List the specific fields that were modified

### Deleting a Branch

When a branch is deleted:

1. All related offices and reasons are automatically deleted (due to foreign key constraints)
2. Audit logs are created for each deleted office and reason
3. The branch deletion itself is not logged (as it's not one of the tracked tables)

This comprehensive audit logging system provides full visibility into all changes made to the critical business data in your application.
