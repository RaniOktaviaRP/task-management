'use client';

import { Calendar, CheckSquare, Users, Home, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/dashboard", icon: Home },
  { title: "Task Tracker", url: "/new-today", icon: CheckSquare },
  { title: "User Management", url: "/users", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const currentPath = pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      href={item.url} 
                      className={`flex items-center px-3 py-2 text-sm transition-colors ${
                        isActive(item.url) 
                          ? "text-accent font-medium bg-accent/10" 
                          : "text-muted-foreground hover:text-accent hover:bg-accent/5"
                      }`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-accent hover:bg-accent/5 transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}