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
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Download, FileText, CalendarIcon } from "lucide-react";
import toast from "react-hot-toast";

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
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined,
    },
    month: "",
    year: "",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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
      if (filters.dateRange.from)
        params.append("start_date", filters.dateRange.from.toISOString());
      if (filters.dateRange.to)
        params.append("end_date", filters.dateRange.to.toISOString());
      if (filters.month) {
        const [year, month] = filters.month.split("-");
        const startDate = startOfMonth(
          new Date(parseInt(year), parseInt(month) - 1)
        );
        const endDate = endOfMonth(
          new Date(parseInt(year), parseInt(month) - 1)
        );
        params.append("start_date", startDate.toISOString());
        params.append("end_date", endDate.toISOString());
      }
      if (filters.year) {
        const startDate = startOfYear(new Date(parseInt(filters.year), 0));
        const endDate = endOfYear(new Date(parseInt(filters.year), 11));
        params.append("start_date", startDate.toISOString());
        params.append("end_date", endDate.toISOString());
      }
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

  const handleDownloadLogs = async (format: "csv" | "pdf") => {
    try {
      setIsDownloading(true);
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
      if (filters.dateRange.from)
        params.append("start_date", filters.dateRange.from.toISOString());
      if (filters.dateRange.to)
        params.append("end_date", filters.dateRange.to.toISOString());
      if (filters.month) {
        const [year, month] = filters.month.split("-");
        const startDate = startOfMonth(
          new Date(parseInt(year), parseInt(month) - 1)
        );
        const endDate = endOfMonth(
          new Date(parseInt(year), parseInt(month) - 1)
        );
        params.append("start_date", startDate.toISOString());
        params.append("end_date", endDate.toISOString());
      }
      if (filters.year) {
        const startDate = startOfYear(new Date(parseInt(filters.year), 0));
        const endDate = endOfYear(new Date(parseInt(filters.year), 11));
        params.append("start_date", startDate.toISOString());
        params.append("end_date", endDate.toISOString());
      }
      params.append("format", format);

      const response = await fetch(`/api/audit-logs/download?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download audit logs");
      }

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(
        `Audit logs downloaded successfully as ${format.toUpperCase()}`
      );
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download audit logs");
    } finally {
      setIsDownloading(false);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-gray-600 mt-2">
            Track all CRUD operations on branch offices, branch reasons, and
            users
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isDownloading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download Logs"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownloadLogs("csv")}>
              <FileText className="h-4 w-4 mr-2" />
              Download as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownloadLogs("pdf")}>
              <FileText className="h-4 w-4 mr-2" />
              Download as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium mb-2">
                Date Range
              </label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                          {format(filters.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={filters.dateRange}
                    onSelect={(range) => {
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: {
                          from: range?.from || undefined,
                          to: range?.to || undefined,
                        },
                        month: "",
                        year: "",
                      }));
                      setDatePickerOpen(false);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <Select
                value={filters.month}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    month: value === "all" ? "" : value,
                    dateRange: { from: undefined, to: undefined },
                    year: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2024, i);
                    const year = date.getFullYear();
                    const month = String(i + 1).padStart(2, "0");
                    return (
                      <SelectItem
                        key={`${year}-${month}`}
                        value={`${year}-${month}`}
                      >
                        {format(date, "MMMM yyyy")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Select
                value={filters.year}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    year: value === "all" ? "" : value,
                    dateRange: { from: undefined, to: undefined },
                    month: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  table: "all",
                  operation: "all",
                  includeLogins: false,
                  limit: 50,
                  offset: 0,
                  dateRange: { from: undefined, to: undefined },
                  month: "",
                  year: "",
                })
              }
            >
              Clear Filters
            </Button>
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
