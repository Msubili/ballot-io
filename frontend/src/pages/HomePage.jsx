import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import { formatTimeRemaining } from '../utils/helpers';
import { Vote, BarChart3, ShieldCheck, Clock, ArrowRight, CheckCircle2, Layers } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [livePolls, setLivePolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeaturedPolls() {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('*, poll_options(*)')
          .eq('status', 'Live')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!error && data) {
          setLivePolls(data);
        }
      } catch (err) {
        console.error('Error fetching live polls:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFeaturedPolls();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 via-white to-gray-50 pt-16 pb-20 border-b border-gray-200/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 rounded-full mb-6">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-xs font-semibold text-indigo-800">Ballot.io v1.0 • Supabase Backend</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Democratic Decisions Made <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
              Simple & Transparent
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            A unified digital voting system for student unions, communities, corporate governance, and general polls.
            Guaranteed one-vote-per-user integrity, automatic scheduling, and live real-time visual results.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/polls"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
            >
              <span>Explore Active Polls</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {!user ? (
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition shadow-sm"
              >
                Create Free Account
              </Link>
            ) : (
              <Link
                to="/admin"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition shadow-sm"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-200 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cryptographic & DB Integrity</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Every vote is cryptographically tied to user identity with database-level uniqueness constraints. Zero risk of duplicate voting.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-200 transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Real-time Results</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Powered by Supabase Realtime subscriptions. Live bar charts dynamically animate as votes are cast without manual page refreshes.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-200 transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Autonomous Lifecycles</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Polls transition automatically from Upcoming to Live to Closed based on strict timestamps. Voting controls seal instantly at cutoff.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Live Polls */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Active Live Elections</h2>
            <p className="text-sm text-gray-500 mt-1">Cast your ballot in currently running polls.</p>
          </div>
          <Link
            to="/polls"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
          >
            <span>View all polls</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-3 text-sm text-gray-500">Loading polls...</p>
          </div>
        ) : livePolls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {livePolls.map((poll) => (
              <div
                key={poll.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <CategoryBadge category={poll.category} />
                    <StatusBadge status={poll.status} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{poll.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{poll.description}</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    {formatTimeRemaining(poll.end_date)}
                  </span>
                  <div className="flex space-x-2">
                    <Link
                      to={`/polls/${poll.id}/results`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      Results
                    </Link>
                    <Link
                      to={`/polls/${poll.id}/vote`}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                    >
                      Vote Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Layers className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800">No active polls right now</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Run the seed script in Supabase SQL editor or log in as admin to create your first election poll!
            </p>
            <Link
              to="/polls"
              className="inline-block mt-4 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              Browse All Polls
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
