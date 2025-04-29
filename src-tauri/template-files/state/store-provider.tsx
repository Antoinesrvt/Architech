"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";

export function StoreProvider({ children }: PropsWithChildren) {
  // This prevents hydration errors with Zustand persist
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    // You could render a loading indicator here if needed
    return <>{children}</>;
  }

  return <>{children}</>;
} 