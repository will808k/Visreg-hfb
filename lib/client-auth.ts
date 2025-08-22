// Client-side authentication utilities
"use client";

export function setAuthToken(token: string) {
  // Set in localStorage for client-side access
  localStorage.setItem("token", token);

  // Set as httpOnly cookie for server-side middleware
  document.cookie = `auth-token=${token}; path=/; max-age=${
    30 * 24 * 60 * 60
  }; samesite=strict`;
}

export function removeAuthToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Remove cookie
  document.cookie =
    "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.isAdmin === true;
}
