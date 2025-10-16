'use client';

import { useState, useEffect } from 'react';

interface LinkedInShareButtonProps {
  battleTopic: string;
  battleId: string;
  userAddress?: string;
  className?: string;
}

export default function LinkedInShareButton({ battleTopic, battleId, userAddress, className = '' }: LinkedInShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [canShare, setCanShare] = useState(true);
  const [points, setPoints] = useState(0);
  const [showReward, setShowReward] = useState(false);

  // Check if user has already shared this battle
  useEffect(() => {
    if (userAddress && battleId) {
      checkShareStatus();
    }
  }, [userAddress, battleId]);

  const checkShareStatus = async () => {
    try {
      const response = await fetch(`/api/share/reward?userAddress=${userAddress}&battleId=${battleId}&platform=linkedin`);
      const data = await response.json();
      
      if (data.success) {
        setHasShared(data.hasShared);
        setCanShare(data.canShare);
      }
    } catch (error) {
      console.error('Error checking share status:', error);
    }
  };

  const awardSharePoints = async () => {
    if (!userAddress) return;

    try {
      const response = await fetch('/api/share/reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          battleId,
          platform: 'linkedin'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPoints(data.points);
        setHasShared(true);
        setCanShare(false);
        setShowReward(true);
        
        // Hide reward message after 3 seconds
        setTimeout(() => setShowReward(false), 3000);
        
        console.log('LinkedIn share reward awarded:', data.message);
      } else {
        console.log('LinkedIn share reward error:', data.error);
      }
    } catch (error) {
      console.error('Error awarding LinkedIn share points:', error);
    }
  };

  const generateLinkedInShareText = (topic: string) => {
    // Create professional share text for LinkedIn
    const baseText = `🔥 Professional Debate: "${topic}"`;
    
    // Professional call-to-action based on topic keywords
    let callToAction = `\n\n💼 Share your professional insights and earn points!\n🏆 Join this AI-powered debate platform\n\n`;
    
    if (topic.toLowerCase().includes('crypto') || topic.toLowerCase().includes('bitcoin')) {
      callToAction = `\n\n💰 Crypto professionals needed! Share your expertise and earn rewards\n🏆 Join the debate and showcase your knowledge\n\n`;
    } else if (topic.toLowerCase().includes('ai') || topic.toLowerCase().includes('artificial')) {
      callToAction = `\n\n🤖 AI professionals unite! Share your insights and earn points\n🏆 Compete in this cutting-edge professional debate\n\n`;
    } else if (topic.toLowerCase().includes('trump') || topic.toLowerCase().includes('politics')) {
      callToAction = `\n\n🗳️ Political professionals needed! Share your views and earn rewards\n🏆 Join the debate and contribute to the discussion\n\n`;
    }
    
    const hashtags = `#ProfessionalDebate #AI #Crypto #Blockchain #Base #Networking`;
    const url = `https://news-debate-app-733567590021.us-central1.run.app`;
    
    return `${baseText}${callToAction}${hashtags}\n\n${url}`;
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const shareText = generateLinkedInShareText(battleTopic);
      const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://news-debate-app-733567590021.us-central1.run.app')}&summary=${encodeURIComponent(shareText)}`;
      
      // Open LinkedIn in a new window
      const linkedinWindow = window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      
      // Track share event and award points
      if (userAddress && canShare && !hasShared) {
        // Award points immediately (trust-based system)
        await awardSharePoints();
      }
      
      // Track share event (optional)
      console.log('LinkedIn share event:', { battleId, topic: battleTopic, userAddress });
      
    } catch (error) {
      console.error('Error sharing to LinkedIn:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={isSharing || !userAddress}
        className={`
          ${!userAddress 
            ? 'bg-gray-400 cursor-not-allowed' 
            : hasShared 
              ? 'bg-blue-600 hover:bg-blue-700 opacity-75' 
              : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed'
          }
          ${className}
        `}
        title={
          !userAddress 
            ? "Please connect your wallet to share" 
            : hasShared 
              ? "Share this debate on LinkedIn (already received points)" 
              : "Share this debate on LinkedIn"
        }
      >
        {isSharing ? (
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <img 
            src="/x-square.svg" 
            alt="LinkedIn" 
            className="w-8 h-8"
          />
        )}
      </button>
      
      {/* Reward notification */}
      {showReward && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium animate-bounce">
          +20 points! 🎉
        </div>
      )}
    </div>
  );
}
