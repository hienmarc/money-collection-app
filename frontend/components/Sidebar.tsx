"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BanknoteIcon,
  Coins,
  Globe,
  Archive,
  Settings,
  Search,
  DollarSign,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const OPEN_SIDEBAR_THRESHOLD_WIDTH = 768

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Catalog", href: "/catalog", icon: Search },
    { name: "Banknotes", href: "/banknotes", icon: BanknoteIcon },
    { name: "Collection Value", href: "/collection-value", icon: DollarSign },
    { name: "Currencies", href: "/currencies", icon: Coins },
    { name: "Countries", href: "/countries", icon: Globe },
  ]

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= OPEN_SIDEBAR_THRESHOLD_WIDTH) {
        setIsOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [setIsOpen])

  return (
    <>
      <aside className="bg-white w-64 h-screen hidden md:block">
        <div className="h-full flex flex-col py-6 px-4">
          <div className="flex items-center justify-center mb-6">
            <span className="text-2xl font-semibold text-gray-800">Banknote App</span>
          </div>
          <nav className="flex-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-2 py-2.5 px-4 rounded transition duration-200 ${
                  pathname === item.href ? "bg-gray-200 text-gray-800" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-6">
            <SheetTitle className="text-2xl font-semibold text-gray-800">Banknote App</SheetTitle>
          </SheetHeader>
          <nav className="px-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-2 py-2.5 px-4 rounded transition duration-200 ${
                  pathname === item.href ? "bg-gray-200 text-gray-800" : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default Sidebar
