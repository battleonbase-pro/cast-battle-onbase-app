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
    let timeoutId: NodeJS.Timeout;
    
    const detectEnvironment = async () => {
      try {
        console.log('🔍 Starting enhanced environment detection...');
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.log('⏰ Environment detection timeout, defaulting to external browser');
          setEnvironmentInfo({
            isMiniApp: false,
            isExternalBrowser: true,
            isFarcaster: false,
            isBaseApp: false,
            environment: 'external',
            isLoading: false
          });
        }, 5000); // 5 second timeout - much more reasonable
        
        // Immediate fallback detection - don't wait for MiniKit context
        if (typeof window !== 'undefined') {
          // Check if we're in Base App by looking at the URL or user agent
          const isBaseAppUrl = window.location.href.includes('base.app') || 
                             window.location.href.includes('miniapp') ||
                             window.location.hostname.includes('base') ||
                             window.location.search.includes('base') ||
                             document.referrer.includes('base.app');
          
          if (isBaseAppUrl) {
            console.log('🔍 Immediate detection: Base App Mini App detected via URL');
            clearTimeout(timeoutId);
            setEnvironmentInfo({
              isMiniApp: true,
              isExternalBrowser: false,
              isFarcaster: false,
              isBaseApp: true,
              environment: 'base',
              isLoading: false,
              userFid: undefined,
              clientFid: '309857' // Assume Base App ClientFID
            });
            return;
          }
          
          // Check for Farcaster Mini App
          const isFarcasterUrl = window.location.href.includes('farcaster.xyz') ||
                                window.location.href.includes('warpcast.com') ||
                                window.location.hostname.includes('farcaster') ||
                                document.referrer.includes('farcaster');
          
          if (isFarcasterUrl) {
            console.log('🔍 Immediate detection: Farcaster Mini App detected via URL');
            clearTimeout(timeoutId);
            setEnvironmentInfo({
              isMiniApp: true,
              isExternalBrowser: false,
              isFarcaster: true,
              isBaseApp: false,
              environment: 'farcaster',
              isLoading: false,
              userFid: undefined,
              clientFid: '9152' // Assume Farcaster ClientFID
            });
            return;
          }
          
          // Additional Base App detection - check for Base-specific features
          const hasBaseFeatures = window.ethereum?.isBase || 
                                window.ethereum?.isCoinbaseWallet ||
                                navigator.userAgent.includes('Base') ||
                                window.location.protocol === 'https:' && window.location.hostname.includes('base');
          
          if (hasBaseFeatures) {
            console.log('🔍 Immediate detection: Base App Mini App detected via features');
            clearTimeout(timeoutId);
            setEnvironmentInfo({
              isMiniApp: true,
              isExternalBrowser: false,
              isFarcaster: false,
              isBaseApp: true,
              environment: 'base',
              isLoading: false,
              userFid: undefined,
              clientFid: '309857'
            });
            return;
          }
        }

        // Wait for MiniKit context to be available for more precise detection
        if (!context || !context.client) {
          console.log('⏳ Waiting for MiniKit context for precise detection...', {
            hasContext: !!context,
            hasClient: !!context?.client,
            isMiniAppReady
          });
          
          // Set a shorter timeout for MiniKit context
          const miniKitTimeout = setTimeout(() => {
            console.log('⏰ MiniKit context timeout, using fallback detection');
            clearTimeout(timeoutId);
            setEnvironmentInfo({
              isMiniApp: false,
              isExternalBrowser: true,
              isFarcaster: false,
              isBaseApp: false,
              environment: 'external',
              isLoading: false
            });
          }, 2000); // 2 second timeout for MiniKit context
          
          return () => clearTimeout(miniKitTimeout);
        }

        // Clear timeout since we got context
        clearTimeout(timeoutId);

        // Use MiniKit context for precise detection
        const isBaseApp = context.client?.clientFid === 309857;
        const isFarcaster = context.client?.clientFid === 9152; // Updated with actual Farcaster ClientFID
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
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [context, isMiniAppReady]);

  return environmentInfo;
}
