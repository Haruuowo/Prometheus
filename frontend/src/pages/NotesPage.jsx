import React from 'react';
import { Plus, Save, Copy, Trash2 } from 'lucide-react';

export default function NotesPage({
  notionPages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onUpdatePage,
  onSyncPageToVault,
  pageSaveNotice
}) {
  const activePage = notionPages.find((p) => p.id === activePageId) || notionPages[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
      {/* Left Sidebar: Pages List */}
      <aside className="lg:col-span-3 neo-card p-5 flex flex-col gap-4 bg-white">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
            WORKSPACE PAGES
          </span>
          <button
            type="button"
            onClick={onCreatePage}
            className="neo-btn-butter inline-flex items-center gap-1 px-2.5 py-1 text-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            New Page
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {notionPages.map((pg) => {
            const isActive = pg.id === activePage?.id;
            return (
              <button
                key={pg.id}
                type="button"
                onClick={() => onSelectPage(pg.id)}
                className={`w-full text-left p-3 rounded-2xl border-2 border-zinc-900 transition-all ${
                  isActive
                    ? 'bg-[#f8de8c] text-zinc-900 shadow-[3px_3px_0px_#18181b]'
                    : 'bg-[#faf6ee] text-zinc-700 hover:bg-white'
                }`}
              >
                <div className="text-xs font-extrabold truncate">{pg.title}</div>
                <div className="text-[10px] font-mono font-bold text-zinc-500 mt-1">
                  {pg.category || 'NOTE'}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Main Document Editor */}
      {activePage && (
        <div className="lg:col-span-9 neo-card p-6 flex flex-col gap-4 bg-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <input
              type="text"
              value={activePage.title}
              onChange={(e) => onUpdatePage('title', e.target.value)}
              className="flex-1 min-w-[240px] neo-input text-base font-extrabold"
            />
            <div className="flex items-center gap-2">
              {pageSaveNotice && (
                <span className="px-2.5 py-1 rounded-full bg-[#a3ebb1] border-2 border-zinc-900 text-xs font-mono font-extrabold text-zinc-900">
                  {pageSaveNotice}
                </span>
              )}
              <button
                type="button"
                onClick={onSyncPageToVault}
                className="neo-btn-butter inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save to Vault
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(activePage.content)}
                className="neo-btn-white inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
              {notionPages.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeletePage(activePage.id)}
                  className="neo-btn-white inline-flex items-center gap-1 px-3 py-2 text-xs text-[#e0533c]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <textarea
            value={activePage.content}
            onChange={(e) => onUpdatePage('content', e.target.value)}
            placeholder="Write structured Markdown notes, lecture summaries, or project specs..."
            className="flex-1 min-h-[420px] w-full p-4 rounded-2xl bg-[#faf6ee] border-2 border-zinc-900 text-xs font-mono font-semibold text-zinc-900 leading-relaxed focus:outline-none focus:bg-white resize-y"
          />
        </div>
      )}
    </div>
  );
}
