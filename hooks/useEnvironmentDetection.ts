"use client";
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface EnvironmentInfo {
  isFarcasterMiniApp: boolean;
  isBaseApp: boolean;
  isExternalBrowser: boolean;
  environment: 'farcaster' | 'base' | 'external';
}

export function useEnvironmentDetection(): EnvironmentInfo {
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>({
    isFarcasterMiniApp: false,
    isBaseApp: false,
    isExternalBrowser: false,
    environment: 'external'
  });

  useEffect(() => {
    const detectEnvironment = async () => {
      try {
        // Check if we're in a Farcaster Mini App
        const inMiniApp = await sdk.isInMiniApp();
        
        if (inMiniApp) {
          console.log('🎯 Detected Farcaster Mini App environment');
          setEnvironmentInfo({
            isFarcasterMiniApp: true,
            isBaseApp: false,
            isExternalBrowser: false,
            environment: 'farcaster'
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
            environment: 'base'
          });
          return;
        }

        // Default to external browser
        console.log('🌐 Detected external browser environment');
        setEnvironmentInfo({
          isFarcasterMiniApp: false,
          isBaseApp: false,
          isExternalBrowser: true,
          environment: 'external'
        });
      } catch (error) {
        console.log('⚠️ Environment detection failed, defaulting to external:', error);
        setEnvironmentInfo({
          isFarcasterMiniApp: false,
          isBaseApp: false,
          isExternalBrowser: true,
          environment: 'external'
        });
      }
    };

    detectEnvironment();
  }, []);

  return environmentInfo;
}
