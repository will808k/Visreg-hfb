"use client";

import * as React from "react";
import {
  Home,
  Users,
  Building2,
  FileText,
  Settings,
  LogOut,
  UserPlus,
  Eye,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { removeAuthToken } from "@/lib/client-auth";
import toast from "react-hot-toast";

// Menu data
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: false,
    },
    {
      title: "Management",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Users",
          url: "/dashboard/users",
          icon: Users,
        },
        {
          title: "Branches",
          url: "/dashboard/branches",
          icon: Building2,
        },
      ],
    },
    {
      title: "Reports",
      url: "/dashboard/reports",
      icon: FileText,
      isActive: false,
    },
  ],
  quickActions: [
    {
      title: "Register Visitor",
      url: "/dashboard/register",
      icon: UserPlus,
      description: "Add new visitor (Admin)",
    },
    {
      title: "View Reports",
      url: "/dashboard/reports",
      icon: Eye,
      description: "Analytics & insights",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      // Call logout API to clear server-side cookie
      await fetch("/api/auth/logout", { method: "POST" });

      // Clear client-side storage using proper function
      removeAuthToken();

      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Error logging out");
      // Still clear local storage even if API fails
      removeAuthToken();
      router.push("/login");
    }
  };

  // Get user info from token (simplified)
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({
          id: payload.userId,
          name: "Admin User",
          email: "admin@company.com",
        });
      } catch {
        // Handle invalid token
      }
    }
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-12">
              <div className="flex items-center">
                <div className="grid flex-1 text-left leading-tight ml-3">
                  <span className="truncate font-bold text-base">
                    VRS Admin
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    Management Portal
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.items &&
                    item.items.some((subItem) => pathname === subItem.url));

                if (item.items) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isActive}
                        className="text-base font-medium h-10 data-[active=true]:bg-[#2532a1] data-[active=true]:text-white data-[active=true]:shadow-md hover:bg-sidebar-accent/50 transition-all duration-200"
                      >
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                              className="text-sm font-medium h-9 data-[active=true]:bg-[#2532a1] data-[active=true]:text-white data-[active=true]:shadow-sm hover:bg-sidebar-accent/50 transition-all duration-200"
                            >
                              <a href={subItem.url}>
                                <subItem.icon className="size-4" />
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                      className="text-base font-medium h-10 data-[active=true]:bg-[#2532a1] data-[active=true]:text-white data-[active=true]:shadow-md hover:bg-sidebar-accent/50 transition-all duration-200"
                    >
                      <a href={item.url}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-sidebar-foreground/70">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.quickActions.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.description}
                    isActive={pathname === item.url}
                    className="text-sm font-medium h-9 hover:bg-sidebar-accent/50 transition-all duration-200 group-data-[collapsible=icon]:!p-2 data-[active=true]:bg-[#2532a1] data-[active=true]:text-white data-[active=true]:shadow-sm"
                  >
                    <a href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src="/placeholder.svg?height=32&width=32"
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      {user?.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("") || "AU"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || "Admin User"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || "admin@company.com"}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src="/placeholder.svg?height=32&width=32"
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        {user?.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("") || "AU"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.name || "Admin User"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email || "admin@company.com"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
