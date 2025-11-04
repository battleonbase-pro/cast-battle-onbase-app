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
  // Ensure we have at least 2 data points for the chart to render lines
  // If only one point exists, duplicate it to create a visible line
  let chartHistory = sentimentHistory;
  
  // If we have current sentiment data but no history, create a baseline and current point
  if (sentimentHistory.length === 0 && sentimentData) {
    // Start from 50/50 baseline to show movement
    const baselinePoint = {
      timestamp: Date.now() - 1000,
      support: 0,
      oppose: 0,
      supportPercent: 50,
      opposePercent: 50
    };
    const currentPoint = {
      timestamp: Date.now(),
      support: sentimentData.support,
      oppose: sentimentData.oppose,
      supportPercent: sentimentData.supportPercent,
      opposePercent: sentimentData.opposePercent
    };
    chartHistory = [baselinePoint, currentPoint];
  } else if (sentimentHistory.length === 1) {
    // Add a baseline point before the single data point
    const baselinePoint = {
      timestamp: sentimentHistory[0].timestamp - 1000,
      support: 0,
      oppose: 0,
      supportPercent: 50,
      opposePercent: 50
    };
    chartHistory = [baselinePoint, sentimentHistory[0]];
  } else if (sentimentHistory.length === 0 && !sentimentData) {
    // No data at all - will show empty state
    chartHistory = [];
  }

  const chartData = {
    labels: chartHistory.map((_, index) => {
      if (chartHistory.length === 2 && index === 0) return 'Start';
      if (index === chartHistory.length - 1) return 'Now';
      return '';
    }),
    datasets: [
      {
        label: 'Support',
        data: chartHistory.map(data => data.supportPercent),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: chartHistory.length <= 2 ? 4 : 0,
        pointHoverRadius: 6,
      },
      {
        label: 'Oppose',
        data: chartHistory.map(data => data.opposePercent),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: chartHistory.length <= 2 ? 4 : 0,
        pointHoverRadius: 6,
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
        min: 0,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
          stepSize: 10,
        },
      },
      x: {
        display: chartHistory.length > 2, // Only show x-axis labels if we have multiple data points
        grid: {
          display: false,
        },
      },
    },
    elements: {
      point: {
        radius: chartHistory.length <= 2 ? 4 : 0, // Show points if only 2 data points
        hoverRadius: 6,
      },
      line: {
        borderWidth: 2,
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
      <div className={styles.chartContainer} style={{ minHeight: '200px', position: 'relative' }}>
        {chartHistory.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#666' }}>
            No sentiment data yet
          </div>
        )}
      </div>
    </div>
  );
}
