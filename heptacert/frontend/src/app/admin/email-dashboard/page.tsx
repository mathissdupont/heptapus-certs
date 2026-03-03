'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function EmailDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    templates: 0,
    scheduled: 0,
    webhooks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch stats from various endpoints
        const [templatesRes, webhooksRes] = await Promise.all([
          apiFetch('/system/email-templates'),
          apiFetch('/admin/webhooks'),
        ]);

        const templatesData = await templatesRes.json();
        setStats(s => ({ ...s, templates: Array.isArray(templatesData) ? templatesData.length : 0 }));

        const webhooksData = await webhooksRes.json();
        setStats(s => ({ ...s, webhooks: Array.isArray(webhooksData) ? webhooksData.length : 0 }));
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const features = [
    {
      title: '⚙️ SMTP Settings',
      description: 'Configure your email server (Gmail, Outlook, custom SMTP)',
      href: '/admin/email-settings',
      color: 'from-blue-500 to-blue-600',
      icon: '🔧',
      stats: 'Test & Verify'
    },
    {
      title: '📧 Email Templates',
      description: 'Create and manage email templates with live preview',
      href: '/admin/events',
      color: 'from-purple-500 to-purple-600',
      icon: '📝',
      stats: `${stats.templates} templates`
    },
    {
      title: '📅 Schedule Emails',
      description: 'Send emails immediately, at a specific time, or on schedule (cron)',
      href: '/admin/events',
      color: 'from-green-500 to-green-600',
      icon: '⏰',
      stats: 'Multiple trigger modes'
    },
    {
      title: '📊 Analytics & Delivery',
      description: 'Track email delivery status, open rates, and bounce rates',
      href: '/admin/email-analytics',
      color: 'from-orange-500 to-orange-600',
      icon: '📈',
      stats: 'Real-time tracking'
    },
    {
      title: '🪝 Webhooks',
      description: 'Subscribe to email events and integrate with external systems',
      href: '/admin/webhooks',
      color: 'from-red-500 to-red-600',
      icon: '🔗',
      stats: `${stats.webhooks} active webhooks`
    },
    {
      title: '📬 Unsubscribe',
      description: 'Attendees can opt-out from bulk emails',
      href: '#',
      color: 'from-gray-600 to-gray-700',
      icon: '✋',
      stats: 'Token-based system',
      disabled: true
    }
  ];

  return (
    <div className="min-h-screen p-6 dark:bg-gray-950">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">📧 Email System Dashboard</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
          Unified email marketing platform with SMTP configuration, scheduling, analytics, and webhooks integration.
        </p>
      </div>

      {/* Stats Row */}
      <div className="max-w-7xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.templates}</div>
          <p className="text-gray-600 dark:text-gray-400">Email Templates</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">∞</div>
          <p className="text-gray-600 dark:text-gray-400">Scheduled Jobs</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.webhooks}</div>
          <p className="text-gray-600 dark:text-gray-400">Active Webhooks</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                feature.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Link href={feature.disabled ? '#' : feature.href}>
                <div className={`bg-gradient-to-br ${feature.color} h-32 flex flex-col justify-between p-6 text-white`}>
                  <div className="text-4xl">{feature.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold">{feature.title}</h3>
                  </div>
                </div>
              </Link>
              
              <div className="bg-white dark:bg-gray-800 p-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{feature.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{feature.stats}</span>
                  {!feature.disabled && (
                    <Link href={feature.href} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-semibold">
                      Open →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-8">
          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-4">🚀 Quick Start Guide</h3>
          <ol className="text-blue-800 dark:text-blue-300 space-y-2 list-decimal list-inside">
            <li><strong>Step 1:</strong> Go to <Link href="/admin/email-settings" className="text-blue-600 dark:text-blue-400 hover:underline">SMTP Settings</Link> to configure your email server</li>
            <li><strong>Step 2:</strong> Click "Test Connection" to verify your SMTP credentials work</li>
            <li><strong>Step 3:</strong> Go to an event and create an email template with <Link href="/admin/events" className="text-blue-600 dark:text-blue-400 hover:underline">preview</Link></li>
            <li><strong>Step 4:</strong> <Link href="/admin/events" className="text-blue-600 dark:text-blue-400 hover:underline">Schedule emails</Link> to send immediately or on a schedule (cron)</li>
            <li><strong>Step 5:</strong> Monitor delivery with <Link href="/admin/email-analytics" className="text-blue-600 dark:text-blue-400 hover:underline">analytics</Link> dashboard</li>
            <li><strong>Step 6:</strong> Set up <Link href="/admin/webhooks" className="text-blue-600 dark:text-blue-400 hover:underline">webhooks</Link> to integrate with Slack, Zapier, etc.</li>
          </ol>
        </div>
      </div>

      {/* Supported Events */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">🔔 Webhook Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <p className="font-semibold text-green-700 dark:text-green-400">email.sent</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Triggered when an email is successfully delivered</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4 py-2">
              <p className="font-semibold text-red-700 dark:text-red-400">email.failed</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Triggered when an email delivery fails</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4 py-2">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">email.bounced</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Triggered when recipient bounces email</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-semibold text-blue-700 dark:text-blue-400">email.opened</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Triggered when recipient opens email</p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="max-w-7xl mx-auto mt-12 mb-12">
        <div className="bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 to-blue-50 dark:to-blue-900/20 rounded-lg p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">💡 Technology Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Email</p>
              <p className="text-gray-600 dark:text-gray-400">SMTP via aiosmtplib</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Scheduling</p>
              <p className="text-gray-600 dark:text-gray-400">APScheduler (cron/datetime)</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Webhooks</p>
              <p className="text-gray-600 dark:text-gray-400">HMAC-SHA256 signatures</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Tracking</p>
              <p className="text-gray-600 dark:text-gray-400">PostgreSQL + Delivery logs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
