"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Clock,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  UserPlus,
  Eye,
  Download,
  Building2,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

interface DashboardStats {
  totalVisits: number
  averageDuration: number
  totalUsers: number
  todayVisits: number
  uniqueVisitors: number
  activeVisits: number
}

interface RecentVisit {
  id: number
  name: string
  company: string | null
  check_in_time: string
  status: string
  digital_card_no: string | null
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVisits: 0,
    averageDuration: 0,
    totalUsers: 0,
    todayVisits: 0,
    uniqueVisitors: 0,
    activeVisits: 0,
  })
  const [chartData, setChartData] = useState([])
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>([])
  const [chartMode, setChartMode] = useState<"visits" | "duration">("visits")
  const [timeRange, setTimeRange] = useState<"daily" | "monthly" | "yearly">("daily")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchRecentVisits()
  }, [])

  useEffect(() => {
    fetchChartData()
  }, [chartMode, timeRange])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchChartData = async () => {
    try {
      const response = await fetch(`/api/dashboard/chart?mode=${chartMode}&range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setChartData(data)
    } catch (error) {
      console.error("Failed to fetch chart data:", error)
    }
  }

  const fetchRecentVisits = async () => {
    try {
      const response = await fetch("/api/visitors/today?limit=5", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const data = await response.json()
      setRecentVisits(data.visits || [])
    } catch (error) {
      console.error("Failed to fetch recent visits:", error)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "checked_in":
        return <Badge className="bg-green-100 text-green-700">Active</Badge>
      case "checked_out":
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

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
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-lg text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 lg:mt-0">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            className="bg-[#2532a1]"
            size="sm"
            onClick={() => window.open("/dashboard/register", "_blank")}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Register Visitor
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-blue-700">Total Visits</CardTitle>
            <div className="p-2 bg-blue-600 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.totalVisits.toLocaleString()}</div>
            <div className="flex items-center text-xs text-blue-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>{stats.uniqueVisitors} unique visitors</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-purple-700">Average Duration</CardTitle>
            <div className="p-2 bg-purple-600 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{formatDuration(stats.averageDuration)}</div>
            <div className="flex items-center text-xs text-purple-600 mt-1">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              <span>Per visit average</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-green-700">Active Visits</CardTitle>
            <div className="p-2 bg-green-600 rounded-lg">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{stats.activeVisits}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Currently checked in</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift modern-shadow border-0 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-orange-700">Today's Visits</CardTitle>
            <div className="p-2 bg-orange-600 rounded-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{stats.todayVisits}</div>
            <div className="flex items-center text-xs text-orange-600 mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              <span>Updated live</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="modern-shadow border-0">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <CardTitle className="text-2xl text-gray-900">Analytics Overview</CardTitle>
              <CardDescription className="text-lg text-gray-600">
                {chartMode === "visits" ? "Visitor traffic patterns over time" : "Average visit duration trends"}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View
              </Badge>
              <Select value={chartMode} onValueChange={(value: "visits" | "duration") => setChartMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visits">Visits</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={(value: "daily" | "monthly" | "yearly") => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "visits" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="period" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVisits)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="period" stroke="#6B7280" fontSize={12} />
                  <YAxis stroke="#6B7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#8B5CF6", strokeWidth: 2 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="modern-shadow border-0">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">Quick Actions</CardTitle>
            <CardDescription>Frequently used functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="bg-[#2532a1] hover:to-purple-700 h-12"
                onClick={() => window.open("/dashboard/register", "_blank")}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                New Visitor
              </Button>
              <Button
                variant="outline"
                className="h-12 hover:bg-gray-50 bg-transparent"
                onClick={() => (window.location.href = "/dashboard/reports")}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Reports
              </Button>
              <Button
                variant="outline"
                className="h-12 hover:bg-gray-50 bg-transparent"
                onClick={() => (window.location.href = "/dashboard/users")}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="h-12 hover:bg-gray-50 bg-transparent"
                onClick={() => (window.location.href = "/dashboard/branches")}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Branches
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-shadow border-0">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">Recent Activity</CardTitle>
            <CardDescription>Latest visitor registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentVisits.length > 0 ? (
                recentVisits.map((visit) => (
                  <div key={visit.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {visit.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-900 truncate">{visit.name}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">Signed in • {formatTime(visit.check_in_time)}</p>
                        {visit.digital_card_no && (
                          <Badge variant="outline" className="text-xs">
                            #{visit.digital_card_no}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(visit.status)}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
