import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PollsPage from './pages/PollsPage';
import PollDetailPage from './pages/PollDetailPage';
import VotePage from './pages/VotePage';
import ResultsPage from './pages/ResultsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { AuthGuard, AdminGuard } from './components/Guards';

export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/polls" element={<PollsPage />} />
          <Route path="/polls/:id" element={<PollDetailPage />} />
          <Route
            path="/polls/:id/vote"
            element={
              <AuthGuard>
                <VotePage />
              </AuthGuard>
            }
          />
          <Route path="/polls/:id/results" element={<ResultsPage />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminDashboardPage />
              </AdminGuard>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<PollsPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
