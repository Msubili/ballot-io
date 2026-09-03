import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import { formatDate, formatTimeRemaining } from '../utils/helpers';
import { ArrowLeft, Calendar, Vote, BarChart2, CheckCircle2, Shield } from 'lucide-react';

export default function PollDetailPage() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPoll() {
      try {
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .select('*')
          .eq('id', id)
          .single();

        if (pollError) throw pollError;
        setPoll(pollData);

        const { data: optionsData, error: optionsError } = await supabase
          .from('poll_options')
          .select('*')
          .eq('poll_id', id)
          .order('position', { ascending: true });

        if (optionsError) throw optionsError;
        setOptions(optionsData || []);
      } catch (err) {
        console.error('Error fetching poll:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPoll();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading election details...</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Election Not Found</h2>
        <Link to="/polls" className="mt-3 inline-block text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          Return to Polls
        </Link>
      </div>
    );
  }

  const isLive = poll.status === 'Live';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 transition-colors">
      <Link
        to="/polls"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Polls</span>
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm transition-colors">
        <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3 mb-3">
            <CategoryBadge category={poll.category} />
            <StatusBadge status={poll.status} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {poll.title}
          </h1>

          {poll.description && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {poll.description}
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span>Starts: {formatDate(poll.start_date)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span>Ends: {formatDate(poll.end_date)}</span>
            </div>
          </div>
        </div>

        {/* Options List */}
        <div className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Registered Ballot Options:
          </h2>

          <div className="space-y-2.5">
            {options.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500">#{option.position}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{option.option_text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-gray-50 dark:bg-gray-850 px-6 sm:px-8 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <Link
            to={`/polls/${poll.id}/results`}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Inspect Results</span>
          </Link>

          {isLive ? (
            <Link
              to={`/polls/${poll.id}/vote`}
              className="inline-flex items-center space-x-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <Vote className="w-4 h-4" />
              <span>Cast Your Vote</span>
            </Link>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {poll.status === 'Upcoming' ? 'Voting begins on start date' : 'Voting has concluded'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
