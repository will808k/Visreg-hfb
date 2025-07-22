"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface VisitorPhotoProps {
  photo?: string | null
  name: string
  className?: string
  fallbackClassName?: string
}

export function VisitorPhoto({ photo, name, className = "h-12 w-12", fallbackClassName }: VisitorPhotoProps) {
  const [imageError, setImageError] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Avatar className={className}>
      {photo && !imageError ? (
        <AvatarImage src={photo || "/placeholder.svg"} alt={name} onError={() => setImageError(true)} />
      ) : (
        <AvatarFallback className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white ${fallbackClassName}`}>
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
