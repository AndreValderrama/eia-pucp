
'use client';

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
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  ListTree, 
  ClipboardPlus, 
  FileText, 
  BarChart3, 
  Settings2,
  LogOut,
  BookOpenText,
  Wind
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alternatives', label: 'Alternatives', icon: ListTree },
  { href: '/factors', label: 'Factors', icon: Wind },
  { href: '/results', label: 'Results', icon: BarChart3 },
];

export default function AppSidebar() {
  const pathname = usePathname();

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
