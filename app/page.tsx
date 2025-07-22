"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="min-h-screen custom-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold custom-text mb-4">Visitor Registration System</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
