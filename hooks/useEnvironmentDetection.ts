"use client";
import { useState, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

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
  const { context, isFrameReady } = useMiniKit();
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
        console.log('🔍 Starting enhanced environment detection...');
        
        // Wait for MiniKit context to be available
        if (!isFrameReady || !context) {
          console.log('⏳ Waiting for MiniKit context...');
          return;
        }

        // Use MiniKit context for precise detection
        const isBaseApp = context.client?.clientFid === 309857;
        const isFarcaster = context.client?.clientFid === 1;
        const isMiniApp = isBaseApp || isFarcaster;

        console.log('🎯 MiniKit context detection:', {
          clientFid: context.client?.clientFid,
          isBaseApp,
          isFarcaster,
          isMiniApp,
          userFid: context.user?.fid,
          launchLocation: context.location
        });

        if (isMiniApp) {
          if (isBaseApp) {
            console.log('✅ Environment detected: Base App Mini App');
            setEnvironmentInfo({
              isMiniApp: true,
              isExternalBrowser: false,
              isFarcaster: false,
              isBaseApp: true,
              environment: 'base',
              isLoading: false,
              userFid: context.user?.fid,
              clientFid: context.client?.clientFid?.toString()
            });
          } else if (isFarcaster) {
            console.log('✅ Environment detected: Farcaster Mini App');
            setEnvironmentInfo({
              isMiniApp: true,
              isExternalBrowser: false,
              isFarcaster: true,
              isBaseApp: false,
              environment: 'farcaster',
              isLoading: false,
              userFid: context.user?.fid,
              clientFid: context.client?.clientFid?.toString()
            });
          }
        } else {
          // Not in Mini App environment - external browser
          console.log('🌐 Environment detected: External browser');
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
  }, [context, isFrameReady]);

  return environmentInfo;
}
