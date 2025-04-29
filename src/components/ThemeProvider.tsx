"use client";

import { useState, useEffect } from "react";
import { useSettingsStore } from "@/lib/store";

export default function ThemeProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { theme } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Apply theme to document root when it changes
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  return <>{children}</>;
} 