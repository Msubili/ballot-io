import React from 'react';
import { Vote, Github, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Vote className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">
              Ballot.io <span className="text-gray-400 font-normal">| General-Purpose Online Voting System</span>
            </span>
          </div>

          <div className="flex items-center space-x-6 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database-Enforced 1-Vote Integrity</span>
            </span>
            <a
              href="https://github.com/Msubili/ballot-io"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 hover:text-gray-900 transition"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-6 pt-6 text-center text-xs text-gray-400">
          Built with React 18, Tailwind CSS & Supabase Backend • Kabarak University Department of Computer Science
        </div>
      </div>
    </footer>
  );
}
