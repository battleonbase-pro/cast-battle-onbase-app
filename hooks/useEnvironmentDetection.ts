"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface EnvironmentInfo {
  isFarcasterMiniApp: boolean;
  isBaseApp: boolean;
  isExternalBrowser: boolean;
  environment: 'farcaster' | 'base' | 'external';
  isLoading: boolean;
}

export function useEnvironmentDetection(): EnvironmentInfo {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>({
    isFarcasterMiniApp: false,
    isBaseApp: false,
    isExternalBrowser: false,
    environment: 'external',
    isLoading: true
  });

  useEffect(() => {
    const detectEnvironment = async () => {
      try {
        console.log('🔍 Starting environment detection...');
        
        // Use the most reliable method: Farcaster SDK
        const inMiniApp = await sdk.isInMiniApp();
        
        if (inMiniApp) {
          console.log('🎯 Detected Farcaster Mini App environment');
          setEnvironmentInfo({
            isFarcasterMiniApp: true,
            isBaseApp: false,
            isExternalBrowser: false,
            environment: 'farcaster',
            isLoading: false
          });
          return;
        }

        // Check if we're in Base app (Base app browser)
        const userAgent = navigator.userAgent.toLowerCase();
        const isBaseApp = userAgent.includes('base') || 
                         userAgent.includes('coinbase') ||
                         window.location.hostname.includes('base');
        
        if (isBaseApp) {
          console.log('🏦 Detected Base app environment');
          setEnvironmentInfo({
            isFarcasterMiniApp: false,
            isBaseApp: true,
            isExternalBrowser: false,
            environment: 'base',
            isLoading: false
          });
          return;
        }

        // Default to external browser
        console.log('🌐 Detected external browser environment');
        setEnvironmentInfo({
          isFarcasterMiniApp: false,
          isBaseApp: false,
          isExternalBrowser: true,
          environment: 'external',
          isLoading: false
        });
      } catch (error) {
        console.log('⚠️ Environment detection failed, defaulting to external:', error);
        setEnvironmentInfo({
          isFarcasterMiniApp: false,
          isBaseApp: false,
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
