"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

interface VisitDetails {
  id: number;
  category: string;
  digital_card_no: string;
  reason: string;
  office: string;
  sign_in_time: string;
  sign_out_time?: string;
  has_laptop: boolean;
  laptop_brand?: string;
  laptop_model?: string;
  visitee_name?: string;
  company?: string;
  person_in_charge?: string;
  other_items?: string[];
}

interface Visitor {
  visitor_id: number;
  name: string;
  phone_number: string;
  photo?: string;
  id_photo_front?: string;
  id_photo_back?: string;
  branch_name: string;
  registered_by_name: string;
  total_visits?: number;
  has_active_visits: boolean;
  visits: VisitDetails[];
}

interface UseTodaysVisitorsOptions {
  statusFilter?: string;
  allBranches?: boolean;
  refetchInterval?: number; // in milliseconds
  includeImages?: boolean; // whether to include images in the initial fetch
}

export function useTodaysVisitors(options: UseTodaysVisitorsOptions = {}) {
  const {
    statusFilter = "all",
    allBranches = false,
    refetchInterval = 60000, // 1 minute
    includeImages = false,
  } = options;

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchVisitors = useCallback(async () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (allBranches) {
        params.append("all_branches", "true");
      }
      if (includeImages) {
        params.append("include_images", "true");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`/api/visitors/today?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const visitorsData = Array.isArray(data) ? data : [];

      setVisitors(visitorsData);
      setError(null);
      return visitorsData;
    } catch (err: any) {
      if (err.name === "AbortError") {
        // Request was cancelled, don't update state
        return;
      }

      console.error("Error fetching visitors:", err);
      const errorMessage = err.message || "Failed to fetch visitors";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, allBranches, includeImages]);

  const refresh = useCallback(() => {
    return fetchVisitors();
  }, [fetchVisitors]);

  const fetchVisitorImage = useCallback(
    async (
      visitorId: number,
      photoType: "photo" | "id_front" | "id_back" = "photo"
    ) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await fetch(
          `/api/visitors/${visitorId}/photo?type=${photoType}`,
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
        return data.photo;
      } catch (err: any) {
        console.error("Error fetching visitor image:", err);
        throw err;
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchVisitors();
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchVisitors, refetchInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    visitors,
    loading,
    error,
    refresh,
    fetchVisitors,
    fetchVisitorImage,
  };
}
