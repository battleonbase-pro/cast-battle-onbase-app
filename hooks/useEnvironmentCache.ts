"use client";
import { useState, useEffect } from 'react';
import { EnvironmentInfo } from './useEnvironmentDetection';

// Global in-memory cache for environment detection
let globalEnvironmentCache: EnvironmentInfo | null = null;

export function useEnvironmentCache() {
  const [cachedEnvironment, setCachedEnvironment] = useState<EnvironmentInfo | null>(globalEnvironmentCache);

  // Load cached environment on mount
  useEffect(() => {
    if (globalEnvironmentCache) {
      console.log('📦 Using cached environment from memory:', globalEnvironmentCache);
      setCachedEnvironment(globalEnvironmentCache);
    }
  }, []);

  const cacheEnvironment = (environmentInfo: EnvironmentInfo) => {
    globalEnvironmentCache = environmentInfo;
    setCachedEnvironment(environmentInfo);
    console.log('💾 Cached environment in memory:', environmentInfo);
  };

  const clearCache = () => {
    globalEnvironmentCache = null;
    setCachedEnvironment(null);
    console.log('🗑️ Cleared environment cache from memory');
  };

  return {
    cachedEnvironment,
    cacheEnvironment,
    clearCache
  };
}
