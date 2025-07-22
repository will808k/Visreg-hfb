"use client"

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
import { Camera, Upload, Clock, User, Building2, Laptop, CheckCircle, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"

interface Branch {
  id: number
  name: string
  offices: string[]
  reasons: string[]
}

export default function DashboardRegister() {
  const [formData, setFormData] = useState({
    name: "",
    reason: "",
    office: "",
    branch_id: "",
    has_laptop: false,
    laptop_brand: "",
    laptop_model: "",
  })

  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [idPhotoFront, setIdPhotoFront] = useState<string | null>(null)
  const [idPhotoBack, setIdPhotoBack] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [signInTime, setSignInTime] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [digitalCardNo, setDigitalCardNo] = useState<string>("")
  const [branchesLoading, setBranchesLoading] = useState(true)

  const photoRef = useRef<HTMLInputElement>(null)
  const idFrontRef = useRef<HTMLInputElement>(null)
  const idBackRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    setBranchesLoading(true)
    try {
      const response = await fetch("/api/branches")
      if (response.ok) {
        const data = await response.json()
        setBranches(Array.isArray(data) ? data : [])
      } else {
        console.error("Failed to fetch branches:", response.statusText)
        setBranches([])
        toast.error("Failed to load branches")
      }
    } catch (error) {
      console.error("Error fetching branches:", error)
      setBranches([])
      toast.error("Failed to load branches")
    } finally {
      setBranchesLoading(false)
    }
  }

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find((b) => b.id.toString() === branchId)
    setSelectedBranch(branch || null)
    setFormData((prev) => ({ ...prev, branch_id: branchId, reason: "", office: "" }))
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

    if (!formData.branch_id) {
      toast.error("Please select a branch")
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

  const resetForm = () => {
    setFormData({
      name: "",
      reason: "",
      office: "",
      branch_id: "",
      has_laptop: false,
      laptop_brand: "",
      laptop_model: "",
    })
    setPhoto(null)
    setIdPhotoFront(null)
    setIdPhotoBack(null)
    setSignInTime(null)
    setSelectedBranch(null)
    setIsSubmitted(false)
    setDigitalCardNo("")
  }

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md modern-shadow border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600 mb-6 text-base">Visitor has been registered successfully</p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <p className="text-gray-600 mb-2 text-base">Digital Card Number</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {digitalCardNo}
              </p>
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
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Register Visitor</h1>
        <p className="text-gray-600 mt-2 text-lg">Register a new visitor from the admin dashboard</p>
      </div>

      {/* Show warning if no branches exist */}
      {!branchesLoading && branches.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-yellow-800">No Branches Available</h3>
                <p className="text-yellow-700 mt-1">
                  No branches have been configured yet. Please set up branches before registering visitors.
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
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Branches Available</h3>
            <p className="text-gray-600 text-base">Please set up branches before registering visitors.</p>
          </CardContent>
        </Card>
      ) : (
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="branch" className="text-gray-700 font-medium text-base">
                      Branch *
                    </Label>
                    <Select value={formData.branch_id} onValueChange={handleBranchChange} required>
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
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 mr-2" />
                              {branch.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBranch && (
                    <>
                      <div>
                        <Label htmlFor="office" className="text-gray-700 font-medium text-base">
                          Office Visited *
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
                            {selectedBranch &&
                              Array.isArray(selectedBranch.offices) &&
                              selectedBranch.offices.map((office) => (
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
                            {selectedBranch &&
                              Array.isArray(selectedBranch.reasons) &&
                              selectedBranch.reasons.map((reason) => (
                                <SelectItem key={reason} value={reason}>
                                  {reason}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
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
                          Model *
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
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
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
                  className={`px-6 py-2 text-base ${signInTime ? "bg-green-600 hover:bg-green-700" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"}`}
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
              className="px-12 py-3 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 modern-shadow"
              disabled={isLoading || !signInTime || branches.length === 0}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Registering...</span>
                </div>
              ) : (
                <>
                  <User className="h-5 w-5 mr-2" />
                  Register Visitor
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
