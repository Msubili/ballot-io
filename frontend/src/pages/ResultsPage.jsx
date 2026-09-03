import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import { formatDate } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BarChart2,
  Trophy,
  ArrowLeft,
  Users,
  RefreshCw,
  Radio,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function ResultsPage() {
  const { id } = useParams();
  const { theme } = useTheme();
  const [poll, setPoll] = useState(null);
  const [resultsData, setResultsData] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [winnerOption, setWinnerOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchResults = async () => {
    try {
      // 1. Fetch Poll
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', id)
        .single();

      if (pollError) throw pollError;
      setPoll(pollData);

      // 2. Fetch Options
      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', id)
        .order('position', { ascending: true });

      if (optionsError) throw optionsError;

      // 3. Fetch Votes
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', id);

      if (votesError) throw votesError;

      // Calculate totals
      const countMap = {};
      optionsData.forEach((opt) => {
        countMap[opt.id] = 0;
      });

      votesData?.forEach((v) => {
        if (countMap[v.option_id] !== undefined) {
          countMap[v.option_id] += 1;
        }
      });

      const total = votesData?.length || 0;
      setTotalVotes(total);

      let maxCount = -1;
      let topOption = null;

      const chartData = optionsData.map((opt) => {
        const count = countMap[opt.id] || 0;
        const percentage = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;

        if (count > maxCount && count > 0) {
          maxCount = count;
          topOption = { ...opt, vote_count: count, percentage };
        }

        return {
          id: opt.id,
          name: opt.option_text,
          position: opt.position,
          votes: count,
          percentage: percentage,
        };
      });

      setResultsData(chartData);
      setWinnerOption(topOption);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();

    // Setup Supabase Realtime listener on votes table for this specific poll
    const channel = supabase
      .channel(`results:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${id}`,
        },
        () => {
          fetchResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Compiling real-time ballot tallies...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Poll Not Found</h2>
        <Link to="/polls" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
          Return to All Polls
        </Link>
      </div>
    );
  }

  const isClosed = poll.status === 'Closed';
  const isDark = theme === 'dark';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 transition-colors">
      {/* Back Link */}
      <Link
        to="/polls"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Polls</span>
      </Link>

      {/* Poll Header Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <CategoryBadge category={poll.category} />
            <StatusBadge status={poll.status} />
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Live Sync Active</span>
            <button
              onClick={fetchResults}
              title="Refresh results"
              className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition ml-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {poll.title}
        </h1>

        {poll.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
            {poll.description}
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 dark:text-gray-500 block font-medium">Total Ballots Cast</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">{totalVotes}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500 block font-medium">Total Options</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">{resultsData.length}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500 block font-medium">Poll Opens</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1 block">{formatDate(poll.start_date)}</span>
          </div>
          <div>
            <span className="text-gray-400 dark:text-gray-500 block font-medium">Poll Concludes</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1 block">{formatDate(poll.end_date)}</span>
          </div>
        </div>
      </div>

      {/* Winner Banner (if poll is closed and winner exists) */}
      {isClosed && winnerOption && (
        <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-200">
                Official Winning Choice
              </span>
              <h3 className="text-2xl font-extrabold tracking-tight mt-0.5">
                {winnerOption.option_text}
              </h3>
              <p className="text-xs text-indigo-100 mt-1">
                Concluded with {winnerOption.vote_count} votes ({winnerOption.percentage}% of the total)
              </p>
            </div>
          </div>

          <div className="px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center font-bold text-lg">
            {winnerOption.percentage}%
          </div>
        </div>
      )}

      {/* Chart and Results Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-8 transition-colors">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vote Distribution</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time percentage breakdown and absolute counts.
          </p>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={resultsData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: isDark ? '#9CA3AF' : '#6B7280' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11, fill: isDark ? '#E5E7EB' : '#374151' }}
              />
              <Tooltip
                formatter={(val, name, item) => [
                  `${val}% (${item.payload.votes} votes)`,
                  'Share',
                ]}
                contentStyle={{
                  backgroundColor: isDark ? '#111827' : '#1E1B4B',
                  borderColor: isDark ? '#374151' : '#4338CA',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
                {resultsData.map((entry, index) => {
                  const isLeader = winnerOption && winnerOption.id === entry.id;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isLeader ? '#4F46E5' : isDark ? '#6366F1' : '#818CF8'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown Cards */}
        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Detailed Breakdown:
          </h3>

          {resultsData.map((item) => {
            const isWinner = winnerOption && winnerOption.id === item.id;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition ${
                  isWinner
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/40'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">#{item.position}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.name}</span>
                    {isWinner && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        {isClosed ? 'Winner' : 'Leader'}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-gray-900 dark:text-white">{item.percentage}%</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({item.votes} votes)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWinner ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-indigo-400 dark:bg-indigo-600'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card Footer */}
        {poll.status === 'Live' && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Voting is currently active.
            </span>
            <Link
              to={`/polls/${poll.id}/vote`}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              Cast Your Vote
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
