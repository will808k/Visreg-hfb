"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { PhotoIndicator } from "@/components/photo-indicator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Eye,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  Laptop,
  CreditCard,
  Building2,
  Camera,
  Expand,
  Package,
  Clock,
  Download,
  FileText,
  CalendarIcon,
  X,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Visitor {
  id: number;
  name: string;
  visit_count: number;
  last_visit: string;
  total_visits: number;
  phone_number?: string;
  last_visit_details?: {
    id: number;
    digital_card_no: string | null;
    reason: string;
    office: string;
    has_laptop: boolean;
    laptop_brand: string | null;
    laptop_model: string | null;
    company: string | null;
    person_in_charge: string | null;
    photo: string | null;
    id_photo_front: string | null;
    id_photo_back: string | null;
    signature: string | null;
    sign_in_time: string;
    sign_out_time: string | null;
    duration_minutes: number | null;
    branch_name: string;
    registered_by_name: string;
    status: "active" | "completed";
    other_items: string[] | null;
    visitee_name: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ReportsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isDateRangeActive, setIsDateRangeActive] = useState<boolean>(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [selectedVisitDetails, setSelectedVisitDetails] = useState<
    Visitor["last_visit_details"] | null
  >(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const router = useRouter();
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchAvailableDates = async () => {
    try {
      setDatesLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/reports/available-dates", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const dates = await response.json();
        setAvailableDates(dates);
      }
    } catch (error) {
      console.error("Error fetching available dates:", error);
    } finally {
      setDatesLoading(false);
    }
  };

  const fetchVisitors = async (
    page = 1,
    search = "",
    vendorFilterValue = vendorFilter,
    date: Date | undefined = selectedDate,
    fromDateParam: Date | undefined = fromDate,
    toDateParam: Date | undefined = toDate,
    isDateRangeParam: boolean = isDateRangeActive
  ) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const dateString = date ? date.toISOString().split("T")[0] : "";
      const fromDateString = fromDateParam
        ? fromDateParam.toISOString().split("T")[0]
        : "";
      const toDateString = toDateParam
        ? toDateParam.toISOString().split("T")[0]
        : "";

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: search,
        vendor: vendorFilterValue,
        includeImages: "false", // Don't load images for better performance
        ...(dateString && !isDateRangeParam && { date: dateString }),
        ...(isDateRangeParam && fromDateString && { fromDate: fromDateString }),
        ...(isDateRangeParam && toDateString && { toDate: toDateString }),
      });

      const response = await fetch(`/api/reports/visitors?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch visitors");
      }

      const data = await response.json();
      setVisitors(data.visitors || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching visitors:", error);
      toast.error("Failed to load visitor reports");
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (format: "csv" | "pdf") => {
    try {
      setIsDownloading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const dateString = selectedDate
        ? selectedDate.toISOString().split("T")[0]
        : "";

      const queryParams = new URLSearchParams({
        format,
        search: searchTerm,
        vendor: vendorFilter,
        ...(dateString && { date: dateString }),
      });

      const response = await fetch(`/api/reports/download?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download report");
      }

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `visitor-report-${dateString || "all"}.${format}`;

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
        `Report downloaded successfully as ${format.toUpperCase()}`
      );
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
    fetchAvailableDates();
  }, []);

  // Trigger fetch when vendor filter, date, or date range changes (not search term)
  useEffect(() => {
    fetchVisitors(
      1,
      searchTerm,
      vendorFilter,
      selectedDate,
      fromDate,
      toDate,
      isDateRangeActive
    );
  }, [vendorFilter, selectedDate, fromDate, toDate, isDateRangeActive]);

  // Handle manual search execution
  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
    fetchVisitors(
      1,
      searchInput.trim(),
      vendorFilter,
      selectedDate,
      fromDate,
      toDate,
      isDateRangeActive
    );
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchVisitors(
      newPage,
      searchTerm,
      vendorFilter,
      selectedDate,
      fromDate,
      toDate,
      isDateRangeActive
    );
  };

  // Date range handler functions
  const handleFromDateChange = (date: Date | undefined) => {
    setFromDate(date);
    if (date && toDate && date <= toDate) {
      setIsDateRangeActive(true);
      setSelectedDate(undefined); // Clear single date selection
      fetchVisitors(1, searchTerm, vendorFilter, undefined, date, toDate, true);
    }
  };

  const handleToDateChange = (date: Date | undefined) => {
    setToDate(date);
    if (date && fromDate && fromDate <= date) {
      setIsDateRangeActive(true);
      setSelectedDate(undefined); // Clear single date selection
      fetchVisitors(
        1,
        searchTerm,
        vendorFilter,
        undefined,
        fromDate,
        date,
        true
      );
    }
  };

  const handleDateRangeClear = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setIsDateRangeActive(false);
    fetchVisitors(
      1,
      searchTerm,
      vendorFilter,
      undefined,
      undefined,
      undefined,
      false
    );
  };

  const handleSingleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setIsDateRangeActive(false);
      setFromDate(undefined);
      setToDate(undefined);
      fetchVisitors(
        1,
        searchTerm,
        vendorFilter,
        date,
        undefined,
        undefined,
        false
      );
    }
  };

  const handleViewDetails = (visitorId: number) => {
    router.push(`/dashboard/reports/${visitorId}`);
  };

  const handleExpandDetails = (visitor: Visitor) => {
    setSelectedVisitDetails(visitor.last_visit_details);
    setIsDetailsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  };

  const totalVisits = visitors.reduce(
    (sum, visitor) => sum + visitor.visit_count,
    0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Visitor Reports</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Loading...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 rounded animate-pulse"
                ></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Visitor Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze visitor statistics and history
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isDownloading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download Report"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownloadReport("csv")}>
              <FileText className="h-4 w-4 mr-2" />
              Download as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownloadReport("pdf")}>
              <FileText className="h-4 w-4 mr-2" />
              Download as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-blue-700">
                  Total Visitors
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {pagination.total}
                </p>
              </div>
              <div className="p-3 bg-blue-600 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-green-700">
                  Total Visits
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {totalVisits}
                </p>
              </div>
              <div className="p-3 bg-green-600 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-purple-700">
                  Current Page
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {pagination.page}{" "}
                  <span className="text-lg text-purple-700">
                    of {pagination.totalPages}
                  </span>
                </p>
              </div>
              <div className="p-3 bg-purple-600 rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Reports</CardTitle>
          <CardDescription>
            View visitor statistics and detailed visit history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors by name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-8"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <div className="flex space-x-2">
              {/* Date Range Pickers */}
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal text-sm",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? (
                        fromDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      ) : (
                        <span>From</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fromDate}
                      onSelect={handleFromDateChange}
                      initialFocus
                      disabled={(date) => (toDate ? date > toDate : false)}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal text-sm",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? (
                        toDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      ) : (
                        <span>To</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={handleToDateChange}
                      initialFocus
                      disabled={(date) => (fromDate ? date < fromDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Single Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal text-sm",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      selectedDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    ) : (
                      <span>Specific Date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSingleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visitors</SelectItem>
                  <SelectItem value="vendors">Vendors Only</SelectItem>
                  <SelectItem value="regular">Regular Visitors</SelectItem>
                </SelectContent>
              </Select>

              {(searchTerm ||
                selectedDate ||
                fromDate ||
                toDate ||
                vendorFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    setSearchTerm("");
                    setSelectedDate(undefined);
                    setFromDate(undefined);
                    setToDate(undefined);
                    setIsDateRangeActive(false);
                    setVendorFilter("all");
                    fetchVisitors(
                      1,
                      "",
                      "all",
                      undefined,
                      undefined,
                      undefined,
                      false
                    );
                  }}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Visitors Table */}
          <div className="space-y-1">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">
                    Number of Visits
                  </TableHead>
                  <TableHead>Last Visit Date</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.length === 0 ? (
                  <TableRow className="border-b">
                    <TableCell colSpan={5} className="text-center py-8">
                      {searchTerm || selectedDate || vendorFilter !== "all"
                        ? "No visitors found matching your criteria."
                        : "No visitors found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  visitors.map((visitor) => (
                    <TableRow
                      key={visitor.id}
                      className="hover:bg-muted/50 border-b"
                    >
                      <TableCell>
                        <div className="font-medium">{visitor.name}</div>
                        {visitor.phone_number && (
                          <div className="text-sm text-muted-foreground">
                            {formatPhoneNumber(visitor.phone_number)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {visitor.visit_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {formatDate(visitor.last_visit)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {visitor.last_visit_details ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExpandDetails(visitor)}
                            className="hover:bg-green-50 hover:text-green-600"
                          >
                            <Expand className="h-4 w-4 mr-1" />
                            {selectedDate ? "Visit Details" : "Last Visit"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No details
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(visitor.id)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Full History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} visitors
                {selectedDate && (
                  <span>
                    {" "}
                    •{" "}
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
                {isDateRangeActive && fromDate && toDate && (
                  <span>
                    {" "}
                    •{" "}
                    {fromDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    -{" "}
                    {toDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {selectedDate
                ? "Visit Details for Selected Date"
                : "Last Visit Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedVisitDetails && (
            <div className="space-y-6">
              {/* Personal Information */}
              <Card className="modern-shadow border-0">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <User className="h-5 w-5 mr-2 text-blue-600" />
                    Visit Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Sign In Time
                      </Label>
                      <div className="text-base flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDateTime(selectedVisitDetails.sign_in_time)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Sign Out Time
                      </Label>
                      <div className="text-base mt-1">
                        {selectedVisitDetails.sign_out_time ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDateTime(selectedVisitDetails.sign_out_time)}
                          </div>
                        ) : (
                          <Badge variant="destructive">Still Active</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Duration
                      </Label>
                      <div className="text-base mt-1">
                        {formatDuration(selectedVisitDetails.duration_minutes)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Status
                      </Label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            selectedVisitDetails.status === "completed"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {selectedVisitDetails.status === "completed"
                            ? "Completed"
                            : "Active"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Office
                      </Label>
                      <div className="text-base flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        {selectedVisitDetails.office}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Reason
                      </Label>
                      <div className="text-base mt-1">
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-700"
                        >
                          {selectedVisitDetails.reason}
                        </Badge>
                      </div>
                    </div>
                    {selectedVisitDetails.visitee_name && (
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Visiting
                        </Label>
                        <div className="text-base flex items-center mt-1">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedVisitDetails.visitee_name}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Branch
                      </Label>
                      <div className="mt-1">
                        <Badge variant="outline">
                          {selectedVisitDetails.branch_name}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Registered By
                      </Label>
                      <div className="text-base mt-1">
                        {selectedVisitDetails.registered_by_name}
                      </div>
                    </div>
                    {selectedVisitDetails.digital_card_no && (
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Digital Card
                        </Label>
                        <div className="mt-1">
                          <Badge variant="outline" className="font-mono">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {selectedVisitDetails.digital_card_no}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Equipment Information */}
              {selectedVisitDetails.has_laptop && (
                <Card className="modern-shadow border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <Laptop className="h-5 w-5 mr-2 text-blue-600" />
                      Equipment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Brand
                        </Label>
                        <div className="text-base mt-1">
                          {selectedVisitDetails.laptop_brand}
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Serial No.
                        </Label>
                        <div className="text-base mt-1">
                          {selectedVisitDetails.laptop_model}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Other Items */}
              {selectedVisitDetails.other_items &&
                selectedVisitDetails.other_items.length > 0 && (
                  <Card className="modern-shadow border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <Package className="h-5 w-5 mr-2 text-blue-600" />
                        Other Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedVisitDetails.other_items.map((item, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-gray-50"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Vendor Information */}
              {selectedVisitDetails.company && (
                <Card className="modern-shadow border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <Building2 className="h-5 w-5 mr-2 text-green-600" />
                      Vendor Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Company
                        </Label>
                        <div className="text-base mt-1">
                          {selectedVisitDetails.company}
                        </div>
                      </div>
                      {selectedVisitDetails.person_in_charge && (
                        <div>
                          <Label className="text-gray-700 font-medium text-base">
                            Contact Person
                          </Label>
                          <div className="text-base mt-1">
                            {selectedVisitDetails.person_in_charge}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Photos Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Camera className="h-5 w-5 mr-2 text-blue-600" />
                    Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Only show photo indicators for photos that exist */}
                  {(selectedVisitDetails?.photo === "exists" ||
                    selectedVisitDetails?.photo) && (
                    <PhotoIndicator
                      visitorId={selectedVisitDetails.id}
                      photoType="photo"
                      label="Visitor Photo"
                    />
                  )}
                  {(selectedVisitDetails?.id_photo_front === "exists" ||
                    selectedVisitDetails?.id_photo_front) && (
                    <PhotoIndicator
                      visitorId={selectedVisitDetails.id}
                      photoType="id_front"
                      label="ID Photo (Front)"
                    />
                  )}
                  {(selectedVisitDetails?.id_photo_back === "exists" ||
                    selectedVisitDetails?.id_photo_back) && (
                    <PhotoIndicator
                      visitorId={selectedVisitDetails.id}
                      photoType="id_back"
                      label="ID Photo (Back)"
                    />
                  )}
                  {(selectedVisitDetails?.signature === "exists" ||
                    selectedVisitDetails?.signature) && (
                    <PhotoIndicator
                      visitorId={selectedVisitDetails.id}
                      photoType="signature"
                      label="Signature"
                    />
                  )}
                  {!selectedVisitDetails?.photo &&
                    !selectedVisitDetails?.id_photo_front &&
                    !selectedVisitDetails?.id_photo_back &&
                    !selectedVisitDetails?.signature && (
                      <div className="flex items-center text-gray-600">
                        <Camera className="h-4 w-4 mr-2" />
                        <span>No photos available for this visit</span>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
