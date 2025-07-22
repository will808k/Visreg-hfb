"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Phone, User, UserPlus, Clock } from "lucide-react"

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

interface VisitorSearchProps {
  onVisitorSelect: (visitor: ExistingVisitor) => void
  onNewVisitor: () => void
}

export function VisitorSearch({ onVisitorSelect, onNewVisitor }: VisitorSearchProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [searchResults, setSearchResults] = useState<ExistingVisitor[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (phoneNumber.length < 3) {
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/visitors/search?phone=${encodeURIComponent(phoneNumber)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
      } else {
        console.error("Search failed")
        setSearchResults([])
      }
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Simple phone number formatting - you can enhance this based on your needs
    if (!phone) return ""
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Visitor</h2>
        <p className="text-gray-600 text-base">Search by phone number or register a new visitor</p>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="phone" className="text-gray-700 font-medium text-base">
            Phone Number
          </Label>
          <div className="flex space-x-2 mt-1">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter phone number"
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={phoneNumber.length < 3 || isSearching}
              className="h-12 px-6 bg-[#2532a1] text-white"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Enter at least 3 digits to search</p>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-4">
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Found {searchResults.length} visitor(s)</h3>
                {searchResults.map((visitor) => (
                  <Card key={visitor.id} className="border-2 hover:border-blue-200 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-[#2532a1] text-yellow-300 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-base">{visitor.name}</h4>
                              <p className="text-gray-600 text-sm">{formatPhoneNumber(visitor.phone_number)}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Badge variant="secondary" className="mr-2">
                                {visitor.visits} visits
                              </Badge>
                            </div>
                            {visitor.last_visit && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Last visit: {formatDate(visitor.last_visit)}
                              </div>
                            )}
                          </div>

                          {visitor.last_visit_details && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Last visit:</span> {visitor.last_visit_details.office} -{" "}
                                {visitor.last_visit_details.reason}
                              </p>
                              {visitor.last_visit_details.has_laptop && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Had laptop: {visitor.last_visit_details.laptop_brand}{" "}
                                  {visitor.last_visit_details.laptop_model}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => onVisitorSelect(visitor)}
                          className="ml-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="p-6 text-center">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No visitors found</h3>
                  <p className="text-gray-600 text-base mb-4">No visitors found with phone number "{phoneNumber}"</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* New Visitor Option */}
        <div className="pt-4 border-t">
          <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
            <CardContent className="p-6 text-center">
              <UserPlus className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">New Visitor</h3>
              <p className="text-gray-600 text-base mb-4">Register a first-time visitor</p>
              <Button
                onClick={onNewVisitor}
                className="bg-[#2532a1] text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Register New Visitor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
