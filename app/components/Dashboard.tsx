import { createClient } from '@/lib/supabase/server';

export default async function Dashboard() {
  const supabase = await createClient();

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Unrated Pool */}
      <StatCard
        label="Unrated Pool"
        value={unratedCount}
        description="Connections awaiting rating"
        color="blue"
      />

      {/* Rated */}
      <StatCard
        label="Rated"
        value={ratedCount}
        description="Connections you've rated"
        color="green"
      />

      {/* Concepts */}
      <StatCard
        label="Concepts"
        value={conceptCount}
        description="Total concept pool"
        color="purple"
      />

      {/* Average Score */}
      <StatCard
        label="Avg Critic Score"
        value={avgScore}
        description="Out of 10"
        color="orange"
      />
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${colorClasses[color]}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-gray-400">{description}</div>
    </div>
  );
}
