"use client";
import { useState, useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { detectEnvironmentFallback, detectEnvironmentFromMiniKit } from '../lib/environment-detection';

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
  const { context, isMiniAppReady } = useMiniKit();
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>({
    isMiniApp: false,
    isExternalBrowser: true,
    isFarcaster: false,
    isBaseApp: false,
    environment: 'external',
    isLoading: true
  });

  useEffect(() => {
    // Only run detection if we're still loading
    if (!environmentInfo.isLoading) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const detectEnvironment = () => {
      try {
        console.log('🔍 Environment detection: checking MiniKit context...');
        
        // If we have MiniKit context, use it
        if (context && context.client) {
          console.log('🎯 MiniKit context available:', {
            clientFid: context.client?.clientFid,
            userFid: context.user?.fid,
            isMiniAppReady
          });

          const miniKitDetectionResult = detectEnvironmentFromMiniKit(context);
          
          console.log('✅ Environment detected:', miniKitDetectionResult.environment, 'via', miniKitDetectionResult.method);
          
          const detectedEnv = {
            isMiniApp: miniKitDetectionResult.isMiniApp,
            isExternalBrowser: miniKitDetectionResult.isExternal,
            isFarcaster: miniKitDetectionResult.isFarcaster,
            isBaseApp: miniKitDetectionResult.isBaseApp,
            environment: miniKitDetectionResult.environment,
            isLoading: false,
            userFid: context.user?.fid?.toString(),
            clientFid: context.client?.clientFid?.toString()
          };
          
          setEnvironmentInfo(detectedEnv);
          return;
        }

        // If no context yet, set a timeout for fallback
        console.log('⏳ Waiting for MiniKit context...');
        
        timeoutId = setTimeout(() => {
          console.log('⏰ MiniKit context timeout, using fallback detection');
          const fallbackResult = detectEnvironmentFallback();
          const detectedEnv = {
            isMiniApp: fallbackResult.isMiniApp,
            isExternalBrowser: fallbackResult.isExternal,
            isFarcaster: fallbackResult.isFarcaster,
            isBaseApp: fallbackResult.isBaseApp,
            environment: fallbackResult.environment,
            isLoading: false
          };
          setEnvironmentInfo(detectedEnv);
        }, 2000); // 2 second timeout

      } catch (error) {
        console.log('⚠️ Environment detection failed, defaulting to external:', error);
        const fallbackResult = detectEnvironmentFallback();
        const detectedEnv = {
          isMiniApp: fallbackResult.isMiniApp,
          isExternalBrowser: fallbackResult.isExternal,
          isFarcaster: fallbackResult.isFarcaster,
          isBaseApp: fallbackResult.isBaseApp,
          environment: fallbackResult.environment,
          isLoading: false
        };
        setEnvironmentInfo(detectedEnv);
      }
    };

    detectEnvironment();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [context, isMiniAppReady, environmentInfo.isLoading]);

  return environmentInfo;
}
