"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md text-center">
        <h2 className="mb-4 text-3xl font-bold">Something went wrong!</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          We've encountered an unexpected error. Please try again or contact support if the issue persists.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
} 