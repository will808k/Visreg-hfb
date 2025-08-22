// Component to protect pages and check admin access
"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, isAuthenticated } from "@/lib/client-auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({
  children,
  requireAdmin = false,
  fallback,
}: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push("/login");
        return;
      }

      const user = getUser();

      if (requireAdmin && !user?.isAdmin) {
        router.push("/register"); // Redirect non-admins to register page
        return;
      }

      setHasAccess(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, requireAdmin]);

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
