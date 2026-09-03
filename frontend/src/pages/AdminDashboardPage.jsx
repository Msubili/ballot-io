import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import { formatDate } from '../utils/helpers';
import {
  Shield,
  Plus,
  Trash2,
  BarChart2,
  Vote,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  X,
  PlusCircle,
  MinusCircle,
  Radio,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, profile } = useAuth();

  const [stats, setStats] = useState({
    totalPolls: 0,
    livePolls: 0,
    completedElections: 0,
    totalVotes: 0,
  });

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    category: 'General',
    status: 'Live',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    options: ['', ''],
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete confirmation
  const [pollToDelete, setPollToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch polls
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select(`
          *,
          poll_options(id),
          votes(id)
        `)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      const formattedPolls = (pollsData || []).map((p) => ({
        ...p,
        vote_count: p.votes ? p.votes.length : 0,
        option_count: p.poll_options ? p.poll_options.length : 0,
      }));

      setPolls(formattedPolls);

      // 2. Compute stats
      const total = formattedPolls.length;
      const live = formattedPolls.filter((p) => p.status === 'Live').length;
      const closed = formattedPolls.filter((p) => p.status === 'Closed').length;
      const totalVotesCast = formattedPolls.reduce((sum, p) => sum + p.vote_count, 0);

      setStats({
        totalPolls: total,
        livePolls: live,
        completedElections: closed,
        totalVotes: totalVotesCast,
      });
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Option Add / Remove in Create Form
  const handleAddOption = () => {
    if (newPoll.options.length < 8) {
      setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });
    }
  };

  const handleRemoveOption = (index) => {
    if (newPoll.options.length > 2) {
      const updated = newPoll.options.filter((_, i) => i !== index);
      setNewPoll({ ...newPoll, options: updated });
    }
  };

  const handleOptionChange = (index, value) => {
    const updated = [...newPoll.options];
    updated[index] = value;
    setNewPoll({ ...newPoll, options: updated });
  };

  // Submit New Poll
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!newPoll.title.trim()) {
      setModalError('Poll title is required.');
      return;
    }

    if (new Date(newPoll.end_date) <= new Date(newPoll.start_date)) {
      setModalError('End date must be strictly later than start date.');
      return;
    }

    const filledOptions = newPoll.options.map((o) => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      setModalError('A minimum of 2 options is required.');
      return;
    }

    // Check duplicate options
    const uniqueOptions = new Set(filledOptions);
    if (uniqueOptions.size !== filledOptions.length) {
      setModalError('Option names must be unique within a poll.');
      return;
    }

    setModalSubmitting(true);
    try {
      // 1. Insert Poll
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert([
          {
            creator_id: user?.id,
            title: newPoll.title.trim(),
            description: newPoll.description.trim() || null,
            category: newPoll.category,
            status: newPoll.status,
            start_date: new Date(newPoll.start_date).toISOString(),
            end_date: new Date(newPoll.end_date).toISOString(),
          },
        ])
        .select()
        .single();

      if (pollError) throw pollError;

      // 2. Insert Options
      const optionsToInsert = filledOptions.map((optText, index) => ({
        poll_id: pollData.id,
        option_text: optText,
        position: index + 1,
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      // 3. Log to audit_log
      await supabase.from('audit_log').insert([
        {
          actor_id: user?.id,
          action: 'CREATE_POLL',
          entity_type: 'poll',
          entity_id: pollData.id,
          entity_label: pollData.title,
        },
      ]);

      // Reset & Refresh
      setIsCreateModalOpen(false);
      setNewPoll({
        title: '',
        description: '',
        category: 'General',
        status: 'Live',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        options: ['', ''],
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Error creating poll:', err);
      setModalError(err.message || 'Failed to create poll.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Poll
  const handleDeletePoll = async () => {
    if (!pollToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollToDelete.id);

      if (error) throw error;

      // Log deletion
      await supabase.from('audit_log').insert([
        {
          actor_id: user?.id,
          action: 'DELETE_POLL',
          entity_type: 'poll',
          entity_id: pollToDelete.id,
          entity_label: pollToDelete.title,
        },
      ]);

      setPollToDelete(null);
      fetchDashboardData();
    } catch (err) {
      console.error('Error deleting poll:', err);
      alert('Failed to delete poll: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Admin Governance Center
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Platform health, election administration, and audit controls.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 dark:shadow-none transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Poll</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Polls</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">{stats.totalPolls}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all categories</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Live</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">{stats.livePolls}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Accepting ballots now</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Votes Cast</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">{stats.totalVotes}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Verified records in DB</p>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Concluded</span>
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-3">{stats.completedElections}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Elections archived</p>
        </div>
      </div>

      {/* Polls Management Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Election Records</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage statuses and monitor participation.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading poll registry...</p>
          </div>
        ) : polls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Poll Title</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Options</th>
                  <th className="px-6 py-3.5">Votes</th>
                  <th className="px-6 py-3.5">End Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {polls.map((poll) => (
                  <tr key={poll.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                      {poll.title}
                    </td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={poll.category} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={poll.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">
                      {poll.option_count} options
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-bold">
                      {poll.vote_count}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {formatDate(poll.end_date)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/polls/${poll.id}/results`}
                        className="inline-flex p-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                        title="View Results"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setPollToDelete(poll)}
                        className="inline-flex p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        title="Delete Poll"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No polls created yet. Click "Create New Poll" to launch your first ballot!
          </div>
        )}
      </div>

      {/* CREATE POLL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 my-8 transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Poll</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure election dates, category, and options.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="mt-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Poll Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Student Council Presidential Election"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions, eligibility, or context..."
                  value={newPoll.description}
                  onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                  className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={newPoll.category}
                    onChange={(e) => setNewPoll({ ...newPoll, category: e.target.value })}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                  >
                    <option value="General">General</option>
                    <option value="Election">Election</option>
                    <option value="Community">Community</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={newPoll.status}
                    onChange={(e) => setNewPoll({ ...newPoll, status: e.target.value })}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                  >
                    <option value="Live">Live (Voting Open)</option>
                    <option value="Upcoming">Upcoming (Scheduled)</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newPoll.start_date}
                    onChange={(e) => setNewPoll({ ...newPoll, start_date: e.target.value })}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newPoll.end_date}
                    onChange={(e) => setNewPoll({ ...newPoll, end_date: e.target.value })}
                    className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Dynamic Options Section (2 - 8) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Ballot Options ({newPoll.options.length} of 8)
                  </label>
                  {newPoll.options.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center space-x-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {newPoll.options.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6">#{idx + 1}</span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${idx + 1} text`}
                        value={option}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                      />
                      {newPoll.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition shadow-sm"
                >
                  {modalSubmitting ? 'Creating Poll...' : 'Publish Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pollToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Poll Deletion</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
              Are you sure you want to delete <strong>"{pollToDelete.title}"</strong>? All associated options and votes will be permanently deleted. This action is irreversible.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setPollToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePoll}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
