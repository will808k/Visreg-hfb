"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, Plus, Search, MoreHorizontal, Edit, Trash2, MapPin, Users, X } from "lucide-react"
import toast from "react-hot-toast"

interface Branch {
  id: number
  name: string
  location: string
  offices: string[]
  reasons: string[]
  created_at: string
  user_count?: number
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    offices: [] as string[],
    reasons: [] as string[],
  })
  const [newOffice, setNewOffice] = useState("")
  const [newReason, setNewReason] = useState("")

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const response = await fetch("/api/branches", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log("Raw branches data:", data) // Debug log
        setBranches(Array.isArray(data) ? data : [])
      } else {
        console.error("Failed to fetch branches:", response.statusText)
        setBranches([])
      }
    } catch (error) {
      console.error("Error fetching branches:", error)
      setBranches([])
      toast.error("Failed to fetch branches")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches"
      const method = editingBranch ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingBranch ? "Branch updated successfully" : "Branch created successfully")
        setIsDialogOpen(false)
        resetForm()
        fetchBranches()
      } else {
        const data = await response.json()
        toast.error(data.error || "Operation failed")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setFormData({
      name: branch.name,
      location: branch.location,
      offices: [...branch.offices],
      reasons: [...branch.reasons],
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (branchId: number) => {
    if (!confirm("Are you sure you want to delete this branch?")) return

    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        toast.success("Branch deleted successfully")
        fetchBranches()
      } else {
        toast.error("Failed to delete branch")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      offices: [],
      reasons: [],
    })
    setEditingBranch(null)
    setNewOffice("")
    setNewReason("")
  }

  const addOffice = () => {
    if (newOffice.trim() && !formData.offices.includes(newOffice.trim())) {
      setFormData((prev) => ({
        ...prev,
        offices: [...prev.offices, newOffice.trim()],
      }))
      setNewOffice("")
    }
  }

  const removeOffice = (office: string) => {
    setFormData((prev) => ({
      ...prev,
      offices: prev.offices.filter((o) => o !== office),
    }))
  }

  const addReason = () => {
    if (newReason.trim() && !formData.reasons.includes(newReason.trim())) {
      setFormData((prev) => ({
        ...prev,
        reasons: [...prev.reasons, newReason.trim()],
      }))
      setNewReason("")
    }
  }

  const removeReason = (reason: string) => {
    setFormData((prev) => ({
      ...prev,
      reasons: prev.reasons.filter((r) => r !== reason),
    }))
  }

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-lg text-gray-600 mt-2">Manage office locations and their configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#2532a1] mt-4 lg:mt-0"
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
              <DialogDescription>
                {editingBranch ? "Update branch information" : "Create a new branch location"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Offices Section */}
              <div className="space-y-3">
                <Label>Offices/Departments</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add office/department"
                    value={newOffice}
                    onChange={(e) => setNewOffice(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addOffice())}
                  />
                  <Button type="button" onClick={addOffice} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.offices.map((office, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-700">
                      {office}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                        onClick={() => removeOffice(office)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Reasons Section */}
              <div className="space-y-3">
                <Label>Visit Reasons</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add visit reason"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addReason())}
                  />
                  <Button type="button" onClick={addReason} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.reasons.map((reason, index) => (
                    <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-700">
                      {reason}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                        onClick={() => removeReason(reason)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2532a1] text-base"
                >
                  {editingBranch ? "Update" : "Create"} Branch
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-blue-700">Total Branches</p>
                <p className="text-3xl font-bold text-blue-900">{branches.length}</p>
              </div>
              <div className="p-3 bg-blue-600 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-green-700">Total Offices</p>
                <p className="text-3xl font-bold text-green-900">
                  {branches.reduce((sum, branch) => sum + branch.offices.length, 0)}
                </p>
              </div>
              <div className="p-3 bg-green-600 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-purple-700">Visit Reasons</p>
                <p className="text-3xl font-bold text-purple-900">
                  {branches.reduce((sum, branch) => sum + branch.reasons.length, 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-600 rounded-xl">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="modern-shadow border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search branches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <div className="text-sm text-gray-600">
              Showing {filteredBranches.length} of {branches.length} branches
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branches Table */}
      <Card className="modern-shadow border-0">
        <CardHeader>
          <CardTitle className="text-xl">Branches</CardTitle>
          <CardDescription className="text-lg">Manage branch locations and configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Offices</TableHead>
                <TableHead>Visit Reasons</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.map((branch) => (
                <TableRow key={branch.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-base font-medium text-gray-900">{branch.name}</p>
                      <div className="flex items-center text-base text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {branch.location}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(branch.offices) && branch.offices.length > 0 ? (
                        <>
                          {branch.offices.slice(0, 3).map((office, index) => (
                            <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                              {office}
                            </Badge>
                          ))}
                          {branch.offices.length > 3 && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                              +{branch.offices.length - 3} more
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-base text-gray-500">No offices</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(branch.reasons) && branch.reasons.length > 0 ? (
                        <>
                          {branch.reasons.slice(0, 2).map((reason, index) => (
                            <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                              {reason}
                            </Badge>
                          ))}
                          {branch.reasons.length > 2 && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                              +{branch.reasons.length - 2} more
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-base text-gray-500">No reasons</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-base text-gray-600">
                    {new Date(branch.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(branch)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(branch.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
