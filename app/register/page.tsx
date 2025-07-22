"use client"

import { CardDescription } from "@/components/ui/card"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
} from "lucide-react"
import toast from "react-hot-toast"
import { VisitorPhoto } from "@/components/visitor-photo"
import { VisitorSearch } from "@/components/visitor-search"
import Image from "next/image"

interface Branch {
  id: number
  name: string
  offices: string[]
  reasons: string[]
}

interface Visitor {
  id: number
  digital_card_no: string
  name: string
  phone_number: string
  reason: string
  office: string
  sign_in_time: string
  sign_out_time?: string
  has_laptop: boolean
  laptop_brand?: string
  laptop_model?: string
  photo?: string
  branch_name: string
  registered_by_name: string
  total_visits?: number
}

interface ExistingVisitor {
  id: number
  name: string
  phone_number: string
  visits: number
  last_visit: string
  last_visit_details: {
    reason: string
    office: string
    has_laptop: boolean
    laptop_brand?: string
    laptop_model?: string
  } | null
}

export default function VisitorRegistration() {
  const [activeTab, setActiveTab] = useState("register")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [registrationStep, setRegistrationStep] = useState<"visitor-type" | "form">("visitor-type")
  const [isNewVisitor, setIsNewVisitor] = useState(true)
  const [selectedVisitor, setSelectedVisitor] = useState<ExistingVisitor | null>(null)

  // Registration form state
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    reason: "",
    office: "",
    has_laptop: false,
    laptop_brand: "",
    laptop_model: "",
    digital_card_no: "", // Add digital card number field
  })

  const [userBranch, setUserBranch] = useState<Branch | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [idPhotoFront, setIdPhotoFront] = useState<string | null>(null)
  const [idPhotoBack, setIdPhotoBack] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [signInTime, setSignInTime] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [digitalCardNo, setDigitalCardNo] = useState<string>("")
  const [branchLoading, setBranchLoading] = useState(true)

  // Visitors list state
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [visitorsLoading, setVisitorsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const photoRef = useRef<HTMLInputElement>(null)
  const idFrontRef = useRef<HTMLInputElement>(null)
  const idBackRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Get current user info
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const user = JSON.parse(userStr)
      setCurrentUser(user)

      // Fetch user's branch info
      if (user.branch_id) {
        fetchUserBranch(user.branch_id)
      } else {
        setBranchLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab === "visitors") {
      fetchTodaysVisitors()
    }
  }, [activeTab, statusFilter])

  const fetchUserBranch = async (branchId: number) => {
    setBranchLoading(true)
    try {
      const response = await fetch("/api/branches")
      if (response.ok) {
        const branches = await response.json()
        const branch = branches.find((b: Branch) => b.id === branchId)
        if (branch) {
          setUserBranch(branch)
        }
      }
    } catch (error) {
      console.error("Error fetching user branch:", error)
      toast.error("Failed to load branch information")
    } finally {
      setBranchLoading(false)
    }
  }

  const fetchTodaysVisitors = async () => {
    setVisitorsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/visitors/today?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVisitors(Array.isArray(data) ? data : [])
      } else {
        toast.error("Failed to fetch visitors")
      }
    } catch (error) {
      console.error("Error fetching visitors:", error)
      toast.error("Failed to fetch visitors")
    } finally {
      setVisitorsLoading(false)
    }
  }

  const handleNewVisitor = () => {
    setIsNewVisitor(true)
    setSelectedVisitor(null)
    setRegistrationStep("form")
    setFormData({
      name: "",
      phone_number: "",
      reason: "",
      office: "",
      has_laptop: false,
      laptop_brand: "",
      laptop_model: "",
      digital_card_no: "",
    })
  }

  const handleVisitorSelect = (visitor: ExistingVisitor) => {
    setIsNewVisitor(false)
    setSelectedVisitor(visitor)
    setRegistrationStep("form")

    // Pre-populate form with visitor's last visit details
    setFormData({
      name: visitor.name,
      phone_number: visitor.phone_number,
      reason: visitor.last_visit_details?.reason || "",
      office: visitor.last_visit_details?.office || "",
      has_laptop: visitor.last_visit_details?.has_laptop || false,
      laptop_brand: visitor.last_visit_details?.laptop_brand || "",
      laptop_model: visitor.last_visit_details?.laptop_model || "",
      digital_card_no: "",
    })
  }

  const handleBackToVisitorType = () => {
    setRegistrationStep("visitor-type")
    setSelectedVisitor(null)
    setIsNewVisitor(true)
  }

  const handleImageCapture = (file: File, setter: (value: string) => void) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setter(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const recordSignIn = () => {
    const now = new Date().toLocaleString()
    setSignInTime(now)
    toast.success("Sign-in time recorded!")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!signInTime) {
      toast.error("Please record sign-in time first")
      return
    }

    if (!formData.office) {
      toast.error("Please select an office")
      return
    }

    if (!formData.reason) {
      toast.error("Please select a reason for visit")
      return
    }

    setIsLoading(true)

    try {
      const submitData = {
        ...formData,
        photo,
        id_photo_front: idPhotoFront,
        id_photo_back: idPhotoBack,
        sign_in_time: new Date().toISOString(),
        visitor_id: selectedVisitor?.id,
        is_new_visitor: isNewVisitor,
      }

      const response = await fetch("/api/visitors/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (response.ok) {
        setDigitalCardNo(data.digital_card_no)
        setIsSubmitted(true)
        toast.success(`Visitor registered successfully!`)
      } else {
        console.error("Registration failed:", data)
        toast.error(data.error || "Registration failed")
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast.error("An error occurred during registration")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async (visitId: number) => {
    try {
      const response = await fetch(`/api/visitors/${visitId}/signout`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        toast.success("Visitor signed out successfully")
        fetchTodaysVisitors()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to sign out visitor")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.href = "/login"
  }

  const resetForm = () => {
    setFormData({
      name: "",
      reason: "",
      phone_number: "",
      office: "",
      has_laptop: false,
      laptop_brand: "",
      laptop_model: "",
      digital_card_no: "",
    })
    setPhoto(null)
    setIdPhotoFront(null)
    setIdPhotoBack(null)
    setSignInTime(null)
    setIsSubmitted(false)
    setDigitalCardNo("")
    setRegistrationStep("visitor-type")
    setSelectedVisitor(null)
    setIsNewVisitor(true)
  }

  const filteredVisitors = visitors.filter(
    (visitor) =>
      visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.digital_card_no.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString()
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md modern-shadow border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600 mb-6 text-base">
              {isNewVisitor ? "New visitor" : "Returning visitor"} has been registered successfully
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <p className="text-gray-600 mb-2 text-base">Digital Card Number</p>
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
              <Button variant="outline" onClick={() => setActiveTab("visitors")} className="w-full text-base">
                View Today's Visitors
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#d6dbff] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {/* <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Visitor Management</h1>
            <p className="text-gray-600 text-lg">Welcome, {currentUser?.name}</p>
            {userBranch && <p className="text-gray-500 text-base">Branch: {userBranch.name}</p>}
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-base bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div> */}
        <div className="flex justify-between items-center bg-[#d6dbff] px-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center">
              <Image src="/logo1.png" alt="MarketPro Logo" width={200} height={200} className="object-contain" />
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="text-white bg-[#2532a1]">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Show warning if user has no branch */}
        {!branchLoading && !userBranch && (
          <Card className="border-yellow-200 bg-yellow-50 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-yellow-800">No Branch Assigned</h3>
                  <p className="text-yellow-700 mt-1">
                    You don't have a branch assigned to your account. Please contact your administrator.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
            <TabsTrigger value="register" className="text-base font-medium" disabled={!userBranch}>
              Register Visitor
            </TabsTrigger>
            <TabsTrigger value="visitors" className="text-base font-medium">
              Today's Visitors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            {!userBranch ? (
              <Card className="modern-shadow border-0">
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Branch Assigned</h3>
                  <p className="text-gray-600 text-base">
                    Please contact your administrator to assign a branch to your account.
                  </p>
                </CardContent>
              </Card>
            ) : registrationStep === "visitor-type" ? (
              <Card className="modern-shadow border-0 max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <VisitorSearch onVisitorSelect={handleVisitorSelect} onNewVisitor={handleNewVisitor} />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Back button and visitor info */}
                <Card className="modern-shadow border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <Button onClick={handleBackToVisitorType} variant="outline" className="text-base bg-transparent">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Visitor Selection
                      </Button>
                      <div className="text-right">
                        {isNewVisitor ? (
                          <Badge className="bg-green-100 text-green-700 text-base px-3 py-1">New Visitor</Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge className="bg-blue-100 text-blue-700 text-base px-3 py-1">Returning Visitor</Badge>
                            {selectedVisitor && (
                              <p className="text-sm text-gray-600">{selectedVisitor.visits} previous visits</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Basic Information */}
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
                            <Label htmlFor="name" className="text-gray-700 font-medium text-base">
                              Full Name *
                            </Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
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
                            <Label htmlFor="phone_number" className="text-gray-700 font-medium text-base">
                              Phone Number *
                            </Label>
                            <Input
                              id="phone_number"
                              value={formData.phone_number}
                              onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                              className="mt-1 h-12 text-base"
                              placeholder="Enter visitor's phone number"
                              required
                            />
                          </div>


                          <div>
                            <Label htmlFor="digital_card_no" className="text-gray-700 font-medium text-base">
                              Digital Card Number
                            </Label>
                            <Input
                              id="digital_card_no"
                              value={formData.digital_card_no}
                              onChange={(e) => setFormData((prev) => ({ ...prev, digital_card_no: e.target.value }))}
                              className="mt-1 h-12 text-base"
                              placeholder="Enter card number (optional - auto-generated if empty)"
                            />
                            <p className="text-sm text-gray-500 mt-1">Leave empty to auto-generate a card number</p>
                          </div>

                          <div>
                            <Label className="text-gray-700 font-medium text-base">Branch</Label>
                            <div className="mt-1 p-3 bg-gray-50 rounded-lg border">
                              <div className="flex items-center">
                                <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                                <span className="text-base text-gray-700">{userBranch.name}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Auto-assigned
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="office" className="text-gray-700 font-medium text-base">
                              Office to visit *
                            </Label>
                            <Select
                              value={formData.office}
                              onValueChange={(value) => setFormData((prev) => ({ ...prev, office: value }))}
                              required
                            >
                              <SelectTrigger className="mt-1 h-12 text-base">
                                <SelectValue placeholder="Select office" />
                              </SelectTrigger>
                              <SelectContent>
                                {userBranch &&
                                  Array.isArray(userBranch.offices) &&
                                  userBranch.offices.map((office) => (
                                    <SelectItem key={office} value={office}>
                                      {office}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="reason" className="text-gray-700 font-medium text-base">
                              Reason for Visit *
                            </Label>
                            <Select
                              value={formData.reason}
                              onValueChange={(value) => setFormData((prev) => ({ ...prev, reason: value }))}
                              required
                            >
                              <SelectTrigger className="mt-1 h-12 text-base">
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                              <SelectContent>
                                {userBranch &&
                                  Array.isArray(userBranch.reasons) &&
                                  userBranch.reasons.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                      {reason}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Laptop Information */}
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
                                setFormData((prev) => ({ ...prev, has_laptop: checked as boolean }))
                              }
                            />
                            <Label htmlFor="has_laptop" className="text-gray-700 font-medium text-base">
                              Carrying a laptop or electronic device
                            </Label>
                          </div>

                          {formData.has_laptop && (
                            <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-blue-50 rounded-lg">
                              <div>
                                <Label htmlFor="laptop_brand" className="text-gray-700 font-medium text-base">
                                  Brand *
                                </Label>
                                <Input
                                  id="laptop_brand"
                                  value={formData.laptop_brand}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, laptop_brand: e.target.value }))}
                                  className="mt-1 h-10 text-base"
                                  placeholder="e.g., Apple, Dell"
                                  required={formData.has_laptop}
                                />
                              </div>
                              <div>
                                <Label htmlFor="laptop_model" className="text-gray-700 font-medium text-base">
                                  Serial No. *
                                </Label>
                                <Input
                                  id="laptop_model"
                                  value={formData.laptop_model}
                                  onChange={(e) => setFormData((prev) => ({ ...prev, laptop_model: e.target.value }))}
                                  className="mt-1 h-10 text-base"
                                  placeholder="e.g., MacBook Pro"
                                  required={formData.has_laptop}
                                />
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right Column - Photo Capture */}
                    <div className="space-y-6">
                      <Card className="modern-shadow border-0">
                        <CardHeader>
                          <CardTitle className="flex items-center text-xl">
                            <Camera className="h-5 w-5 mr-2 text-blue-600" />
                            Photo Capture (Optional)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Visitor Photo */}
                          <div>
                            <Label className="text-gray-700 font-medium text-base">Visitor Photo</Label>
                            <div className="mt-2 space-y-3">
                              <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                ref={photoRef}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleImageCapture(file, setPhoto)
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

                          {/* ID Photos */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-gray-700 font-medium text-base">ID Front</Label>
                              <div className="mt-2 space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={idFrontRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleImageCapture(file, setIdPhotoFront)
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
                              <Label className="text-gray-700 font-medium text-base">ID Back</Label>
                              <div className="mt-2 space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={idBackRef}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleImageCapture(file, setIdPhotoBack)
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

                  {/* Sign-in Time Section */}
                  <Card className="modern-shadow border-0">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-[#2532a1] rounded-xl">
                            <Clock className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">Sign-in Time</h3>
                            {signInTime ? (
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-green-100 text-green-700 text-sm">Recorded</Badge>
                                <span className="text-gray-600 text-base">{signInTime}</span>
                              </div>
                            ) : (
                              <p className="text-gray-600 text-base">Click to record the current time</p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={recordSignIn}
                          className={`px-6 py-2 text-base ${signInTime ? "bg-green-600 hover:bg-green-700" : "bg-[#2532a1] text-white"}`}
                        >
                          {signInTime ? "Time Recorded" : "Record Sign-in"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <div className="flex justify-center pb-8">
                    <Button
                      type="submit"
                      className="px-12 py-3 text-lg bg-[#2532a1] text-white modern-shadow"
                      disabled={isLoading || !signInTime || !userBranch}
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
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48 text-base">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Visitors</SelectItem>
                          <SelectItem value="active">Active (Not signed out)</SelectItem>
                          <SelectItem value="inactive">Signed Out</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={fetchTodaysVisitors} variant="outline" className="text-base bg-transparent">
                        Refresh
                      </Button>
                    </div>
                    <div className="text-base text-gray-600">
                      Showing {filteredVisitors.length} visitors for today
                      {userBranch && <span className="text-gray-500"> • {userBranch.name}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visitors Table */}
              <Card className="modern-shadow border-0">
                <CardHeader>
                  <CardTitle className="text-2xl">Today's Visitors</CardTitle>
                  <CardDescription className="text-base">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {userBranch && <span className="text-gray-500"> • {userBranch.name}</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {visitorsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : filteredVisitors.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-900 mb-2">No Visitors Found</h3>
                      <p className="text-gray-600 text-base">
                        {visitors.length === 0
                          ? "No visitors have been registered today."
                          : "No visitors match your current filters."}
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-base font-semibold">Visitor</TableHead>
                          <TableHead className="text-base font-semibold">Card No.</TableHead>
                          <TableHead className="text-base font-semibold">Visit Details</TableHead>
                          <TableHead className="text-base font-semibold">Time</TableHead>
                          <TableHead className="text-base font-semibold">Status</TableHead>
                          <TableHead className="text-base font-semibold">Equipment</TableHead>
                          <TableHead className="text-right text-base font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVisitors.map((visitor) => (
                          <TableRow key={visitor.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <VisitorPhoto photo={visitor.photo} name={visitor.name} className="h-12 w-12" />
                                <div>
                                  <p className="font-medium text-gray-900 text-base">{visitor.name}</p>
                                  <div className="flex items-center space-x-2">
                                    <p className="text-gray-500 text-sm">{visitor.branch_name}</p>
                                    {visitor.total_visits && visitor.total_visits > 1 && (
                                      <Badge variant="secondary" className="text-xs">
                                        {visitor.total_visits} visits
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-sm">
                                {visitor.digital_card_no}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-base">{visitor.office}</p>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-sm">
                                  {visitor.reason}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  In: {formatTime(visitor.sign_in_time)}
                                </div>
                                {visitor.sign_out_time && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Out: {formatTime(visitor.sign_out_time)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={visitor.sign_out_time ? "default" : "secondary"}
                                className={
                                  visitor.sign_out_time
                                    ? "bg-gray-100 text-gray-700 text-sm"
                                    : "bg-green-100 text-green-700 text-sm"
                                }
                              >
                                {visitor.sign_out_time ? "Signed Out" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {visitor.has_laptop ? (
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm">
                                    <Laptop className="h-3 w-3 mr-1 text-blue-600" />
                                    <span className="font-medium">Yes</span>
                                  </div>
                                  {visitor.laptop_brand && (
                                    <p className="text-xs text-gray-500">
                                      {visitor.laptop_brand} {visitor.laptop_model}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">No</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!visitor.sign_out_time ? (
                                <Button
                                  onClick={() => handleSignOut(visitor.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
                                >
                                  <LogOut className="h-4 w-4 mr-1" />
                                  Sign Out
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-gray-400 cursor-not-allowed text-sm"
                                  disabled
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
