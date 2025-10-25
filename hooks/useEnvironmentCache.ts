"use client";
import { useState, useEffect } from 'react';
import { EnvironmentInfo } from './useEnvironmentDetection';

const ENVIRONMENT_CACHE_KEY = 'base-debate-environment-cache';

interface CachedEnvironmentInfo extends EnvironmentInfo {
  timestamp: number;
}

export function useEnvironmentCache() {
  const [cachedEnvironment, setCachedEnvironment] = useState<EnvironmentInfo | null>(null);

  // Load cached environment on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(ENVIRONMENT_CACHE_KEY);
      if (cached) {
        const parsed: CachedEnvironmentInfo = JSON.parse(cached);
        
        // Check if cache is still valid (within 5 minutes)
        const isExpired = Date.now() - parsed.timestamp > 5 * 60 * 1000;
        
        if (!isExpired) {
          console.log('📦 Using cached environment:', parsed);
          setCachedEnvironment({
            isMiniApp: parsed.isMiniApp,
            isExternalBrowser: parsed.isExternalBrowser,
            isFarcaster: parsed.isFarcaster,
            isBaseApp: parsed.isBaseApp,
            environment: parsed.environment,
            isLoading: false, // Never loading when using cache
            userFid: parsed.userFid,
            clientFid: parsed.clientFid
          });
        } else {
          console.log('⏰ Cached environment expired, clearing cache');
          localStorage.removeItem(ENVIRONMENT_CACHE_KEY);
        }
      }
    } catch (error) {
      console.log('⚠️ Failed to load cached environment:', error);
      localStorage.removeItem(ENVIRONMENT_CACHE_KEY);
    }
  }, []);

  const cacheEnvironment = (environmentInfo: EnvironmentInfo) => {
    try {
      const cacheData: CachedEnvironmentInfo = {
        ...environmentInfo,
        timestamp: Date.now()
      };
      
      localStorage.setItem(ENVIRONMENT_CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Cached environment:', cacheData);
    } catch (error) {
      console.log('⚠️ Failed to cache environment:', error);
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(ENVIRONMENT_CACHE_KEY);
      setCachedEnvironment(null);
      console.log('🗑️ Cleared environment cache');
    } catch (error) {
      console.log('⚠️ Failed to clear environment cache:', error);
    }
  };

  return {
    cachedEnvironment,
    cacheEnvironment,
    clearCache
  };
}
