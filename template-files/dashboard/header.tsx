"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { BellIcon, MoonIcon, SunIcon, UserIcon } from "./icons";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="M14 15h4" />
          <path d="M14 9h4" />
        </svg>
        ArchiTech
      </Link>
      <div className="flex items-center gap-4">
        <button className="rounded-full p-2 hover:bg-muted" aria-label="Toggle theme">
          <SunIcon className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </button>
        <button className="rounded-full p-2 hover:bg-muted" aria-label="Notifications">
          <BellIcon className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </button>
        <div className="border-l h-8 mx-2" />
        <button className="flex items-center gap-2">
          <span className="font-medium hidden sm:inline-block">John Doe</span>
          <UserIcon className="h-8 w-8 rounded-full border p-1" />
        </button>
      </div>
    </header>
  );
} 