"use client";

import React, { useState } from "react";
import { useVisitorImage } from "@/hooks/use-visitor-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Eye, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoIndicatorProps {
  visitorId: number;
  photoType: "photo" | "id_front" | "id_back";
  label: string;
  className?: string;
}

export function PhotoIndicator({
  visitorId,
  photoType,
  label,
  className = "",
}: PhotoIndicatorProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const { image, loading, error, fetchImage } = useVisitorImage({
    visitorId,
    photoType,
    enabled: false, // Don't load immediately
  });

  const handleClick = async () => {
    if (!image && !loading && !error) {
      await fetchImage();
    }
    if (image) {
      setIsImageViewerOpen(true);
    }
  };

  return (
    <>
      <div
        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${className}`}
        onClick={handleClick}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Camera className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{label}</p>
            {loading && <p className="text-xs text-gray-500">Loading...</p>}
            {error && <p className="text-xs text-red-500">Error loading</p>}
            {image && <p className="text-xs text-green-600">Available</p>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {image ? (
            <Eye className="h-4 w-4 text-blue-600" />
          ) : error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Button variant="outline" size="sm" className="text-xs">
              Load
            </Button>
          )}
        </div>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          {image && (
            <div className="flex justify-center">
              <img
                src={`data:image/jpeg;base64,${image}`}
                alt={label}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
