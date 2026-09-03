import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import { formatDate, formatTimeRemaining } from '../utils/helpers';
import { Vote, CheckCircle, AlertTriangle, ArrowLeft, BarChart2, ShieldCheck, Lock } from 'lucide-react';

export default function VotePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [poll, setPoll] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [existingVote, setExistingVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [voteSuccess, setVoteSuccess] = useState(false);

  useEffect(() => {
    async function loadPollAndVoteStatus() {
      setLoading(true);
      setErrorMessage('');
      try {
        // 1. Fetch Poll
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .select('*')
          .eq('id', id)
          .single();

        if (pollError || !pollData) {
          throw new Error('Poll not found');
        }
        setPoll(pollData);

        // 2. Fetch Options
        const { data: optionsData, error: optionsError } = await supabase
          .from('poll_options')
          .select('*')
          .eq('poll_id', id)
          .order('position', { ascending: true });

        if (optionsError) throw optionsError;
        setOptions(optionsData || []);

        // 3. Check if user already voted on this poll
        if (user) {
          const { data: voteData, error: voteError } = await supabase
            .from('votes')
            .select('*, poll_options(option_text)')
            .eq('poll_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (voteData) {
            setHasVoted(true);
            setExistingVote(voteData);
          }
        }
      } catch (err) {
        console.error('Error fetching poll:', err);
        setErrorMessage(err.message || 'Failed to load poll details');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadPollAndVoteStatus();
    }
  }, [id, user]);

  const handleVoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOptionId) {
      setErrorMessage('Please select an option to cast your vote.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Try atomic RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('cast_vote', {
        p_poll_id: id,
        p_option_id: selectedOptionId,
      });

      if (rpcError) {
        // Fallback: standard table insert if RPC wasn't installed yet
        console.warn('RPC error, attempting direct insert:', rpcError);
        const { error: insertError } = await supabase.from('votes').insert([
          {
            poll_id: id,
            option_id: selectedOptionId,
            user_id: user.id,
          },
        ]);
        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('You have already cast a vote in this election.');
          }
          throw insertError;
        }
      }

      setVoteSuccess(true);
      setHasVoted(true);
    } catch (err) {
      console.error('Error casting vote:', err);
      setErrorMessage(err.message || 'Failed to submit your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm text-gray-500">Securing voting terminal...</p>
      </div>
    );
  }

  if (errorMessage && !poll) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Poll Error</h2>
        <p className="text-sm text-gray-600 mt-2">{errorMessage}</p>
        <Link
          to="/polls"
          className="mt-6 inline-flex items-center space-x-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Polls</span>
        </Link>
      </div>
    );
  }

  // If vote was just cast successfully
  if (voteSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 sm:p-10 shadow-lg shadow-emerald-50">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900">Ballot Cast Successfully!</h2>
          <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto leading-relaxed">
            Your vote has been cryptographically verified and recorded in the database. Thank you for participating!
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/polls/${id}/results`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
            >
              <BarChart2 className="w-4 h-4" />
              <span>View Live Results</span>
            </Link>

            <Link
              to="/polls"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
            >
              Browse Other Polls
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If user has already voted
  if (hasVoted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">You Have Already Voted</h2>
          <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto leading-relaxed">
            In accordance with Ballot.io's strict one-vote-per-user policy, each authenticated account can only cast one ballot per election.
          </p>

          {existingVote?.poll_options?.option_text && (
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200/80 inline-block text-left">
              <span className="text-xs text-gray-500 font-medium">Your Recorded Choice:</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {existingVote.poll_options.option_text}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/polls/${id}/results`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Inspect Election Results</span>
            </Link>

            <Link
              to="/polls"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
            >
              Return to Polls
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If poll is not Live
  if (poll.status !== 'Live') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-10 shadow-sm">
          <div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8" />
          </div>

          <StatusBadge status={poll.status} className="mb-4" />

          <h2 className="text-2xl font-bold text-gray-900">Voting is Sealed</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
            {poll.status === 'Upcoming'
              ? `This poll opens on ${formatDate(poll.start_date)}. Ballots cannot be cast until it goes live.`
              : `This election concluded on ${formatDate(poll.end_date)}. Voting has officially closed.`}
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to={`/polls/${id}/results`}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              View Results
            </Link>
            <Link
              to="/polls"
              className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition"
            >
              Back to Polls
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/polls"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Polls</span>
      </Link>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-3">
            <CategoryBadge category={poll.category} />
            <StatusBadge status={poll.status} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {poll.title}
          </h1>

          {poll.description && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              {poll.description}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
            <span>Closes: {formatDate(poll.end_date)}</span>
            <span className="font-semibold text-emerald-600">
              {formatTimeRemaining(poll.end_date)}
            </span>
          </div>
        </div>

        {/* Voting Form */}
        <form onSubmit={handleVoteSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Select Your Option (1 of {options.length}):
            </label>

            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = selectedOptionId === option.id;
                return (
                  <label
                    key={option.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-950' : 'text-gray-800'}`}>
                        {option.option_text}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-gray-400">
                      Option #{option.position}
                    </span>

                    <input
                      type="radio"
                      name="poll_option"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setSelectedOptionId(option.id)}
                      className="sr-only"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Your vote is unique, permanent, and confidential.</span>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedOptionId}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting Ballot...</span>
                </>
              ) : (
                <>
                  <Vote className="w-4 h-4" />
                  <span>Submit Ballot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
