'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from './Navbar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Navbar />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="border-t border-white/5 py-8 bg-neutral-950/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-neutral-500 text-xs gap-4">
            <div>
              &copy; {new Date().getFullYear()} Showcase Hub. Built for Students and Lecturers.
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white transition">Privacy Policy</a>
              <a href="#" className="hover:text-white transition">Terms of Service</a>
              <a href="#" className="hover:text-white transition">Support</a>
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
