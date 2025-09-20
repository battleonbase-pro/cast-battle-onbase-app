"use client";
import { useState, useEffect } from "react";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { Transaction } from "@coinbase/onchainkit/transaction";
import styles from "./page.module.css";

interface DebateTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  debatePoints: {
    Support: string[];
    Oppose: string[];
  };
}

export default function Home() {
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [battleCreated, setBattleCreated] = useState(false);

  useEffect(() => {
    fetchTopic();
  }, []);

  const fetchTopic = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news/trending-topics');
      const data = await response.json();
      
      if (data.success && data.topics && data.topics.length > 0) {
        setTopic(data.topics[0]);
      } else {
        setError('No topics available');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createBattle = async () => {
    if (!topic) return;
    
    try {
      const response = await fetch('/api/battle/create-battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      const data = await response.json();
      
      if (data.success) {
        setBattleCreated(true);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>🥊 Cast Battle</h1>
          <p className={styles.subtitle}>AI-powered daily debates with $BATTLE token rewards</p>
          <Wallet />
        </div>
      </header>

      <div className={styles.content}>
        {/* Token Balance Display */}
        <div className={styles.tokenSection}>
          <h2>Your $BATTLE Balance</h2>
          <div className={styles.balancePlaceholder}>
            <p>Connect your wallet to view your $BATTLE token balance</p>
            <p className={styles.balanceNote}>
              💡 $BATTLE tokens will be displayed here once you connect your Base wallet
            </p>
          </div>
        </div>

        {/* Battle Topic */}
        <div className={styles.battleSection}>
          <h2 className={styles.sectionTitle}>Today's Battle Topic</h2>
          
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>AI is curating today's battle topic...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              ⚠️ {error}
              <button onClick={fetchTopic} className={styles.retryBtn}>Retry</button>
            </div>
          )}

          {topic && !loading && !error && (
            <div className={styles.topicCard}>
              <div className={styles.topicHeader}>
                <h3>{topic.title}</h3>
                <div className={styles.topicMeta}>
                  <span className={styles.category}>{topic.category}</span>
                  <span className={styles.source}>Source: {topic.source}</span>
                </div>
              </div>

              <div className={styles.topicDescription}>
                <p>{topic.description}</p>
              </div>

              <div className={styles.debatePoints}>
                <div className={styles.debateSide}>
                  <h4>Support:</h4>
                  <ul>
                    {topic.debatePoints.Support.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.debateSide}>
                  <h4>Oppose:</h4>
                  <ul>
                    {topic.debatePoints.Oppose.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.topicActions}>
                {!battleCreated ? (
                  <button onClick={createBattle} className={styles.createBattleBtn}>
                    Create Battle
                  </button>
                ) : (
                  <div className={styles.battleCreated}>
                    <p>✅ Battle created successfully!</p>
                    <Transaction
                      transaction={{
                        to: "0x0000000000000000000000000000000000000000", // Placeholder
                        value: "0",
                        data: "0x",
                      }}
                      onSuccess={() => {
                        alert("Battle joined successfully!");
                      }}
                      onError={(error) => {
                        alert(`Transaction failed: ${error.message}`);
                      }}
                    >
                      Join Battle (50 BATTLE)
                    </Transaction>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}