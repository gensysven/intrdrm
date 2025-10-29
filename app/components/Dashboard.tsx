'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Dashboard() {
  const [stats, setStats] = useState({
    unratedCount: 0,
    ratedCount: 0,
    conceptCount: 0,
    avgScore: '—',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const supabase = createClient();

      // Fetch statistics
      const [unratedResult, ratedResult, conceptsResult, avgScoresResult] =
        await Promise.all([
          supabase
            .from('connections')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'unrated'),
          supabase
            .from('connections')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'rated'),
          supabase.from('concepts').select('*', { count: 'exact', head: true }),
          supabase.from('critic_evaluations').select('novelty, coherence, usefulness'),
        ]);

      const unratedCount = unratedResult.count || 0;
      const ratedCount = ratedResult.count || 0;
      const conceptCount = conceptsResult.count || 0;

      // Calculate average critic scores
      const scores = avgScoresResult.data || [];
      const avgScore =
        scores.length > 0
          ? (
              scores.reduce((sum, s) => sum + s.novelty + s.coherence + s.usefulness, 0) /
              (scores.length * 3)
            ).toFixed(1)
          : '—';

      setStats({ unratedCount, ratedCount, conceptCount, avgScore });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {/* Unrated Pool */}
      <StatCard
        label="Unrated Pool"
        value={stats.unratedCount}
        description="Connections awaiting rating"
        color="blue"
      />

      {/* Rated */}
      <StatCard
        label="Rated"
        value={stats.ratedCount}
        description="Connections you've rated"
        color="green"
      />

      {/* Concepts */}
      <StatCard
        label="Concepts"
        value={stats.conceptCount}
        description="Total concept pool"
        color="purple"
      />

      {/* Average Score */}
      <StatCard
        label="Avg Critic Score"
        value={stats.avgScore}
        description="Out of 10"
        color="orange"
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-4">
          <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-12"></div>
        </div>
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ label, value, description, color }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 w-full">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${colorClasses[color]}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-gray-400">{description}</div>
    </div>
  );
}
