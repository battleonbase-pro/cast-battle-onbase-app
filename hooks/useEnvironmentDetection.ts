"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface EnvironmentInfo {
  isMiniApp: boolean;
  isExternalBrowser: boolean;
  environment: 'miniapp' | 'external';
  isLoading: boolean;
}

export function useEnvironmentDetection(): EnvironmentInfo {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>({
    isMiniApp: false,
    isExternalBrowser: false,
    environment: 'external',
    isLoading: true
  });

  useEffect(() => {
    const detectEnvironment = async () => {
      try {
        console.log('🔍 Starting unified environment detection...');
        
        // Use Farcaster SDK to detect any Mini App environment (Farcaster + Base Mini Apps)
        const inMiniApp = await sdk.isInMiniApp();
        
        if (inMiniApp) {
          console.log('🎯 Detected Mini App environment (Farcaster or Base Mini App)');
          setEnvironmentInfo({
            isMiniApp: true,
            isExternalBrowser: false,
            environment: 'miniapp',
            isLoading: false
          });
          return;
        }

        // Default to external browser
        console.log('🌐 Detected external browser environment');
        setEnvironmentInfo({
          isMiniApp: false,
          isExternalBrowser: true,
          environment: 'external',
          isLoading: false
        });
      } catch (error) {
        console.log('⚠️ Environment detection failed, defaulting to external:', error);
        setEnvironmentInfo({
          isMiniApp: false,
          isExternalBrowser: true,
          environment: 'external',
          isLoading: false
        });
      }
    };

    detectEnvironment();
  }, []);

  return environmentInfo;
}
