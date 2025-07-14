"use client";

import { useEffect, useState } from "react";

type Theme = "architech" | "architech-light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("architech");
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only updating theme after mount
  useEffect(() => {
    setMounted(true);

    // Get saved theme from localStorage or use system preference
    const savedTheme =
      (localStorage.getItem("theme") as Theme) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "architech"
        : "architech-light");

    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  // Function to change theme
  const setThemeValue = (newTheme: Theme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Toggle between dark and light themes
  const toggleTheme = () => {
    const newTheme = theme === "architech" ? "architech-light" : "architech";
    setThemeValue(newTheme);
  };

  return {
    theme: mounted ? theme : "architech", // Prevent hydration mismatch
    setTheme: setThemeValue,
    toggleTheme,
    isDark: theme === "architech",
    isLight: theme === "architech-light",
    mounted,
  };
}
