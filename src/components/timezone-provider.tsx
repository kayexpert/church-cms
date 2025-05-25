"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { detectUserTimezone, isTimezoneDetectionSupported } from "@/lib/timezone-utils";

type TimezoneContextType = {
  timezone: string;
  isDetected: boolean;
  setTimezone: (timezone: string) => void;
};

const defaultTimezone = "UTC";

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: defaultTimezone,
  isDetected: false,
  setTimezone: () => null,
});

export function TimezoneProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use null as initial state to indicate it hasn't been detected yet
  // This helps prevent hydration errors by ensuring we don't render different values
  // on server vs client
  const [timezone, setTimezoneState] = useState<string | null>(null);
  const [isDetected, setIsDetected] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // First, mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Then detect timezone in a separate effect
  useEffect(() => {
    // Skip if not mounted yet
    if (!isMounted) return;

    // Check if timezone detection is supported
    if (!isTimezoneDetectionSupported()) {
      console.warn("Timezone detection is not supported in this browser");
      setTimezoneState(defaultTimezone);
      return;
    }

    // Detect user's timezone
    const detectedTimezone = detectUserTimezone();
    setTimezoneState(detectedTimezone);
    setIsDetected(true);

    // Log the detected timezone
    console.log(`Detected user timezone: ${detectedTimezone}`);
  }, [isMounted]);

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
  };

  // Determine the actual timezone value to provide
  const actualTimezone = timezone || defaultTimezone;

  return (
    <TimezoneContext.Provider
      value={{
        timezone: actualTimezone,
        isDetected,
        setTimezone,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);

  if (context === undefined) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }

  return context;
}
