'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from './Navbar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
        <Navbar />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Premium Light Footer */}
        <footer
          className="border-t py-10 mt-8"
          style={{
            borderColor: 'var(--border-soft)',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
              >
                S
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                © {new Date().getFullYear()}{' '}
                <span style={{ color: 'var(--text-primary)' }}>SENFUTOPROJECTS</span>
                {' '}— Built for Students & Lecturers.
              </span>
            </div>

            <div className="flex items-center gap-6">
              {['Privacy Policy', 'Terms of Service', 'Support'].map((label) => (
                <a
                  key={label}
                  href="#"
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--blue-primary)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
