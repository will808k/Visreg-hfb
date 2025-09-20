"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface VisitorPhotoProps {
  photo?: string | null;
  name: string;
  className?: string;
  fallbackClassName?: string;
  onClick?: () => void;
}

export function VisitorPhoto({
  photo,
  name,
  className = "h-12 w-12",
  fallbackClassName,
  onClick,
}: VisitorPhotoProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatPhotoSrc = (photoData: string | null | undefined) => {
    if (!photoData) return "/placeholder.svg";
    return photoData.startsWith("data:")
      ? photoData
      : `data:image/jpeg;base64,${photoData}`;
  };

  return (
    <Avatar
      className={`${className} ${
        onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      }`}
      onClick={onClick}
    >
      {photo && !imageError ? (
        <AvatarImage
          src={formatPhotoSrc(photo)}
          alt={name}
          onError={() => setImageError(true)}
        />
      ) : (
        <AvatarFallback
          className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white ${fallbackClassName}`}
        >
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
