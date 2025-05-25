'use client';

import { useState, useEffect } from 'react';
import { startMessageScheduler, stopMessageScheduler } from '@/services/message-scheduler';
import { startBirthdayMessageScheduler, stopBirthdayMessageScheduler } from '@/services/birthday-message-scheduler';

/**
 * Custom hook to manage message schedulers
 * This hook handles starting and stopping both the regular message scheduler
 * and the birthday message scheduler when the component mounts/unmounts
 * 
 * @returns Object with scheduler status
 */
export function useMessageScheduler() {
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Start both schedulers when the component mounts
    startMessageScheduler();
    startBirthdayMessageScheduler();
    setIsRunning(true);

    // Clean up when the component unmounts
    return () => {
      stopMessageScheduler();
      stopBirthdayMessageScheduler();
      setIsRunning(false);
    };
  }, []);

  return {
    isRunning
  };
}
