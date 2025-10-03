"use client";

import { CardDescription } from "@/components/ui/card";

import React, { useState, useEffect, useRef } from "react";
import { useTodaysVisitors } from "@/hooks/use-todays-visitors";
import { useVisitorsByDate } from "@/hooks/use-visitors-by-date";
import { PhotoIndicator } from "@/components/photo-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Camera,
  Upload,
  Clock,
  User,
  Building2,
  Laptop,
  CheckCircle,
  Users,
  LogOut,
  Filter,
  Search,
  Eye,
  AlertCircle,
  ArrowLeft,
  Package,
  Plus,
  X,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { removeAuthToken } from "@/lib/client-auth";
import toast from "react-hot-toast";
import { VisitorPhoto } from "@/components/visitor-photo";
import { VisitorSearch } from "@/components/visitor-search";
import Image from "next/image";
import { AuthGuard } from "@/components/auth-guard";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/client-auth";
import { compressVisitorPhoto, compressIdPhoto } from "@/lib/image-compression";

interface OfficeVisit {
  office: string;
  reason: string;
  visitee_name: string;
}

interface Branch {
  id: number;
  name: string;
  offices: string[];
  reasons: string[];
}

interface Visitor {
  id: number;
  digital_card_no: string;
  name: string;
  phone_number: string;
  reason: string;
  office: string;
  sign_in_time: string;
  sign_out_time?: string;
  has_laptop: boolean;
  laptop_brand?: string;
  laptop_model?: string;
  photo?: string;
  branch_name: string;
  registered_by_name: string;
  total_visits?: number;
  other_items?: string[];
  visitee_name?: string;
  id_photo_front?: string;
  id_photo_back?: string;
  company?: string;
  person_in_charge?: string;
}

interface ExistingVisitor {
  id: number;
  name: string;
  phone_number: string;
  visits: number;
  last_visit: string;
  last_visit_details: {
    reason: string;
    office: string;
    has_laptop: boolean;
    laptop_brand?: string;
    laptop_model?: string;
    is_vendor: boolean;
    company?: string;
    person_in_charge?: string;
    category?: string;
  } | null;
}

interface GroupedVisitor {
  visitor_id: number;
  name: string;
  phone_number: string;
  photo?: string;
  id_photo_front?: string;
  id_photo_back?: string;
  branch_name: string;
  registered_by_name: string;
  total_visits?: number;
  has_active_visits: boolean;
  visits: VisitDetails[];
}

interface VisitDetails {
  id: number;
  category: string;
  digital_card_no: string;
  reason: string;
  office: string;
  sign_in_time: string;
  sign_out_time?: string;
  has_laptop: boolean;
  laptop_brand?: string;
  laptop_model?: string;
  visitee_name?: string;
  company?: string;
  person_in_charge?: string;
  other_items?: string[];
}

export default function DashboardRegister() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("register");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [registrationStep, setRegistrationStep] = useState<
    "visitor-type" | "form"
  >("visitor-type");
  const [isNewVisitor, setIsNewVisitor] = useState(true);
  const [selectedVisitor, setSelectedVisitor] =
    useState<ExistingVisitor | null>(null);
  const [selectedVisitorDetails, setSelectedVisitorDetails] =
    useState<Visitor | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone_number: "", // Added phone_number field
    branch_id: "",
    has_laptop: false,
    laptop_brand: "",
    laptop_model: "",
    digital_card_no: "",
    is_vendor: false,
    company: "",
    person_in_charge: "",
    other_items: [] as string[],
    category: "Normal",
  });

  const [officeVisits, setOfficeVisits] = useState<OfficeVisit[]>([
    { office: "", reason: "", visitee_name: "" },
  ]);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [idPhotoFront, setIdPhotoFront] = useState<string | null>(null);
  const [idPhotoBack, setIdPhotoBack] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signInTime, setSignInTime] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [digitalCardNo, setDigitalCardNo] = useState<string>("");
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [otherItemsInput, setOtherItemsInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isDateFilterActive, setIsDateFilterActive] = useState<boolean>(false);

  // Use the visitors hook for data fetching
  const {
    visitors: todayVisitors,
    loading: todayVisitorsLoading,
    error: todayVisitorsError,
    refresh: refreshTodayVisitors,
  } = useTodaysVisitors({
    statusFilter,
    allBranches: true, // Dashboard shows all branches
    refetchInterval: 60000, // Refresh every minute
    includeImages: false, // Don't include images for faster loading
  });

  const {
    visitors: dateVisitors,
    loading: dateVisitorsLoading,
    error: dateVisitorsError,
    refresh: refreshDateVisitors,
  } = useVisitorsByDate({
    statusFilter,
    allBranches: true,
    refetchInterval: 0, // No auto-refresh for date-based queries
    includeImages: false,
    date: selectedDate,
  });

  // Determine which visitors to use based on date filter
  const visitors = isDateFilterActive ? dateVisitors : todayVisitors;
  const visitorsLoading = isDateFilterActive
    ? dateVisitorsLoading
    : todayVisitorsLoading;
  const visitorsError = isDateFilterActive
    ? dateVisitorsError
    : todayVisitorsError;
  const refreshVisitors = isDateFilterActive
    ? refreshDateVisitors
    : refreshTodayVisitors;
  const [searchTerm, setSearchTerm] = useState("");

  const photoRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchBranches();
    // Visitors are automatically fetched by the hook
  }, [router]);

  const filteredVisitors = visitors.filter((visitor) => {
    const matchesSearch = visitor.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && visitor.has_active_visits) ||
      (statusFilter === "inactive" && !visitor.has_active_visits);
    return matchesSearch && matchesStatus;
  });

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const addOtherItem = () => {
    setFormData((prev) => ({
      ...prev,
      other_items: [...prev.other_items, ""],
    }));
  };

  const removeOtherItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      other_items: prev.other_items.filter((_, i) => i !== index),
    }));
  };

  const updateOtherItem = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      other_items: prev.other_items.map((item, i) =>
        i === index ? value : item
      ),
    }));
  };

  const handleLogout = async () => {
    try {
      await removeAuthToken();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error during logout");
    }
  };

  // Date filtering functions
  const handleYesterdayClick = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    setSelectedDate(yesterdayStr);
    setIsDateFilterActive(true);
  };

  const handleTodayClick = () => {
    setIsDateFilterActive(false);
    setSelectedDate("");
  };

  const handleDateChange = (date: string) => {
    if (date) {
      setSelectedDate(date);
      setIsDateFilterActive(true);
    } else {
      setIsDateFilterActive(false);
      setSelectedDate("");
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // fetchTodaysVisitors function removed - now handled by the caching hook

  const handleViewVisitDetails = (visit: VisitDetails) => {
    const visitor = visitors.find((v) =>
      v.visits.some((vst) => vst.id === visit.id)
    );
    if (visitor) {
      const visitorDetails: Visitor = {
        id: visitor.visitor_id,
        digital_card_no: visit.digital_card_no,
        name: visitor.name,
        phone_number: visitor.phone_number,
        reason: visit.reason,
        office: visit.office,
        sign_in_time: visit.sign_in_time,
        sign_out_time: visit.sign_out_time,
        has_laptop: visit.has_laptop,
        laptop_brand: visit.laptop_brand,
        laptop_model: visit.laptop_model,
        photo: visitor.photo,
        branch_name: visitor.branch_name,
        registered_by_name: visitor.registered_by_name,
        total_visits: visitor.total_visits,
        other_items: visit.other_items,
        visitee_name: visit.visitee_name,
        id_photo_front: visitor.id_photo_front,
        id_photo_back: visitor.id_photo_back,
        company: visit.company,
        person_in_charge: visit.person_in_charge,
      };
      setSelectedVisitorDetails(visitorDetails);
      setIsDetailsDialogOpen(true);
    }
  };

  const handleSignOutSingle = async (visitId: number) => {
    try {
      const response = await fetch(`/api/visitors/visit/${visitId}/signout`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        toast.success("Visitor signed out successfully");
        // Refresh data
        await refreshVisitors();
      } else {
        toast.error("Failed to sign out visitor");
        // Refresh anyway to get current state
        await refreshVisitors();
      }
    } catch (error) {
      console.error("Error signing out visitor:", error);
      toast.error("Error signing out visitor");
      // Refresh to get current state
      await refreshVisitors();
    }
  };

  const handleSignOut = async (visitorId: number) => {
    try {
      const response = await fetch(`/api/visitors/${visitorId}/signout-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        toast.success("All visits signed out successfully");
        // Refresh data
        await refreshVisitors();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to sign out all visits");
        // Refresh anyway to get current state
        await refreshVisitors();
      }
    } catch (error) {
      console.error("Error signing out all visits:", error);
      toast.error("Error signing out all visits");
      // Refresh to get current state
      await refreshVisitors();
    }
  };

  const fetchBranches = async () => {
    setBranchesLoading(true);
    try {
      const response = await fetch("/api/branches", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch branches:", response.statusText);
        setBranches([]);
        toast.error("Failed to load branches");
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      setBranches([]);
      toast.error("Failed to load branches");
    } finally {
      setBranchesLoading(false);
    }
  };

  const handleNewVisitor = () => {
    setIsNewVisitor(true);
    setSelectedVisitor(null);
    setRegistrationStep("form");
    setSelectedCategory("");
    setFormData({
      name: "",
      phone_number: "", // Added phone_number reset
      branch_id: "",
      has_laptop: false,
      laptop_brand: "",
      laptop_model: "",
      digital_card_no: "",
      is_vendor: false,
      company: "",
      person_in_charge: "",
      other_items: [] as string[],
      category: "Normal",
    });
    setOfficeVisits([{ office: "", reason: "", visitee_name: "" }]);
  };

  const handleVisitorSelect = (visitor: ExistingVisitor) => {
    setIsNewVisitor(false);
    setSelectedVisitor(visitor);
    setRegistrationStep("form");

    // Get category from last visit or default to Normal
    const lastVisitCategory = visitor.last_visit_details?.category || "Normal";

    // Set the selected category state
    setSelectedCategory(lastVisitCategory);

    setFormData({
      name: visitor.name,
      phone_number: visitor.phone_number, // Added phone_number from visitor
      branch_id: "",
      has_laptop: visitor.last_visit_details?.has_laptop || false,
      laptop_brand: visitor.last_visit_details?.laptop_brand || "",
      laptop_model: visitor.last_visit_details?.laptop_model || "",
      digital_card_no: "",
      is_vendor: lastVisitCategory === "Vendor", // Set based on category
      company: visitor.last_visit_details?.company || "",
      person_in_charge: visitor.last_visit_details?.person_in_charge || "",
      other_items: [] as string[],
      category: lastVisitCategory,
    });

    setOfficeVisits([
      {
        office: visitor.last_visit_details?.office || "",
        reason: visitor.last_visit_details?.reason || "",
        visitee_name: "",
      },
    ]);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setFormData((prev) => ({
      ...prev,
      category,
      is_vendor: category === "Vendor", // Automatically set is_vendor based on category
    }));
  };

  const handleBackToVisitorType = () => {
    setRegistrationStep("visitor-type");
    setSelectedVisitor(null);
    setIsNewVisitor(true);
  };

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find((b) => b.id.toString() === branchId);
    setSelectedBranch(branch || null);
    setFormData((prev) => ({ ...prev, branch_id: branchId }));
    setOfficeVisits([{ office: "", reason: "", visitee_name: "" }]);
  };

  const handleImageCapture = async (
    file: File,
    setter: (value: string) => void,
    isIdPhoto: boolean = false
  ) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Optimizing image...");

      // Compress the image based on type
      const compressedBase64 = isIdPhoto
        ? await compressIdPhoto(file)
        : await compressVisitorPhoto(file);

      setter(compressedBase64);

      // Show success toast
      toast.dismiss(loadingToast);
      toast.success("Image optimized successfully");
    } catch (error) {
      console.error("Error handling image:", error);
      toast.error("Failed to process image");
    }
  };

  const recordSignIn = () => {
    const now = new Date().toLocaleString();
    setSignInTime(now);
    toast.success("Sign-in time recorded!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signInTime) {
      toast.error("Please record sign-in time first");
      return;
    }

    if (!formData.branch_id) {
      toast.error("Please select a branch");
      return;
    }

    const validVisits = officeVisits.filter(
      (visit) => visit.office && visit.reason
    );
    if (validVisits.length === 0) {
      toast.error(
        "Please add at least one office visit with office and reason"
      );
      return;
    }

    setIsLoading(true);

    try {
      const submitData = {
        ...formData,
        is_vendor: selectedCategory === "Vendor", // Automatically set based on category
        office_visits: validVisits,
        photo,
        id_photo_front: idPhotoFront,
        id_photo_back: idPhotoBack,
        sign_in_time: new Date().toISOString(),
        visitor_id: selectedVisitor?.id,
        is_new_visitor: isNewVisitor,
      };

      const response = await fetch("/api/visitors/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        setDigitalCardNo(data.digital_card_no);
        setIsSubmitted(true);
        toast.success(`Visitor registered successfully!`);
      } else {
        console.error("Registration failed:", data);
        toast.error(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone_number: "", // Added phone_number reset
      branch_id: "",
      has_laptop: false,
      laptop_brand: "",
      laptop_model: "",
      digital_card_no: "",
      is_vendor: false,
      company: "",
      person_in_charge: "",
      other_items: [] as string[],
      category: "Normal",
    });
    setOfficeVisits([{ office: "", reason: "", visitee_name: "" }]);
    setPhoto(null);
    setIdPhotoFront(null);
    setIdPhotoBack(null);
    setSignInTime(null);
    setSelectedBranch(null);
    setIsSubmitted(false);
    setDigitalCardNo("");
    setRegistrationStep("visitor-type");
    setSelectedVisitor(null);
    setIsNewVisitor(true);
  };

  const addOfficeVisit = () => {
    setOfficeVisits([
      ...officeVisits,
      { office: "", reason: "", visitee_name: "" },
    ]);
  };

  const removeOfficeVisit = (index: number) => {
    if (officeVisits.length > 1) {
      setOfficeVisits(officeVisits.filter((_, i) => i !== index));
    }
  };

  const updateOfficeVisit = (
    index: number,
    field: keyof OfficeVisit,
    value: string
  ) => {
    const updated = officeVisits.map((visit, i) =>
      i === index ? { ...visit, [field]: value } : visit
    );
    setOfficeVisits(updated);
  };

  const handleAddItem = () => {
    if (otherItemsInput.trim() !== "") {
      setFormData((prev) => ({
        ...prev,
        other_items: [...prev.other_items, otherItemsInput.trim()],
      }));
      setOtherItemsInput("");
    }
  };

  const handleRemoveItem = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      other_items: prev.other_items.filter((i) => i !== item),
    }));
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md modern-shadow border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Registration Successful!
            </h2>
            <p className="text-gray-600 mb-6 text-base">
              {isNewVisitor ? "New visitor" : "Returning visitor"} has been
              registered successfully
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <p className="text-gray-600 mb-2 text-base">
                Digital Card Number
              </p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {digitalCardNo}
              </p>
              {selectedVisitor && (
                <p className="text-sm text-gray-500 mt-2">
                  Visit #{selectedVisitor.visits + 1} for {selectedVisitor.name}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={resetForm}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base"
              >
                Register Another Visitor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Dashboard - Register Visitor
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Register visitors from any branch and manage all visitor entries
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-gray-100 rounded-xl p-1">
            <TabsTrigger
              value="register"
              className="text-base font-medium"
              disabled={branchesLoading || branches.length === 0}
            >
              Register Visitor
            </TabsTrigger>
            <TabsTrigger value="visitors" className="text-base font-medium">
              Today's Visitors (All Branches)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            {!branchesLoading && branches.length === 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-yellow-800">
                        No Branches Available
                      </h3>
                      <p className="text-yellow-700 mt-1">
                        No branches have been configured yet. Please set up
                        branches before registering visitors.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {branches.length === 0 ? (
              <Card className="modern-shadow border-0">
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No Branches Available
                  </h3>
                  <p className="text-gray-600 text-base">
                    Please set up branches before registering visitors.
                  </p>
                </CardContent>
              </Card>
            ) : registrationStep === "visitor-type" ? (
              <Card className="modern-shadow border-0 max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <VisitorSearch
                    onVisitorSelect={handleVisitorSelect}
                    onNewVisitor={handleNewVisitor}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                <Card className="modern-shadow border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <Button
                        onClick={handleBackToVisitorType}
                        variant="outline"
                        className="text-base bg-transparent"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Visitor Selection
                      </Button>
                      <div className="text-right">
                        {isNewVisitor ? (
                          <Badge className="bg-green-100 text-green-700 text-base px-3 py-1">
                            New Visitor
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge className="bg-blue-100 text-blue-700 text-base px-3 py-1">
                              Returning Visitor
                            </Badge>
                            {selectedVisitor && (
                              <p className="text-sm text-gray-600">
                                {selectedVisitor.visits} previous visits
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <Card className="modern-shadow border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <User className="h-5 w-5 mr-2 text-blue-600" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label
                              htmlFor="name"
                              className="text-gray-700 font-medium text-base"
                            >
                              Full Name *
                            </Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="mt-1 h-12 text-base"
                              placeholder="Enter visitor's full name"
                              required
                              disabled={!isNewVisitor}
                            />
                            {!isNewVisitor && (
                              <p className="text-sm text-gray-500 mt-1">
                                Name cannot be changed for returning visitors
                              </p>
                            )}
                          </div>

                          <div>
                            <Label
                              htmlFor="digital_card_no"
                              className="text-gray-700 font-medium text-base"
                            >
                              Digital Card Number
                            </Label>
                            <Input
                              id="digital_card_no"
                              value={formData.digital_card_no}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  digital_card_no: e.target.value,
                                }))
                              }
                              className="mt-1 h-12 text-base"
                              placeholder="Enter card number (optional - auto-generated if empty)"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              Leave empty to auto-generate a card number
                            </p>
                          </div>

                          <div>
                            <Label
                              htmlFor="branch"
                              className="text-gray-700 font-medium text-base"
                            >
                              Branch *
                            </Label>
                            <Select
                              value={formData.branch_id}
                              onValueChange={handleBranchChange}
                              required
                            >
                              <SelectTrigger className="mt-1 h-12 text-base">
                                <SelectValue
                                  placeholder={
                                    branchesLoading
                                      ? "Loading branches..."
                                      : branches.length === 0
                                      ? "No branches available"
                                      : "Select branch"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {branches.map((branch) => (
                                  <SelectItem
                                    key={branch.id}
                                    value={branch.id.toString()}
                                  >
                                    <div className="flex items-center">
                                      <Building2 className="h-4 w-4 mr-2" />
                                      {branch.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label
                              htmlFor="phone_number"
                              className="text-gray-700 font-medium text-base"
                            >
                              Phone Number
                            </Label>
                            <Input
                              id="phone_number"
                              type="tel"
                              value={formData.phone_number}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  phone_number: e.target.value,
                                }))
                              }
                              className="mt-1 h-12 text-base"
                              placeholder="Enter visitor's phone number"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Visit Category Selection */}
                      <Card className="modern-shadow border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                            Visit Category
                          </CardTitle>
                          <CardDescription className="text-base">
                            Select the appropriate category for this visit
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Normal Category */}
                            <Card
                              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                                selectedCategory === "Normal"
                                  ? "ring-2 ring-blue-500 bg-blue-50"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => handleCategorySelect("Normal")}
                            >
                              <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <User className="h-6 w-6 text-blue-600" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">
                                  Normal
                                </h3>
                                <p className="text-gray-600 text-xs">
                                  Regular visitor
                                </p>
                              </CardContent>
                            </Card>

                            {/* Vendor Category */}
                            <Card
                              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                                selectedCategory === "Vendor"
                                  ? "ring-2 ring-green-500 bg-green-50"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => handleCategorySelect("Vendor")}
                            >
                              <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Package className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">
                                  Vendor
                                </h3>
                                <p className="text-gray-600 text-xs">
                                  External supplier
                                </p>
                              </CardContent>
                            </Card>

                            {/* Employee Category */}
                            <Card
                              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                                selectedCategory === "Employee"
                                  ? "ring-2 ring-purple-500 bg-purple-50"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => handleCategorySelect("Employee")}
                            >
                              <CardContent className="p-4 text-center">
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <Building2 className="h-6 w-6 text-purple-600" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">
                                  Employee
                                </h3>
                                <p className="text-gray-600 text-xs">
                                  Internal staff
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="modern-shadow border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <Laptop className="h-5 w-5 mr-2 text-blue-600" />
                            Equipment Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="has_laptop"
                              checked={formData.has_laptop}
                              onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  has_laptop: checked as boolean,
                                }))
                              }
                            />
                            <Label
                              htmlFor="has_laptop"
                              className="text-gray-700 font-medium text-base"
                            >
                              Carrying a laptop or electronic device
                            </Label>
                          </div>

                          {formData.has_laptop && (
                            <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-blue-50 rounded-lg">
                              <div>
                                <Label
                                  htmlFor="laptop_brand"
                                  className="text-gray-700 font-medium text-base"
                                >
                                  Brand *
                                </Label>
                                <Input
                                  id="laptop_brand"
                                  value={formData.laptop_brand}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      laptop_brand: e.target.value,
                                    }))
                                  }
                                  className="mt-1 h-10 text-base"
                                  placeholder="e.g., Apple, Dell"
                                  required={formData.has_laptop}
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="laptop_model"
                                  className="text-gray-700 font-medium text-base"
                                >
                                  Model *
                                </Label>
                                <Input
                                  id="laptop_model"
                                  value={formData.laptop_model}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      laptop_model: e.target.value,
                                    }))
                                  }
                                  className="mt-1 h-10 text-base"
                                  placeholder="e.g., MacBook Pro"
                                  required={formData.has_laptop}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="modern-shadow border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                            Vendor Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="is_vendor"
                              checked={formData.is_vendor}
                              onCheckedChange={(checked) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  is_vendor: checked as boolean,
                                }))
                              }
                            />
                            <Label
                              htmlFor="is_vendor"
                              className="text-gray-700 font-medium text-base"
                            >
                              This is a vendor visit
                            </Label>
                          </div>

                          {formData.is_vendor && (
                            <div className="grid grid-cols-1 gap-4 mt-4 p-4 bg-green-50 rounded-lg">
                              <div>
                                <Label
                                  htmlFor="company"
                                  className="text-gray-700 font-medium text-base"
                                >
                                  Company Name *
                                </Label>
                                <Input
                                  id="company"
                                  value={formData.company}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      company: e.target.value,
                                    }))
                                  }
                                  className="mt-1 h-10 text-base"
                                  placeholder="e.g., ABC Technologies"
                                  required={formData.is_vendor}
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="person_in_charge"
                                  className="text-gray-700 font-medium text-base"
                                >
                                  Person in Charge *
                                </Label>
                                <Input
                                  id="person_in_charge"
                                  value={formData.person_in_charge}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      person_in_charge: e.target.value,
                                    }))
                                  }
                                  className="mt-1 h-10 text-base"
                                  placeholder="e.g., John Smith"
                                  required={formData.is_vendor}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="modern-shadow border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <Package className="h-5 w-5 mr-2 text-blue-600" />
                            Other Items
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex">
                            <Input
                              type="text"
                              placeholder="Enter item"
                              value={otherItemsInput}
                              onChange={(e) =>
                                setOtherItemsInput(e.target.value)
                              }
                              className="h-12 text-base"
                            />
                            <Button
                              type="button"
                              onClick={handleAddItem}
                              className="ml-2 h-12"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {formData.other_items.length > 0 && (
                            <div className="mt-4">
                              {formData.other_items.map((item) => (
                                <Badge
                                  key={item}
                                  className="mr-2 mb-2 bg-gray-100 text-gray-800 rounded-full px-3 py-1 flex items-center"
                                >
                                  {item}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(item)}
                                    className="ml-2"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-6">
                      {selectedBranch && (
                        <Card className="modern-shadow border-0">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between text-xl">
                              <div className="flex items-center">
                                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                                Office Visits
                              </div>
                              <Button
                                type="button"
                                onClick={addOfficeVisit}
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-600 hover:bg-blue-50 bg-transparent"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Office
                              </Button>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {officeVisits.map((visit, index) => (
                              <div
                                key={index}
                                className="p-4 border rounded-lg bg-gray-50 space-y-4"
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">
                                    Office Visit {index + 1}
                                  </h4>
                                  {officeVisits.length > 1 && (
                                    <Button
                                      type="button"
                                      onClick={() => removeOfficeVisit(index)}
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>

                                <div>
                                  <Label className="text-gray-700 font-medium text-base">
                                    Office Visited *
                                  </Label>
                                  <Select
                                    value={visit.office}
                                    onValueChange={(value) =>
                                      updateOfficeVisit(index, "office", value)
                                    }
                                    required
                                  >
                                    <SelectTrigger className="mt-1 h-12 text-base">
                                      <SelectValue placeholder="Select office" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectedBranch &&
                                        Array.isArray(selectedBranch.offices) &&
                                        selectedBranch.offices.map((office) => (
                                          <SelectItem
                                            key={office}
                                            value={office}
                                          >
                                            {office}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-gray-700 font-medium text-base">
                                    Reason for Visit *
                                  </Label>
                                  <Select
                                    value={visit.reason}
                                    onValueChange={(value) =>
                                      updateOfficeVisit(index, "reason", value)
                                    }
                                    required
                                  >
                                    <SelectTrigger className="mt-1 h-12 text-base">
                                      <SelectValue placeholder="Select reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectedBranch &&
                                        Array.isArray(selectedBranch.reasons) &&
                                        selectedBranch.reasons.map((reason) => (
                                          <SelectItem
                                            key={reason}
                                            value={reason}
                                          >
                                            {reason}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-gray-700 font-medium text-base">
                                    Person to Visit (Optional)
                                  </Label>
                                  <Input
                                    value={visit.visitee_name}
                                    onChange={(e) =>
                                      updateOfficeVisit(
                                        index,
                                        "visitee_name",
                                        e.target.value
                                      )
                                    }
                                    className="mt-1 h-12 text-base"
                                    placeholder="Enter name of person being visited"
                                  />
                                  <p className="text-sm text-gray-500 mt-1">
                                    Optional - Leave empty if not visiting a
                                    specific person
                                  </p>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      <Card className="modern-shadow border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <Camera className="h-5 w-5 mr-2 text-blue-600" />
                            Photo Capture (Optional)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <Label className="text-gray-700 font-medium text-base">
                              Visitor Photo
                            </Label>
                            <div className="mt-2 space-y-3">
                              <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                ref={photoRef}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file)
                                    handleImageCapture(file, setPhoto, false);
                                }}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => photoRef.current?.click()}
                                className="w-full h-12 border-dashed border-2 hover:bg-blue-50 text-base"
                              >
                                <Camera className="h-5 w-5 mr-2" />
                                Capture Visitor Photo
                              </Button>
                              {photo && (
                                <div className="flex justify-center">
                                  <img
                                    src={photo || "/placeholder.svg"}
                                    alt="Visitor"
                                    className="w-32 h-32 object-cover rounded-xl border-4 border-white shadow-lg"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-gray-700 font-medium text-base">
                                ID Front
                              </Label>
                              <div className="mt-2 space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={idFrontRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleImageCapture(
                                        file,
                                        setIdPhotoFront,
                                        true
                                      );
                                  }}
                                  className="hidden"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => idFrontRef.current?.click()}
                                  className="w-full h-10 text-sm border-dashed"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                                {idPhotoFront && (
                                  <img
                                    src={idPhotoFront || "/placeholder.svg"}
                                    alt="ID Front"
                                    className="w-full h-20 object-cover rounded-lg"
                                  />
                                )}
                              </div>
                            </div>

                            <div>
                              <Label className="text-gray-700 font-medium text-base">
                                ID Back
                              </Label>
                              <div className="mt-2 space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={idBackRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleImageCapture(
                                        file,
                                        setIdPhotoBack,
                                        true
                                      );
                                  }}
                                  className="hidden"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => idBackRef.current?.click()}
                                  className="w-full h-10 text-sm border-dashed"
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Upload
                                </Button>
                                {idPhotoBack && (
                                  <img
                                    src={idPhotoBack || "/placeholder.svg"}
                                    alt="ID Back"
                                    className="w-full h-20 object-cover rounded-lg"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Card className="modern-shadow border-0">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                            <Clock className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              Sign-in Time
                            </h3>
                            {signInTime ? (
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-green-100 text-green-700 text-sm">
                                  Recorded
                                </Badge>
                                <span className="text-gray-600 text-base">
                                  {signInTime}
                                </span>
                              </div>
                            ) : (
                              <p className="text-gray-600 text-base">
                                Click to record the current time
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={recordSignIn}
                          className={`px-6 py-2 text-base ${
                            signInTime
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          }`}
                        >
                          {signInTime ? "Time Recorded" : "Record Sign-in"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center pb-8">
                    <Button
                      type="submit"
                      className="px-12 py-3 text-lg bg-[#2532a1] modern-shadow"
                      disabled={
                        isLoading || !signInTime || branches.length === 0
                      }
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Registering...</span>
                        </div>
                      ) : (
                        <>
                          <User className="h-5 w-5 mr-2" />
                          Register {isNewVisitor ? "New" : "Returning"} Visitor
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </TabsContent>

          <TabsContent value="visitors">
            <div className="space-y-6">
              {/* Filters */}
              <Card className="modern-shadow border-0">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          placeholder="Search visitors..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64 text-base"
                        />
                      </div>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="w-48 text-base">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Visitors</SelectItem>
                          <SelectItem value="active">
                            Active (Not signed out)
                          </SelectItem>
                          <SelectItem value="inactive">Signed Out</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={refreshVisitors}
                        variant="outline"
                        className="text-base bg-transparent"
                      >
                        Refresh
                      </Button>
                    </div>
                    <div className="text-base text-gray-600">
                      Showing {filteredVisitors.length} visitors{" "}
                      {isDateFilterActive
                        ? `for ${formatDisplayDate(selectedDate)}`
                        : "for today"}
                      <span className="text-gray-500"> • All Branches</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visitors Table */}
              <Card className="modern-shadow border-0">
                <CardHeader>
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">
                          {isDateFilterActive ? "Visitors" : "Today's Visitors"}{" "}
                          - All Branches
                        </CardTitle>
                        <CardDescription className="text-base">
                          {isDateFilterActive
                            ? formatDisplayDate(selectedDate)
                            : new Date().toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                          <span className="text-gray-500"> • All Branches</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={handleTodayClick}
                          variant={!isDateFilterActive ? "default" : "outline"}
                          size="sm"
                          className="text-sm"
                        >
                          Today
                        </Button>
                        <Button
                          onClick={handleYesterdayClick}
                          variant={
                            isDateFilterActive &&
                            selectedDate ===
                              new Date(Date.now() - 24 * 60 * 60 * 1000)
                                .toISOString()
                                .split("T")[0]
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="text-sm"
                        >
                          Yesterday
                        </Button>
                        <div className="relative">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            max={new Date().toISOString().split("T")[0]}
                          />
                          <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {visitorsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : filteredVisitors.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-900 mb-2">
                        No Visitors Found
                      </h3>
                      <p className="text-gray-600 text-base">
                        {visitors.length === 0
                          ? isDateFilterActive
                            ? `No visitors were registered on ${formatDisplayDate(
                                selectedDate
                              )}.`
                            : "No visitors have been registered today."
                          : "No visitors match your current filters."}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-base font-semibold">
                            Visitor
                          </TableHead>
                          <TableHead className="text-base font-semibold">
                            Card No.
                          </TableHead>
                          <TableHead className="text-base font-semibold">
                            Visit Details
                          </TableHead>
                          <TableHead className="text-base font-semibold">
                            Time
                          </TableHead>
                          <TableHead className="text-base font-semibold">
                            Status
                          </TableHead>
                          <TableHead className="text-base font-semibold">
                            Equipment
                          </TableHead>
                          <TableHead className="text-right text-base font-semibold">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVisitors.map((visitor) => (
                          <React.Fragment key={visitor.visitor_id}>
                            {visitor.visits.map((visit, visitIndex) => (
                              <TableRow
                                key={`${visitor.visitor_id}-${visit.id}`}
                                className={`visit-row hover:bg-muted/50 ${
                                  visitIndex === 0 ? "visitor-group-row" : ""
                                }`}
                              >
                                {visitIndex === 0 && (
                                  <TableCell
                                    rowSpan={visitor.visits.length}
                                    className="border-r border-border"
                                  >
                                    <div className="flex items-center space-x-3">
                                      {/* <VisitorPhoto
                                        photo={visitor.photo}
                                        name={visitor.name}
                                        className="h-12 w-12"
                                      /> */}
                                      <div>
                                        <p className="font-semibold text-foreground text-base">
                                          {visitor.name}
                                        </p>
                                        <div className="flex items-center space-x-2 mt-1">
                                          <p className="text-muted-foreground text-sm">
                                            {visitor.branch_name}
                                          </p>
                                          {visitor.total_visits &&
                                            visitor.total_visits > 1 && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs bg-secondary/20 text-secondary-foreground"
                                              >
                                                {visitor.total_visits} total
                                                visits
                                              </Badge>
                                            )}
                                          {visitor.visits.length > 1 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs border-accent text-accent"
                                            >
                                              {visitor.visits.length} offices
                                              today
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                )}

                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-sm bg-card"
                                  >
                                    {visit.digital_card_no}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  <div className="space-y-2">
                                    <p className="font-medium text-foreground">
                                      {visit.office}
                                    </p>
                                    <Badge
                                      variant="secondary"
                                      className="bg-accent/20 text-accent-foreground text-xs"
                                    >
                                      {visit.reason}
                                    </Badge>
                                    {visit.visitee_name && (
                                      <p className="text-xs text-muted-foreground flex items-center">
                                        <span className="mr-1">→</span>
                                        {visit.visitee_name}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      <Clock className="h-3 w-3 mr-1" />
                                      In: {formatTime(visit.sign_in_time)}
                                    </div>
                                    {visit.sign_out_time && (
                                      <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Out: {formatTime(visit.sign_out_time)}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <Badge
                                    variant={
                                      !visit.sign_out_time
                                        ? "secondary"
                                        : "default"
                                    }
                                    className={
                                      !visit.sign_out_time
                                        ? "bg-green-100 text-green-700 text-sm"
                                        : "bg-gray-100 text-gray-700 text-sm"
                                    }
                                  >
                                    {!visit.sign_out_time
                                      ? "Active"
                                      : "Signed Out"}
                                  </Badge>
                                </TableCell>

                                <TableCell>
                                  {visit.has_laptop ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center text-sm">
                                        <Laptop className="h-3 w-3 mr-1 text-primary" />
                                        <span className="font-medium">Yes</span>
                                      </div>
                                      {visit.laptop_brand && (
                                        <p className="text-xs text-muted-foreground">
                                          {visit.laptop_brand}{" "}
                                          {visit.laptop_model}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">
                                      No
                                    </span>
                                  )}
                                </TableCell>

                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                    <Button
                                      onClick={() =>
                                        handleViewVisitDetails(visit)
                                      }
                                      variant="outline"
                                      size="sm"
                                      className="text-primary hover:text-primary hover:bg-primary/10 text-sm border-primary/20"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Details
                                    </Button>

                                    {!visit.sign_out_time ? (
                                      <Button
                                        onClick={() =>
                                          handleSignOutSingle(visit.id)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-sm border-destructive/20"
                                      >
                                        <LogOut className="h-4 w-4 mr-1" />
                                        Sign Out
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground cursor-not-allowed text-sm"
                                        disabled
                                      >
                                        <LogOut className="h-4 w-4 mr-1" />
                                        Signed Out
                                      </Button>
                                    )}

                                    {visitIndex === 0 &&
                                      visitor.has_active_visits &&
                                      visitor.visits.length > 1 && (
                                        <Button
                                          onClick={() =>
                                            handleSignOut(visitor.visitor_id)
                                          }
                                          variant="default"
                                          size="sm"
                                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm ml-2"
                                        >
                                          <LogOut className="h-4 w-4 mr-1" />
                                          Sign Out All
                                        </Button>
                                      )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Visitor Details
              </DialogTitle>
            </DialogHeader>

            {selectedVisitorDetails && (
              <div className="space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <User className="h-5 w-5 mr-2 text-blue-600" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">
                          {selectedVisitorDetails.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="font-mono text-sm mt-1"
                        >
                          {selectedVisitorDetails.digital_card_no}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Phone Number
                        </Label>
                        <p className="text-base">
                          {selectedVisitorDetails.phone_number ||
                            "Not provided"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Branch
                        </Label>
                        <p className="text-base">
                          {selectedVisitorDetails.branch_name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Visit Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                      Visit Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Office
                      </Label>
                      <p className="text-base">
                        {selectedVisitorDetails.office}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Reason for Visit
                      </Label>
                      <p className="text-base">
                        {selectedVisitorDetails.reason}
                      </p>
                    </div>
                    {selectedVisitorDetails.visitee_name && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Person to Visit
                        </Label>
                        <p className="text-base">
                          {selectedVisitorDetails.visitee_name}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Sign-in Time
                      </Label>
                      <p className="text-base">
                        {formatTime(selectedVisitorDetails.sign_in_time)}
                      </p>
                    </div>
                    {selectedVisitorDetails.sign_out_time && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Sign-out Time
                        </Label>
                        <p className="text-base">
                          {formatTime(selectedVisitorDetails.sign_out_time)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Equipment Information */}
                {selectedVisitorDetails.has_laptop && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Laptop className="h-5 w-5 mr-2 text-blue-600" />
                        Equipment Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Brand
                        </Label>
                        <p className="text-base">
                          {selectedVisitorDetails.laptop_brand ||
                            "Not specified"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Model
                        </Label>
                        <p className="text-base">
                          {selectedVisitorDetails.laptop_model ||
                            "Not specified"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Other Items */}
                {selectedVisitorDetails.other_items &&
                  selectedVisitorDetails.other_items.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-lg">
                          <Package className="h-5 w-5 mr-2 text-blue-600" />
                          Other Items
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedVisitorDetails.other_items.map(
                            (item, index) => (
                              <Badge key={index} variant="secondary">
                                {item}
                              </Badge>
                            )
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
                    {selectedVisitorDetails.photo && (
                      <PhotoIndicator
                        visitorId={selectedVisitorDetails.id}
                        photoType="photo"
                        label="Visitor Photo"
                      />
                    )}

                    {selectedVisitorDetails.id_photo_front && (
                      <PhotoIndicator
                        visitorId={selectedVisitorDetails.id}
                        photoType="id_front"
                        label="ID Front"
                      />
                    )}

                    {selectedVisitorDetails.id_photo_back && (
                      <PhotoIndicator
                        visitorId={selectedVisitorDetails.id}
                        photoType="id_back"
                        label="ID Back"
                      />
                    )}

                    {/* Show message if no photos are available */}
                    {!selectedVisitorDetails.photo &&
                      !selectedVisitorDetails.id_photo_front &&
                      !selectedVisitorDetails.id_photo_back && (
                        <div className="text-center text-gray-500 py-4">
                          <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>No photos available for this visitor</p>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
