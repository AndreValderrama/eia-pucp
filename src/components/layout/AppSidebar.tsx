
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/auth-context';
import { projectService } from '@/lib/services/project-service';
import { Project } from '@/lib/types';
import { 
  LayoutDashboard, 
  ListTree, 
  BarChart3, 
  Settings2,
  LogOut,
  Wind,
  Zap,
  Users
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/factors', label: 'Factores', icon: Wind },
  { href: '/groups', label: 'Grupos', icon: Users },
  { href: '/results', label: 'Resultados', icon: BarChart3 },
];

export default function AppSidebar() {
  const pathname = usePathname();
  // Fetch projects would be here in a real app, assuming state from parent or hook
  const [isMounted, setIsMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const { user } = useAuth();

  useEffect(() => {
      setIsMounted(true);
      if (user) {
          projectService.getUserProjects(user.uid).then(setProjects);
      }
  }, [user]);

  if (!isMounted) return null;

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                  tooltip={item.label}
                >
                  <div>
                    <item.icon />
                    <span>{item.label}</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          
          <SidebarSeparator />
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">Proyectos (Estructuras)</div>
          {projects.map((p) => (
            <SidebarMenuItem key={p.id}>
                <Link href={`/projects/${p.id}/framework`} passHref>
                    <SidebarMenuButton tooltip={p.name}>
                        <Zap className="h-4 w-4" />
                        <span>{p.name}</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings2 />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log Out" variant="outline">
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
