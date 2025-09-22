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

interface LoginLog {
  id: number;
  user_id?: number;
  email: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  failure_reason?: string;
  user_name?: string;
  branch_name?: string;
  timestamp: string;
}

interface LoginStats {
  total_logins: number;
  successful_logins: number;
  failed_logins: number;
  unique_users: number;
  top_ips: Array<{ ip_address: string; count: number }>;
}

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    success: "all",
    email: "",
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
      if (filters.success !== "all") params.append("success", filters.success);
      if (filters.email) params.append("email", filters.email);
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

      const response = await fetch(`/api/login-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch login logs");
      }

      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/login-logs?action=stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch login stats:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters]);

  const getSuccessColor = (success: boolean) => {
    return success
      ? "bg-emerald-100 text-emerald-800"
      : "bg-red-100 text-red-800";
  };

  const getFailureReason = (reason?: string) => {
    if (!reason) return "N/A";
    return reason.replace(/_/g, " ").toLowerCase();
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
      if (filters.success !== "all") params.append("success", filters.success);
      if (filters.email) params.append("email", filters.email);
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

      const response = await fetch(`/api/login-logs/download?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download login logs");
      }

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `login-logs-${new Date().toISOString().split("T")[0]}.${format}`;

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
        `Login logs downloaded successfully as ${format.toUpperCase()}`
      );
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download login logs");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading login logs...</div>
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
          <h1 className="text-3xl font-bold">Login Logs</h1>
          <p className="text-gray-600 mt-2">
            Track all user login attempts and security events
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

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Logins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_logins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {stats.successful_logins}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.failed_logins}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unique_users}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select
                value={filters.success}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, success: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="true">Successful</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="text"
                placeholder="Filter by email..."
                value={filters.email}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, email: e.target.value }))
                }
              />
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
                  success: "all",
                  email: "",
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
          <CardTitle>Login Logs ({logs.length} records)</CardTitle>
          <CardDescription>
            Showing login attempts with current filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Failure Reason</TableHead>
                  <TableHead>User Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>{log.email}</TableCell>
                    <TableCell>
                      {log.user_name || "Unknown"}
                      {log.branch_name && (
                        <div className="text-xs text-gray-500">
                          {log.branch_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getSuccessColor(log.success)}>
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.ip_address || "N/A"}</TableCell>
                    <TableCell>
                      {log.failure_reason ? (
                        <span className="text-red-600">
                          {getFailureReason(log.failure_reason)}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800 text-xs">
                          View
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-w-xs">
                          {log.user_agent || "N/A"}
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
              No login logs found with current filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
