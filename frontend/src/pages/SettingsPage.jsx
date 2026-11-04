import React, { useState } from 'react';
import { GitBranch, Database, CheckCircle2, CloudUpload, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export default function SettingsPage({
  githubUsername,
  githubData,
  deadlines,
  classesList,
  notionPages,
  onOpenAuth,
  onResetLocalData
}) {
  const [syncStatus, setSyncStatus] = useState('');

  const handleSyncToSupabase = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSyncStatus('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env first.');
      return;
    }
    const uid = githubUsername || 'local_student';
    setSyncStatus('Syncing workspace to Supabase...');
    try {
      if (classesList?.length) {
        await supabase.from('projects').upsert(
          classesList.map((c) => ({
            id: c.id,
            user_id: uid,
            kind: 'class',
            name: c.name,
            code: c.code || '',
            description: c.description || ''
          }))
        );
      }
      if (deadlines?.length) {
        await supabase.from('tasks').upsert(
          deadlines.map((d) => ({
            id: d.id,
            user_id: uid,
            title: d.title,
            due_date: d.date,
            due_time: d.time || '11:59 PM',
            tag: d.category || 'LAB',
            done: Boolean(d.done)
          }))
        );
      }
      if (notionPages?.length) {
        await supabase.from('notes').upsert(
          notionPages.map((p) => ({
            id: p.id,
            user_id: uid,
            title: p.title,
            category: p.category || 'NOTE',
            content: p.content || ''
          }))
        );
      }
      setSyncStatus('Successfully synced classes, tasks, and notes to Supabase!');
    } catch (err) {
      setSyncStatus(`Sync failed: ${err.message || 'Check your Supabase tables'}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="neo-card p-6 bg-white">
        <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
          WORKSPACE CONFIGURATION
        </span>
        <h1 className="text-2xl font-extrabold text-zinc-900 mt-0.5">Settings & Cloud Sync</h1>
        <p className="text-xs font-semibold text-zinc-600 mt-1">
          Manage your connected GitHub account, Supabase Postgres cloud sync, and workspace data.
        </p>
      </div>

      {/* 1. GitHub Connection Card */}
      <div className="neo-card-sky p-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 neo-badge-seal flex items-center justify-center text-zinc-900 shadow-[2px_2px_0px_#18181b]">
            <GitBranch className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-zinc-900">GitHub Integration</h2>
            <p className="text-xs font-semibold text-zinc-700 mt-0.5">
              {githubUsername
                ? `Connected as @${githubUsername} (${githubData?.public_repos ?? 0} public repositories)`
                : 'Not connected yet. Connect your GitHub to import repositories and contribution stats.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAuth}
          className="neo-btn-butter px-4 py-2.5 text-xs"
        >
          {githubUsername ? 'Manage GitHub' : 'Connect GitHub'}
        </button>
      </div>

      {/* 2. Supabase Cloud Sync Card */}
      <div className="neo-card-mint p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 neo-badge-seal flex items-center justify-center text-zinc-900 shadow-[2px_2px_0px_#18181b]">
              <Database className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-zinc-900">Supabase Postgres Sync</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-white border-2 border-zinc-900 text-zinc-900">
                  {isSupabaseConfigured ? 'CONFIGURED' : 'LOCAL STORAGE MODE'}
                </span>
              </div>
              <p className="text-xs font-semibold text-zinc-700 mt-0.5">
                Sync your classes, deadlines, and notes to Supabase Postgres using{' '}
                <code className="font-mono font-bold underline">supabase_schema.sql</code>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncToSupabase}
            className="neo-btn-butter inline-flex items-center gap-1.5 px-4 py-2.5 text-xs"
          >
            <CloudUpload className="w-4 h-4" />
            Sync Workspace Now
          </button>
        </div>

        {syncStatus && (
          <div className="p-3.5 rounded-2xl bg-white border-2 border-zinc-900 text-xs font-mono font-bold text-zinc-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-zinc-900 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}
      </div>

      {/* 3. Reset Local Data */}
      <div className="neo-card p-6 flex items-center justify-between flex-wrap gap-4 bg-white">
        <div>
          <h2 className="text-base font-extrabold text-zinc-900">Reset Sample Workspace Data</h2>
          <p className="text-xs font-semibold text-zinc-600 mt-0.5">
            Restore default sample classes, deadlines, and notes in your browser storage.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetLocalData}
          className="neo-btn-white inline-flex items-center gap-1.5 px-4 py-2.5 text-xs text-[#e0533c]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Reset Local Data
        </button>
      </div>
    </div>
  );
}
