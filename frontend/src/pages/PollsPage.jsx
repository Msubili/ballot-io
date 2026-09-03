import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';
import { formatDate, formatTimeRemaining } from '../utils/helpers';
import { Search, Filter, Vote, BarChart2, Calendar, AlertCircle } from 'lucide-react';

export default function PollsPage() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPolls = async () => {
    setLoading(true);
    try {
      // Trigger status transitions in DB
      await supabase.rpc('transition_poll_statuses').catch(() => {});

      let query = supabase
        .from('polls')
        .select(`
          *,
          poll_options (id, option_text, position)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setPolls(data || []);
    } catch (err) {
      console.error('Error loading polls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();

    // Subscribe to realtime updates on polls
    const channel = supabase
      .channel('public:polls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => {
        fetchPolls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter polls
  const filteredPolls = polls.filter((poll) => {
    const matchesStatus = statusFilter === 'All' || poll.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || poll.category === categoryFilter;
    const matchesSearch =
      poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (poll.description && poll.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Elections & Polls</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse upcoming, live, and concluded democratic ballots.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
            {['All', 'Live', 'Upcoming', 'Closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  statusFilter === status
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status === 'All' ? 'All Statuses' : status}
                {status === 'Live' && (
                  <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-48 appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-xs font-medium rounded-xl py-2.5 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="All">All Categories</option>
                <option value="General">General</option>
                <option value="Election">Election</option>
                <option value="Community">Community</option>
                <option value="Corporate">Corporate</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search polls by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-xl py-2.5 pl-9 pr-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Poll Cards Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-sm text-gray-500">Retrieving ballots from database...</p>
        </div>
      ) : filteredPolls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPolls.map((poll) => {
            const isLive = poll.status === 'Live';
            const isClosed = poll.status === 'Closed';
            const isUpcoming = poll.status === 'Upcoming';

            return (
              <div
                key={poll.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <CategoryBadge category={poll.category} />
                    <StatusBadge status={poll.status} />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2 hover:text-indigo-600 transition">
                    <Link to={`/polls/${poll.id}`}>{poll.title}</Link>
                  </h3>

                  <p className="text-xs text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                    {poll.description || 'No description provided for this poll.'}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Closes: {formatDate(poll.end_date)}</span>
                    </div>
                    {isLive && (
                      <div className="text-emerald-700 font-semibold">
                        ⏱ {formatTimeRemaining(poll.end_date)}
                      </div>
                    )}
                    {isUpcoming && (
                      <div className="text-amber-700 font-semibold">
                        Opens: {formatDate(poll.start_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/polls/${poll.id}/results`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-gray-700 hover:text-indigo-600 transition"
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span>View Results</span>
                  </Link>

                  {isLive && (
                    <Link
                      to={`/polls/${poll.id}/vote`}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                    >
                      <Vote className="w-4 h-4" />
                      <span>Cast Ballot</span>
                    </Link>
                  )}

                  {isUpcoming && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                      Voting Not Started
                    </span>
                  )}

                  {isClosed && (
                    <span className="text-xs font-medium text-gray-600 bg-gray-200/70 px-2.5 py-1 rounded-md">
                      Poll Concluded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No polls matched your criteria</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, status tabs, or category filters.
          </p>
          <button
            onClick={() => {
              setStatusFilter('All');
              setCategoryFilter('All');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
