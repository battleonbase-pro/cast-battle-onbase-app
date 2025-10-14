'use client';

import { useState, useEffect } from 'react';

interface ShareButtonProps {
  battleTopic: string;
  battleId: string;
  userAddress?: string;
  className?: string;
}

export default function ShareButton({ battleTopic, battleId, userAddress, className = '' }: ShareButtonProps) {
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
      const response = await fetch(`/api/share/reward?userAddress=${userAddress}&battleId=${battleId}&platform=twitter`);
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
          platform: 'twitter'
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
        
        console.log('Share reward awarded:', data.message);
      } else {
        console.log('Share reward error:', data.error);
      }
    } catch (error) {
      console.error('Error awarding share points:', error);
    }
  };

  const generateShareText = (topic: string) => {
    // Create compelling share text based on the topic
    const baseText = `🔥 Join the debate: "${topic}"`;
    
    // Dynamic call-to-action based on topic keywords
    let callToAction = `\n\n💬 Share your perspective and earn points!\n🏆 Compete with others in this AI-powered debate\n\n`;
    
    if (topic.toLowerCase().includes('crypto') || topic.toLowerCase().includes('bitcoin')) {
      callToAction = `\n\n💰 Crypto experts needed! Share your insights and earn rewards\n🏆 Join the debate and compete for the top spot\n\n`;
    } else if (topic.toLowerCase().includes('ai') || topic.toLowerCase().includes('artificial')) {
      callToAction = `\n\n🤖 AI enthusiasts unite! Share your thoughts and earn points\n🏆 Compete in this cutting-edge debate\n\n`;
    } else if (topic.toLowerCase().includes('trump') || topic.toLowerCase().includes('politics')) {
      callToAction = `\n\n🗳️ Political minds needed! Share your views and earn rewards\n🏆 Join the debate and make your voice heard\n\n`;
    }
    
    const hashtags = `#NewsDebate #AI #Debate #Crypto #Blockchain #Base`;
    const url = `https://news-debate-app-733567590021.us-central1.run.app`;
    
    return `${baseText}${callToAction}${hashtags}\n\n${url}`;
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      const shareText = generateShareText(battleTopic);
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      
      // Open Twitter in a new window
      const twitterWindow = window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      
      // Track share event and award points
      if (userAddress && canShare) {
        // Award points immediately (trust-based system)
        await awardSharePoints();
      }
      
      // Track share event (optional)
      console.log('Share event:', { battleId, topic: battleTopic, userAddress });
      
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={isSharing || !canShare || !userAddress}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          transition-colors duration-200
          ${!userAddress 
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
            : hasShared 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white'
          }
          ${className}
        `}
        title={
          !userAddress 
            ? "Please connect your wallet to share" 
            : hasShared 
              ? "You've already shared this battle" 
              : "Share this debate on X (Twitter)"
        }
      >
        {isSharing ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sharing...
          </>
        ) : hasShared ? (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Shared ✓
          </>
        ) : (
          <>
            <img 
              src="/x-square.svg" 
              alt="X (Twitter)" 
              className="w-4 h-4"
            />
            Share on X (+20 pts)
          </>
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
