"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface EnvironmentInfo {
  isMiniApp: boolean;
  isExternalBrowser: boolean;
  isFarcaster: boolean;
  isBaseApp: boolean;
  environment: 'farcaster' | 'base' | 'external';
  isLoading: boolean;
  userFid?: string;
  clientFid?: string;
}

export function useEnvironmentDetection(): EnvironmentInfo {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>({
    isMiniApp: false,
    isExternalBrowser: true,
    isFarcaster: false,
    isBaseApp: false,
    environment: 'external',
    isLoading: true
  });

  useEffect(() => {
    const detectEnvironment = async () => {
      try {
        console.log('🔍 Starting environment detection with Farcaster SDK...');
        
        // Use Farcaster SDK to detect any Mini App environment (Farcaster + Base Mini Apps)
        const inMiniApp = await sdk.isInMiniApp();
        
        if (inMiniApp) {
          console.log('🎯 Detected Mini App environment (Farcaster or Base Mini App)');
          
          // For now, we'll treat all Mini Apps as Farcaster since we can't distinguish
          // between Farcaster and Base Mini Apps with the current SDK
          setEnvironmentInfo({
            isMiniApp: true,
            isExternalBrowser: false,
            isFarcaster: true, // Default to Farcaster for Mini Apps
            isBaseApp: false,
            environment: 'farcaster',
            isLoading: false
          });
          
          console.log('✅ Environment detected: Mini App (treated as Farcaster)');
        } else {
          // Not in Mini App environment
          console.log('🌐 Detected external browser environment');
          setEnvironmentInfo({
            isMiniApp: false,
            isExternalBrowser: true,
            isFarcaster: false,
            isBaseApp: false,
            environment: 'external',
            isLoading: false
          });
        }
      } catch (error) {
        console.log('⚠️ Environment detection failed, defaulting to external:', error);
        setEnvironmentInfo({
          isMiniApp: false,
          isExternalBrowser: true,
          isFarcaster: false,
          isBaseApp: false,
          environment: 'external',
          isLoading: false
        });
      }
    };

    detectEnvironment();
  }, []);

  return environmentInfo;
}
