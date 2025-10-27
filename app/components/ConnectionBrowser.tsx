'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Connection = Database['public']['Tables']['connections']['Row'] & {
  concept_a?: { name: string };
  concept_b?: { name: string };
};

export default function ConnectionBrowser() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('connections')
        .select(
          `
          *,
          concept_a:concepts!connections_concept_a_id_fkey(name),
          concept_b:concepts!connections_concept_b_id_fkey(name)
        `
        )
        .eq('status', 'unrated')
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setConnections(data as any);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function rateConnection(connectionId: string, rating: 'bad' | 'good' | 'wow') {
    try {
      const supabase = createClient();

      // Update connection status
      await supabase
        .from('connections')
        .update({ status: 'rated', rated_at: new Date().toISOString() })
        .eq('id', connectionId);

      // Store rating
      await supabase.from('ratings').insert({
        connection_id: connectionId,
        rating,
      });

      // Remove from list
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch (err: any) {
      console.error('Failed to rate connection:', err);
      alert('Failed to save rating. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">Error loading connections: {error}</div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No unrated connections available</p>
          <p className="text-gray-400 text-sm mt-2">
            Check back later or run the generation script
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Rate Connections ({connections.length} remaining)
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {connections.map((connection) => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            onRate={rateConnection}
          />
        ))}
      </div>
    </div>
  );
}

interface ConnectionCardProps {
  connection: Connection;
  onRate: (id: string, rating: 'bad' | 'good' | 'wow') => void;
}

function ConnectionCard({ connection, onRate }: ConnectionCardProps) {
  const conceptA = (connection.concept_a as any)?.name || 'Unknown';
  const conceptB = (connection.concept_b as any)?.name || 'Unknown';

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
      {/* Concepts */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {conceptA}
        </span>
        <span className="text-gray-400">↔</span>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
          {conceptB}
        </span>
      </div>

      {/* Connection */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">Connection:</h3>
        <p className="text-gray-700">{connection.connection_text}</p>
      </div>

      {/* Explanation */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Explanation:</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {connection.explanation}
        </p>
      </div>

      {/* Rating Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onRate(connection.id, 'bad')}
          className="flex-1 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
        >
          👎 Bad
        </button>
        <button
          onClick={() => onRate(connection.id, 'good')}
          className="flex-1 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
        >
          👍 Good
        </button>
        <button
          onClick={() => onRate(connection.id, 'wow')}
          className="flex-1 px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
        >
          🤩 Wow
        </button>
      </div>
    </div>
  );
}
