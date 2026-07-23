"use client"

import type React from "react"

import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { ThemeProvider } from "@/components/theme-provider"
import Providers from "@/components/providers"

import { usePathname } from "next/navigation"

import { ChatBot } from "@/components/ChatBot"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth")

  return (
    <Providers>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen h-[100dvh] overflow-hidden bg-background">
          {!isAuthPage && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />}
          <div className="flex-1 flex flex-col overflow-hidden h-full">
            {!isAuthPage && <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
            <main className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 ${isAuthPage ? "" : "p-4 md:p-6"}`}>
              <div className={isAuthPage ? "" : "container mx-auto"}>{children}</div>
            </main>
          </div>
        </div>
        {/* TODO: Display chat bot  when backend is ready*/}
        {/* {!isAuthPage && <ChatBot />} */}  
        <Toaster />
      </ThemeProvider>
    </Providers>
  )
}
