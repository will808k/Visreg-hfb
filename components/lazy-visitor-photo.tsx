"use client";

import React, { useState } from "react";
import { useVisitorImage } from "@/hooks/use-visitor-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, AlertCircle } from "lucide-react";

interface LazyVisitorPhotoProps {
  visitorId: number;
  visitorName: string;
  photoType?: "photo" | "id_front" | "id_back";
  size?: "sm" | "md" | "lg";
  className?: string;
  enabled?: boolean; // whether to load immediately or on demand
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function LazyVisitorPhoto({
  visitorId,
  visitorName,
  photoType = "photo",
  size = "md",
  className = "",
  enabled = false, // Don't load by default
}: LazyVisitorPhotoProps) {
  const [shouldLoad, setShouldLoad] = useState(enabled);
  const { image, loading, error, fetchImage } = useVisitorImage({
    visitorId,
    photoType,
    enabled: shouldLoad,
  });

  const handleClick = () => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Skeleton className={`${sizeClasses[size]} rounded-full ${className}`} />
    );
  }

  if (error) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-destructive/10 flex items-center justify-center ${className}`}
        title={`Error loading photo: ${error}`}
      >
        <AlertCircle className="h-4 w-4 text-destructive" />
      </div>
    );
  }

  if (image) {
    return (
      <Avatar className={`${sizeClasses[size]} ${className}`}>
        <AvatarImage
          src={`data:image/jpeg;base64,${image}`}
          alt={`${visitorName} photo`}
        />
        <AvatarFallback>{getInitials(visitorName)}</AvatarFallback>
      </Avatar>
    );
  }

  // Show placeholder with click to load
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors ${className}`}
      onClick={handleClick}
      title="Click to load photo"
    >
      <User className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
