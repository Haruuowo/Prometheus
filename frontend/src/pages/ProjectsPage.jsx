import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Code2, Plus, Trash2, GitBranch } from 'lucide-react';

export default function ProjectsPage({
  classesList,
  reposList,
  githubUsername,
  getRepoData,
  onOpenAddClass,
  onDeleteClass,
  onOpenAuth
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL'); // ALL | CLASSES | REPOS

  const combined = [
    ...(classesList || []).map((c) => ({ ...c, kind: 'class' })),
    ...(reposList || []).map((r) => ({ ...r, kind: 'repo' }))
  ].filter((item) => {
    if (filter === 'CLASSES') return item.kind === 'class';
    if (filter === 'REPOS') return item.kind === 'repo';
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="neo-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
        <div>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
            UNIFIED WORKSPACES
          </span>
          <h1 className="text-2xl font-extrabold text-zinc-900 mt-0.5">
            Projects & Classes ({combined.length})
          </h1>
          <p className="text-xs font-semibold text-zinc-600 mt-1">
            Click any course or GitHub repository to open its dedicated task board, deadline planner, and notes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onOpenAddClass}
            className="neo-btn-butter inline-flex items-center gap-1.5 px-4 py-2.5 text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add Class / Course
          </button>
          <button
            type="button"
            onClick={onOpenAuth}
            className="neo-btn-white inline-flex items-center gap-1.5 px-4 py-2.5 text-xs"
          >
            <GitBranch className="w-4 h-4" />
            {githubUsername ? `@${githubUsername}` : 'Connect GitHub Repos'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'ALL', label: `All (${(classesList?.length || 0) + (reposList?.length || 0)})` },
          { id: 'CLASSES', label: `Classes (${classesList?.length || 0})` },
          { id: 'REPOS', label: `GitHub Repos (${reposList?.length || 0})` }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-extrabold border-2 border-zinc-900 transition-all ${
              filter === tab.id
                ? 'bg-[#f4b6c2] text-zinc-900 shadow-[3px_3px_0px_#18181b]'
                : 'bg-white text-zinc-700 hover:bg-[#faf6ee]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards Grid (Sky Blue & Mint Pastel Cards with Circular Stamp Icon + Butter Button) */}
      {combined.length === 0 ? (
        <div className="neo-card p-12 text-center flex flex-col items-center gap-3 bg-white">
          <p className="text-base font-extrabold text-zinc-900">
            No classes or repositories in this view yet.
          </p>
          <p className="text-xs font-semibold text-zinc-600 max-w-md">
            Add your university courses (like CS301 or Calculus) or connect your GitHub account to manage all your project tasks in one place.
          </p>
          <div className="flex items-center gap-2.5 mt-2">
            <button
              type="button"
              onClick={onOpenAddClass}
              className="neo-btn-butter px-4 py-2.5 text-xs"
            >
              + Add a Class
            </button>
            <button
              type="button"
              onClick={onOpenAuth}
              className="neo-btn-white px-4 py-2.5 text-xs"
            >
              Connect GitHub
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {combined.map((item, idx) => {
            const pData = getRepoData(item.name);
            const todos = pData.todos || [];
            const pendingCount = todos.filter((t) => !t.done).length;
            const doneCount = todos.filter((t) => t.done).length;
            const nextTodo = todos.find((t) => !t.done);
            const isClass = item.kind === 'class';
            const cardColor = isClass
              ? 'neo-card-mint'
              : idx % 2 === 0
              ? 'neo-card-sky'
              : 'neo-card-cream';

            return (
              <div
                key={`${item.kind}_${item.id || item.name}`}
                onClick={() => navigate(`/p/${encodeURIComponent(item.name)}`)}
                className={`${cardColor} neo-card-interactive p-6 flex flex-col items-center text-center justify-between gap-4 cursor-pointer relative`}
              >
                {isClass && onDeleteClass && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClass(item.id);
                    }}
                    className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-white/80 hover:bg-white border border-zinc-900 text-zinc-700 hover:text-[#e0533c]"
                    title="Remove class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="w-16 h-16 neo-badge-seal flex items-center justify-center shadow-[2px_2px_0px_#18181b]">
                  {isClass ? (
                    <BookOpen className="w-7 h-7 text-zinc-900 stroke-[2.2]" />
                  ) : (
                    <Code2 className="w-7 h-7 text-zinc-900 stroke-[2.2]" />
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-700">
                    {isClass ? item.code || 'COURSE WORKSPACE' : `${item.language || 'CODE'} REPO`}
                  </span>
                  <h3 className="text-lg font-extrabold text-zinc-900 mt-1">
                    {item.name} *
                  </h3>
                  <p className="text-xs font-semibold text-zinc-700 mt-1 line-clamp-2">
                    {nextTodo
                      ? `Next: ${nextTodo.text}`
                      : doneCount > 0
                      ? `All ${doneCount} tasks completed!`
                      : item.description || 'Dedicated workspace for tasks, deadlines, and notes.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full neo-btn-butter py-2.5 text-xs font-extrabold"
                >
                  {pendingCount > 0 ? `Open (${pendingCount} Tasks)` : 'Open Workspace'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
