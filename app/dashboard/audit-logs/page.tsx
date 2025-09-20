"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface AuditLog {
  id: number | string;
  table_name: string;
  record_id: number;
  operation: "CREATE" | "UPDATE" | "DELETE" | "LOGIN_SUCCESS" | "LOGIN_FAILED";
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  user_id?: number;
  user_name?: string;
  branch_name?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    table: "all",
    operation: "all",
    includeLogins: false,
    limit: 50,
    offset: 0,
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found");
        return;
      }

      const params = new URLSearchParams();
      if (filters.table && filters.table !== "all")
        params.append("table", filters.table);
      if (filters.operation && filters.operation !== "all")
        params.append("operation", filters.operation);
      if (filters.includeLogins) params.append("include_logins", "true");
      params.append("limit", filters.limit.toString());
      params.append("offset", filters.offset.toString());

      const response = await fetch(`/api/audit-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "UPDATE":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "LOGIN_SUCCESS":
        return "bg-emerald-100 text-emerald-800";
      case "LOGIN_FAILED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatJsonValue = (value: any) => {
    if (!value) return "N/A";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading audit logs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchLogs} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-gray-600 mt-2">
          Track all CRUD operations on branch offices, branch reasons, and users
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Table</label>
              <Select
                value={filters.table}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, table: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  <SelectItem value="branch_offices">Branch Offices</SelectItem>
                  <SelectItem value="branch_reasons">Branch Reasons</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Operation
              </label>
              <Select
                value={filters.operation}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, operation: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All operations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All operations</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
                  <SelectItem value="LOGIN_FAILED">Login Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Include Login Logs
              </label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-logins"
                  checked={filters.includeLogins}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({
                      ...prev,
                      includeLogins: !!checked,
                    }))
                  }
                />
                <label
                  htmlFor="include-logins"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Show login attempts
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Limit</label>
              <Input
                type="number"
                value={filters.limit}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    limit: parseInt(e.target.value) || 50,
                  }))
                }
                min="1"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({logs.length} records)</CardTitle>
          <CardDescription>Showing logs with current filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.table_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getOperationColor(log.operation)}>
                        {log.operation}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.record_id}</TableCell>
                    <TableCell>{log.user_name || "System"}</TableCell>
                    <TableCell>{log.branch_name || "N/A"}</TableCell>
                    <TableCell>{log.ip_address || "N/A"}</TableCell>
                    <TableCell>
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">
                          View Details
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          {(log.operation === "LOGIN_SUCCESS" ||
                            log.operation === "LOGIN_FAILED") && (
                            <div className="mb-2">
                              <strong>Login Details:</strong>
                              <pre className="mt-1">
                                {formatJsonValue(log.new_values)}
                              </pre>
                            </div>
                          )}
                          {log.operation === "UPDATE" && (
                            <div className="mb-2">
                              <strong>Changed Fields:</strong>
                              <pre className="mt-1">
                                {formatJsonValue(log.changed_fields)}
                              </pre>
                            </div>
                          )}
                          {log.old_values &&
                            log.operation !== "LOGIN_SUCCESS" &&
                            log.operation !== "LOGIN_FAILED" && (
                              <div className="mb-2">
                                <strong>Old Values:</strong>
                                <pre className="mt-1">
                                  {formatJsonValue(log.old_values)}
                                </pre>
                              </div>
                            )}
                          {log.new_values &&
                            log.operation !== "LOGIN_SUCCESS" &&
                            log.operation !== "LOGIN_FAILED" && (
                              <div>
                                <strong>New Values:</strong>
                                <pre className="mt-1">
                                  {formatJsonValue(log.new_values)}
                                </pre>
                              </div>
                            )}
                        </div>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No audit logs found with current filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
