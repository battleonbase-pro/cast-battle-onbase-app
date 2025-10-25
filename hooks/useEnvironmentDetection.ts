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
    // Prevent multiple detection instances
    if (environmentInfo.isLoading === false) {
      console.log('🔍 Environment already detected, skipping');
      return;
    }

    let timeoutId: NodeJS.Timeout;
    
    const detectEnvironment = async () => {
      try {
        console.log('🔍 Starting environment detection...');
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log('⏰ Environment detection timeout, defaulting to external browser');
          const detectedEnv = {
            isMiniApp: false,
            isExternalBrowser: true,
            isFarcaster: false,
            isBaseApp: false,
            environment: 'external' as const,
            isLoading: false
          };
          setEnvironmentInfo(detectedEnv);
        }, 3000); // Reduced timeout to 3 seconds
        
        // Wait for MiniKit context - no immediate URL detection
        console.log('🔍 Waiting for MiniKit context for accurate detection...');

        // Wait for MiniKit context to be available
        if (!context || !context.client) {
          console.log('⏳ Waiting for MiniKit context...', {
            hasContext: !!context,
            hasClient: !!context?.client,
            isMiniAppReady
          });
          
          // Set a shorter timeout for MiniKit context
          const miniKitTimeout = setTimeout(() => {
            console.log('⏰ MiniKit context timeout, using fallback detection');
            clearTimeout(timeoutId);
            
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
          }, 2000); // 2 second timeout for MiniKit context
          
          return () => clearTimeout(miniKitTimeout);
        }

        // Clear timeout since we got context
        clearTimeout(timeoutId);

        // Use shared MiniKit detection logic for consistency
        const miniKitDetectionResult = detectEnvironmentFromMiniKit(context);
        
        console.log('🎯 MiniKit context detection:', {
          clientFid: context.client?.clientFid,
          userFid: context.user?.fid,
          launchLocation: context.location,
          detectionResult: miniKitDetectionResult
        });

        // Add environment validation and warnings
        const BASE_APP_CLIENT_FID = parseInt(process.env.NEXT_PUBLIC_BASE_APP_CLIENT_FID || '309857');
        const FARCASTER_CLIENT_FID = parseInt(process.env.NEXT_PUBLIC_FARCASTER_CLIENT_FID || '9152');
        
        if (miniKitDetectionResult.isBaseApp && !context.user?.fid) {
          console.warn('⚠️ Base App detected but no user FID available in MiniKit context');
        }
        if (miniKitDetectionResult.isFarcaster && !context.user?.fid) {
          console.warn('⚠️ Farcaster detected but no user FID available in MiniKit context');
        }
        if (context.client?.clientFid && ![BASE_APP_CLIENT_FID, FARCASTER_CLIENT_FID].includes(context.client.clientFid)) {
          console.warn('⚠️ Unknown ClientFID detected:', context.client.clientFid, 'Expected:', BASE_APP_CLIENT_FID, 'or', FARCASTER_CLIENT_FID);
        }

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
      } catch (error) {
        console.log('⚠️ Environment detection failed, defaulting to external:', error);
        const detectedEnv = {
          isMiniApp: false,
          isExternalBrowser: true,
          isFarcaster: false,
          isBaseApp: false,
          environment: 'external' as const,
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
  }, [context, isMiniAppReady]);

  return environmentInfo;
}
