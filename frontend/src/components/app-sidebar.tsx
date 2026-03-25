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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useTranslations, useI18n, type Locale } from "@/lib/i18n"
import { useAuth } from "@/lib/auth-context"
import { HomeIcon, PackageIcon, TruckIcon, WarehouseIcon, CalendarIcon, ShieldCheckIcon, BarChart3Icon, Settings2Icon, CircleHelpIcon, SearchIcon, UtensilsCrossedIcon, FileTextIcon, LanguagesIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
]

function SidebarToggleArrow() {
  const { toggleSidebar, open } = useSidebar()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleSidebar}
      className="absolute -right-3 top-6 z-50 size-6 rounded-full border bg-background shadow-md hover:bg-accent"
    >
      {open ? (
        <ChevronLeftIcon className="size-4" />
      ) : (
        <ChevronRightIcon className="size-4" />
      )}
    </Button>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations()
  const { locale, setLocale } = useI18n()
  const { user, signOut } = useAuth()

  const navMain = [
    { title: t.nav.home, url: "/", icon: <HomeIcon /> },
    { title: t.nav.products, url: "/products", icon: <PackageIcon /> },
    { title: t.nav.suppliers, url: "/suppliers", icon: <TruckIcon /> },
    { title: t.nav.inventory, url: "/inventory", icon: <WarehouseIcon /> },
    { title: t.nav.bolla, url: "/bolla", icon: <FileTextIcon /> },
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarToggleArrow />
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="TavolaPerfetta"
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setLocale(locale === "en" ? "it" : "en")}
              tooltip={`${languages.find(l => l.code === locale)?.flag} ${languages.find(l => l.code === locale)?.label}`}
            >
              <LanguagesIcon />
              <span>{languages.find(l => l.code === locale)?.flag} {languages.find(l => l.code === locale)?.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        {user && (
          <NavUser
            user={{
              name: user.restaurant_name || user.email.split("@")[0],
              email: user.email,
              role: user.role,
            }}
            onSignOut={signOut}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
