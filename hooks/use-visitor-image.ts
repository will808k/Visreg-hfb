"use client";

import { useState, useEffect, useCallback } from "react";

interface UseVisitorImageOptions {
  visitorId: number;
  photoType?: "photo" | "id_front" | "id_back";
  enabled?: boolean; // whether to fetch immediately or wait for manual trigger
}

interface UseVisitorImageReturn {
  image: string | null;
  loading: boolean;
  error: string | null;
  fetchImage: () => Promise<void>;
}

export function useVisitorImage({
  visitorId,
  photoType = "photo",
  enabled = true,
}: UseVisitorImageOptions): UseVisitorImageReturn {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `/api/visits/${visitorId}/photo?type=${photoType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const imageData = data.photo;

      setImage(imageData);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching visitor image:", err);
      setError(err.message || "Failed to fetch image");
    } finally {
      setLoading(false);
    }
  }, [visitorId, photoType]);

  // Auto-fetch if enabled
  useEffect(() => {
    if (enabled) {
      fetchImage();
    }
  }, [enabled, fetchImage]);

  return {
    image,
    loading,
    error,
    fetchImage,
  };
}
