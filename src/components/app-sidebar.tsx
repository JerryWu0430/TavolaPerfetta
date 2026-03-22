"use client"

import * as React from "react"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useTranslations } from "@/lib/i18n"
import { HomeIcon, PackageIcon, TruckIcon, WarehouseIcon, CalendarIcon, ShieldCheckIcon, BarChart3Icon, Settings2Icon, CircleHelpIcon, SearchIcon, UtensilsCrossedIcon } from "lucide-react"

const user = {
  name: "Chef Marco",
  email: "marco@tavolaperfetta.it",
  avatar: "/avatars/chef.jpg",
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations()

  const navMain = [
    { title: t.nav.home, url: "/", icon: <HomeIcon /> },
    { title: t.nav.products, url: "/products", icon: <PackageIcon /> },
    { title: t.nav.suppliers, url: "/suppliers", icon: <TruckIcon /> },
    { title: t.nav.inventory, url: "/inventory", icon: <WarehouseIcon /> },
    { title: t.nav.planning, url: "/planning", icon: <CalendarIcon /> },
    { title: t.nav.haccp, url: "/haccp", icon: <ShieldCheckIcon /> },
    { title: t.nav.reports, url: "/reports", icon: <BarChart3Icon /> },
  ]

  const navSecondary = [
    { title: t.nav.settings, url: "#", icon: <Settings2Icon /> },
    { title: t.nav.help, url: "#", icon: <CircleHelpIcon /> },
    { title: t.nav.search, url: "#", icon: <SearchIcon /> },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <UtensilsCrossedIcon className="size-5!" />
              <span className="text-base font-semibold">TavolaPerfetta</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
