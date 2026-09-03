import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Vote, Lock, Mail, AlertCircle, ArrowRight, RefreshCw, CheckCircle2, HelpCircle } from 'lucide-react';

export default function LoginPage() {
  const { signIn, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const from = location.state?.from?.pathname || '/polls';

  const isEmailNotConfirmed = error && error.toLowerCase().includes('email not confirmed');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendStatus('');
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address above first.');
      return;
    }
    setResending(true);
    setResendStatus('');
    try {
      await resendConfirmationEmail(email.trim());
      setResendStatus('Verification email sent! Check your inbox and spam folder.');
    } catch (err) {
      console.error('Resend error:', err);
      setResendStatus('Failed to resend email: ' + (err.message || 'Please try again.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 sm:p-10 shadow-sm space-y-6 transition-colors">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-100 dark:shadow-none">
            <Vote className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Sign in to Ballot.io
          </h2>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Access your voter ballot and monitor active elections.
          </p>
        </div>

        {/* Email Not Confirmed Specific Alert */}
        {isEmailNotConfirmed ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3">
            <div className="flex items-start space-x-2.5 text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold block">Email Confirmation Required</span>
                <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                  Your Supabase project currently has email verification enabled. You must confirm your email before signing in.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/60 flex flex-col space-y-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Confirmation Link...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Resend Confirmation Email</span>
                  </>
                )}
              </button>

              {resendStatus && (
                <div className="p-2 bg-white/80 dark:bg-gray-900/80 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  {resendStatus}
                </div>
              )}
            </div>

            {/* Quick Developer Tip */}
            <div className="p-2.5 bg-amber-100/60 dark:bg-amber-900/30 rounded-xl text-[11px] text-amber-900 dark:text-amber-300 flex items-start space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Quick Fix in Supabase:</strong> In your Supabase Dashboard, go to <em>Authentication &gt; Providers &gt; Email</em> and turn off <strong>"Confirm email"</strong> to allow instant logins without confirmation.
              </span>
            </div>
          </div>
        ) : (
          error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="voter@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl py-2.5 pl-9 pr-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
              />
              <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl py-2.5 pl-9 pr-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 dark:shadow-none disabled:opacity-50 transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
