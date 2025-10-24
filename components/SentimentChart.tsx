"use client";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import styles from '../app/page.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SentimentData {
  support: number;
  oppose: number;
  supportPercent: number;
  opposePercent: number;
}

interface SentimentChartProps {
  sentimentData: SentimentData | null;
  sentimentHistory: Array<{
    timestamp: number;
    support: number;
    oppose: number;
    supportPercent: number;
    opposePercent: number;
  }>;
}

export default function SentimentChart({ sentimentData, sentimentHistory }: SentimentChartProps) {
  const chartData = {
    labels: sentimentHistory.map((_, index) => ''),
    datasets: [
      {
        label: 'Support',
        data: sentimentHistory.map(data => data.supportPercent),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Oppose',
        data: sentimentHistory.map(data => data.opposePercent),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  return (
    <div className={styles.compactGraph}>
      <div className={styles.graphHeader}>
        <h3 className={styles.graphTitle}>Live Sentiment</h3>
        {sentimentData && (
          <div className={styles.sentimentStats}>
            <span className={styles.supportStat}>
              Support: {sentimentData.supportPercent}%
            </span>
            <span className={styles.opposeStat}>
              Oppose: {sentimentData.opposePercent}%
            </span>
          </div>
        )}
      </div>
      <div className={styles.chartContainer}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
