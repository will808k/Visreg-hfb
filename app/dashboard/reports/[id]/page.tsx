"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PhotoIndicator } from "@/components/photo-indicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Laptop,
  CreditCard,
  Camera,
  CheckCircle,
  XCircle,
  Building2,
  Eye,
  Package,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Visit {
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
  signedout_by_name: string | null;
  leftwithdevice?: string | null; // JSON string of items left with visitor
}

interface Visitor {
  id: number;
  name: string;
  residence?: string;
  total_visits: number;
  created_at: string;
  updated_at: string;
}

interface Statistics {
  total_visits: number;
  completed_visits: number;
  active_visits: number;
  avg_duration_minutes: number;
}

interface VisitorDetailsData {
  visitor: Visitor;
  visits: Visit[];
  statistics: Statistics;
}

export default function VisitorDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [data, setData] = useState<VisitorDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isVisitDetailsOpen, setIsVisitDetailsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchVisitorDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch(
          `/api/reports/visitors/${resolvedParams.id}?includeImages=false`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }

        if (response.status === 404) {
          toast.error("Visitor not found");
          router.push("/dashboard/reports");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch visitor details");
        }

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching visitor details:", error);
        toast.error("Failed to load visitor details");
      } finally {
        setLoading(false);
      }
    };

    fetchVisitorDetails();
  }, [resolvedParams.id, router]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleViewVisitDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setIsVisitDetailsOpen(true);
  };

  const handleDownloadVisits = async (format: "csv" | "pdf") => {
    if (!data) return;

    try {
      setIsDownloading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const queryParams = new URLSearchParams({
        format,
        visitor_id: resolvedParams.id,
      });

      const response = await fetch(
        `/api/reports/visitor-download?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // If API endpoint doesn't exist, fall back to client-side CSV generation
        if (format === "csv") {
          await handleClientSideCSVDownload();
          return;
        }
        throw new Error("Failed to download report");
      }

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `${data.visitor.name}_visits_${
            new Date().toISOString().split("T")[0]
          }.${format}`;

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
        `Visit data downloaded successfully as ${format.toUpperCase()}`
      );
    } catch (error) {
      console.error("Error downloading visits:", error);
      toast.error("Failed to download visit data");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClientSideCSVDownload = async () => {
    if (!data) return;

    // Prepare CSV data
    const csvHeaders = [
      "Visit ID",
      "Digital Card No",
      "Reason",
      "Office",
      "Sign In Time",
      "Sign Out Time",
      "Duration (minutes)",
      "Status",
      "Branch",
      "Registered By",
      "Has Laptop",
      "Laptop Brand",
      "Laptop Model",
      "Company",
      "Person In Charge",
      "Visitee Name",
      "Other Items",
    ];

    const csvRows = data.visits.map((visit) => [
      visit.id,
      visit.digital_card_no || "",
      visit.reason,
      visit.office,
      formatDateTime(visit.sign_in_time),
      visit.sign_out_time ? formatDateTime(visit.sign_out_time) : "",
      visit.duration_minutes || "",
      visit.status,
      visit.branch_name,
      visit.registered_by_name,
      visit.has_laptop ? "Yes" : "No",
      visit.laptop_brand || "",
      visit.laptop_model || "",
      visit.company || "",
      visit.person_in_charge || "",
      visit.visitee_name || "",
      visit.other_items ? visit.other_items.join(", ") : "",
    ]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) =>
        row
          .map((field) => {
            // Escape fields that contain commas or quotes
            const stringField = String(field || "");
            if (
              stringField.includes(",") ||
              stringField.includes('"') ||
              stringField.includes("\n")
            ) {
              return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
          })
          .join(",")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${data.visitor.name}_visits_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Visit data downloaded successfully!");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Error</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">Visitor not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{data.visitor.name}</h1>
            <p className="text-muted-foreground">
              {data.visitor.residence && (
                <>
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {data.visitor.residence} •{" "}
                </>
              )}
              Member since {formatDate(data.visitor.created_at)} • Last updated{" "}
              {formatDate(data.visitor.updated_at)}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isDownloading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isDownloading ? "Downloading..." : "Download Visits"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownloadVisits("csv")}>
              <FileText className="h-4 w-4 mr-2" />
              Download as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownloadVisits("pdf")}>
              <FileText className="h-4 w-4 mr-2" />
              Download as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-blue-700">
                  Total Visits
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {data.statistics.total_visits}
                </p>
              </div>
              <div className="p-3 bg-blue-600 rounded-xl">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-green-700">
                  Completed Visits
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {data.statistics.completed_visits}
                </p>
              </div>
              <div className="p-3 bg-green-600 rounded-xl">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-orange-700">
                  Active Visits
                </p>
                <p className="text-3xl font-bold text-orange-900">
                  {data.statistics.active_visits}
                </p>
              </div>
              <div className="p-3 bg-orange-600 rounded-xl">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-purple-700">
                  Avg Duration
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {formatDuration(data.statistics.avg_duration_minutes)}
                </p>
              </div>
              <div className="p-3 bg-purple-600 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>Visit History</CardTitle>
          <CardDescription>
            Complete history of all visits by {data.visitor.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.visits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No visits found for this visitor.
            </div>
          ) : (
            <div className="space-y-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead>Visit Details</TableHead>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Purpose & Office</TableHead>
                    <TableHead>Vendor Info</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.visits.map((visit) => (
                    <TableRow key={visit.id} className="border-b">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {/* <Avatar className="h-10 w-10">
                            {visit.photo ? (
                              <AvatarImage
                                src={`data:image/jpeg;base64,${visit.photo}`}
                                alt="Visit photo"
                              />
                            ) : null}
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar> */}
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {formatDateTime(visit.sign_in_time)}
                            </div>
                            {visit.sign_out_time && (
                              <div className="text-sm text-muted-foreground">
                                Out: {formatDateTime(visit.sign_out_time)}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Registered by: {visit.registered_by_name}
                            </div>
                            {visit.sign_out_time && visit.signedout_by_name && (
                              <div className="text-xs text-muted-foreground">
                                Signed out by: {visit.signedout_by_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {visit.digital_card_no ? (
                          <Badge variant="outline" className="font-mono">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {visit.digital_card_no}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{visit.reason}</div>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{visit.office}</span>
                          </div>
                          {visit.has_laptop && (
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Laptop className="h-3 w-3" />
                              <span>
                                {visit.laptop_brand} {visit.laptop_model}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {visit.company ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Building2 className="h-3 w-3 text-green-600" />
                              <span className="font-medium text-sm">
                                {visit.company}
                              </span>
                            </div>
                            {visit.person_in_charge && (
                              <p className="text-xs text-gray-500">
                                Contact: {visit.person_in_charge}
                              </p>
                            )}
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 text-xs"
                            >
                              Vendor
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">
                            Regular Visit
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {formatDuration(visit.duration_minutes)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            visit.status === "completed"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {visit.status === "completed"
                            ? "Completed"
                            : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{visit.branch_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewVisitDetails(visit)}
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Details Dialog */}
      <Dialog open={isVisitDetailsOpen} onOpenChange={setIsVisitDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Visit Details
            </DialogTitle>
          </DialogHeader>

          {selectedVisit && (
            <div className="space-y-6">
              {/* Visit Information */}
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
                        {formatDateTime(selectedVisit.sign_in_time)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Sign Out Time
                      </Label>
                      <div className="text-base mt-1">
                        {selectedVisit.sign_out_time ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDateTime(selectedVisit.sign_out_time)}
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
                        {formatDuration(selectedVisit.duration_minutes)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Status
                      </Label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            selectedVisit.status === "completed"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {selectedVisit.status === "completed"
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
                        {selectedVisit.office}
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
                          {selectedVisit.reason}
                        </Badge>
                      </div>
                    </div>
                    {selectedVisit.visitee_name && (
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Visiting
                        </Label>
                        <div className="text-base flex items-center mt-1">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {selectedVisit.visitee_name}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Branch
                      </Label>
                      <div className="mt-1">
                        <Badge variant="outline">
                          {selectedVisit.branch_name}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium text-base">
                        Registered By
                      </Label>
                      <div className="text-base mt-1">
                        {selectedVisit.registered_by_name}
                      </div>
                    </div>
                    {selectedVisit.digital_card_no && (
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Digital Card
                        </Label>
                        <div className="mt-1">
                          <Badge variant="outline" className="font-mono">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {selectedVisit.digital_card_no}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {data.visitor.residence && (
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Place of Residence
                        </Label>
                        <div className="text-base flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {data.visitor.residence}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Equipment Information */}
              {selectedVisit.has_laptop && (
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
                          {selectedVisit.laptop_brand}
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-700 font-medium text-base">
                          Serial No.
                        </Label>
                        <div className="text-base mt-1">
                          {selectedVisit.laptop_model}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Other Items */}
              {selectedVisit.other_items &&
                selectedVisit.other_items.length > 0 && (
                  <Card className="modern-shadow border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <Package className="h-5 w-5 mr-2 text-blue-600" />
                        Other Items
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedVisit.other_items.map((item, index) => (
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

              {/* Items Clearance (Left With Items) */}
              {selectedVisit.sign_out_time &&
                selectedVisit.leftwithdevice && (
                  <Card className="modern-shadow border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center text-xl">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                        Items Clearance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Items the visitor left with upon sign-out:
                      </p>
                      <div className="space-y-3">
                        {(() => {
                          try {
                            const leftWithItems = JSON.parse(
                              selectedVisit.leftwithdevice
                            );
                            return Object.entries(leftWithItems).map(
                              ([item, leftWith]) => (
                                <div
                                  key={item}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Package className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium text-gray-900">
                                      {item.replace(/^laptop_/, "").replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={
                                      leftWith === true
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      leftWith === true
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }
                                  >
                                    {leftWith === true ? "Yes" : "No"}
                                  </Badge>
                                </div>
                              )
                            );
                          } catch (e) {
                            return (
                              <p className="text-sm text-gray-500">
                                Unable to parse clearance data
                              </p>
                            );
                          }
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Vendor Information */}
              {selectedVisit.company && (
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
                          {selectedVisit.company}
                        </div>
                      </div>
                      {selectedVisit.person_in_charge && (
                        <div>
                          <Label className="text-gray-700 font-medium text-base">
                            Contact Person
                          </Label>
                          <div className="text-base mt-1">
                            {selectedVisit.person_in_charge}
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
                  {(selectedVisit?.photo === "exists" ||
                    selectedVisit?.photo) && (
                    <PhotoIndicator
                      visitorId={selectedVisit.id}
                      photoType="photo"
                      label="Visitor Photo"
                    />
                  )}
                  {(selectedVisit?.id_photo_front === "exists" ||
                    selectedVisit?.id_photo_front) && (
                    <PhotoIndicator
                      visitorId={selectedVisit.id}
                      photoType="id_front"
                      label="ID Photo (Front)"
                    />
                  )}
                  {(selectedVisit?.id_photo_back === "exists" ||
                    selectedVisit?.id_photo_back) && (
                    <PhotoIndicator
                      visitorId={selectedVisit.id}
                      photoType="id_back"
                      label="ID Photo (Back)"
                    />
                  )}
                  {(selectedVisit?.signature === "exists" ||
                    selectedVisit?.signature) && (
                    <PhotoIndicator
                      visitorId={selectedVisit.id}
                      photoType="signature"
                      label="Signature"
                    />
                  )}
                  {!selectedVisit?.photo &&
                    !selectedVisit?.id_photo_front &&
                    !selectedVisit?.id_photo_back &&
                    !selectedVisit?.signature && (
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
                  onClick={() => setIsVisitDetailsOpen(false)}
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
