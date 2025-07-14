import { cn } from "@/lib/utils/cn";
import React, { useState, useEffect } from "react";

interface WizardSideNavigationProps {
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export function WizardSideNavigation({
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
}: WizardSideNavigationProps) {
  const [showButtons, setShowButtons] = useState(false);
  const [recentNavigation, setRecentNavigation] = useState<
    "next" | "prev" | null
  >(null);
  const [isMobile, setIsMobile] = useState(false);

  // Set initial mobile state and update on resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show buttons when user moves mouse
  useEffect(() => {
    const handleMouseMove = () => {
      setShowButtons(true);

      // Hide after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        setShowButtons(false);
      }, 3000);

      return () => clearTimeout(timeout);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle navigation click with animation effect
  const handleNavClick = (direction: "next" | "prev", callback: () => void) => {
    setRecentNavigation(direction);
    callback();

    // Reset the animation state after animation completes
    setTimeout(() => {
      setRecentNavigation(null);
    }, 400); // Slightly longer to ensure animation completes
  };

  // Don't render buttons on mobile
  if (isMobile) {
    return null;
  }

  return (
    <>
      {/* Previous button */}
      <button
        onClick={() => handleNavClick("prev", onPrevious)}
        disabled={!canGoPrevious}
        aria-label="Previous step"
        className={cn(
          "fixed left-4 md:left-8 lg:left-16 top-1/2 -translate-y-1/2 z-20",
          "w-10 h-10 md:w-12 md:h-12 rounded-full",
          "flex items-center justify-center",
          "bg-base-100/70 backdrop-blur-md border border-base-300",
          "shadow-lg transition-all duration-200 ease-out",
          "hover:bg-primary/20 hover:border-primary/50 hover:scale-105",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-base-100/70 disabled:hover:border-base-300 disabled:hover:scale-100",
          "group",
          showButtons || recentNavigation === "prev"
            ? "opacity-90 translate-x-0"
            : "opacity-0 -translate-x-2",
          recentNavigation === "prev" && "bg-primary/30 border-primary",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-primary/10",
            "transition-transform duration-300",
            recentNavigation === "prev" ? "animate-ping-once" : "scale-0",
          )}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:-translate-x-1 relative z-10"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* Next button */}
      <button
        onClick={() => handleNavClick("next", onNext)}
        disabled={!canGoNext}
        aria-label="Next step"
        className={cn(
          "fixed right-4 md:right-8 lg:right-16 top-1/2 -translate-y-1/2 z-20",
          "w-10 h-10 md:w-12 md:h-12 rounded-full",
          "flex items-center justify-center",
          "bg-base-100/70 backdrop-blur-md border border-base-300",
          "shadow-lg transition-all duration-200 ease-out",
          "hover:bg-primary/20 hover:border-primary/50 hover:scale-105",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-base-100/70 disabled:hover:border-base-300 disabled:hover:scale-100",
          "group",
          showButtons || recentNavigation === "next"
            ? "opacity-90 translate-x-0"
            : "opacity-0 translate-x-2",
          recentNavigation === "next" && "bg-primary/30 border-primary",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-primary/10",
            "transition-transform duration-300",
            recentNavigation === "next" ? "animate-ping-once" : "scale-0",
          )}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:translate-x-1 relative z-10"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </>
  );
}
