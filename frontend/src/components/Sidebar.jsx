import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  FolderKanban,
  FileText,
  Briefcase,
  Settings,
  GitBranch,
  BookOpen,
  Code2,
  Plus
} from 'lucide-react';

export default function Sidebar({
  githubUsername,
  githubData,
  upcomingCount,
  notesCount,
  classesList,
  reposList,
  onOpenAuth,
  onOpenAddClass
}) {
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }) =>
    `flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-extrabold transition-all border-2 ${
      isActive
        ? 'bg-[#f4b6c2] text-zinc-900 border-zinc-900 shadow-[3px_3px_0px_#18181b]'
        : 'text-zinc-700 hover:text-zinc-900 hover:bg-[#f4efe6] border-transparent'
    }`;

  return (
    <aside className="w-72 shrink-0 bg-[#faf6ee] border-r-2 border-zinc-900 flex flex-col justify-between min-h-screen select-none">
      {/* Top Brand & Primary Navigation */}
      <div className="p-5 flex flex-col gap-6">
        {/* Vintage Stamp Brand Header (Inspired by PABLO 19-20 mark) */}
        <div className="neo-card p-3.5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#f8de8c] border-2 border-dashed border-zinc-900 flex items-center justify-center text-zinc-900 font-mono font-extrabold text-base shadow-[2px_2px_0px_#18181b]">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-zinc-900">
                  PROMETHEUS
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-extrabold rounded-md bg-[#a3ebb1] border border-zinc-900 text-zinc-900">
                  2.0
                </span>
              </div>
              <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                STUDENT PLANNER
              </p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1.5">
          <div className="px-2 pb-1 text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
            Menu
          </div>
          <NavLink to="/" end className={navLinkClass}>
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 stroke-[2.2]" />
              Overview
            </span>
          </NavLink>

          <NavLink to="/calendar" className={navLinkClass}>
            <span className="flex items-center gap-2.5">
              <CalendarDays className="w-4 h-4 stroke-[2.2]" />
              Calendar
            </span>
            {upcomingCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold rounded-full bg-[#f8de8c] border-2 border-zinc-900 text-zinc-900">
                {upcomingCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/projects" className={navLinkClass}>
            <span className="flex items-center gap-2.5">
              <FolderKanban className="w-4 h-4 stroke-[2.2]" />
              Projects & Classes
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold rounded-full bg-white border-2 border-zinc-900 text-zinc-900">
              {(classesList?.length || 0) + (reposList?.length || 0)}
            </span>
          </NavLink>

          <NavLink to="/notes" className={navLinkClass}>
            <span className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 stroke-[2.2]" />
              Notes
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold rounded-full bg-white border-2 border-zinc-900 text-zinc-900">
              {notesCount}
            </span>
          </NavLink>

          <NavLink to="/ojt" className={navLinkClass}>
            <span className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 stroke-[2.2]" />
              OJT Practicum
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold rounded-full bg-[#a3ebb1] border-2 border-zinc-900 text-zinc-900">
              SOC
            </span>
          </NavLink>

          <NavLink to="/settings" className={navLinkClass}>
            <span className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 stroke-[2.2]" />
              Settings
            </span>
          </NavLink>
        </nav>

        {/* Pinned Classes */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
              My Classes ({classesList?.length || 0})
            </span>
            <button
              type="button"
              onClick={onOpenAddClass}
              className="w-6 h-6 rounded-lg bg-[#f8de8c] border-2 border-zinc-900 flex items-center justify-center text-zinc-900 hover:bg-[#f5d36b] shadow-[1px_1px_0px_#18181b]"
              title="Add a class or course"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
            {(classesList || []).map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => navigate(`/p/${encodeURIComponent(cls.name)}`)}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 bg-white hover:bg-[#a3ebb1] border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] transition-all text-left"
              >
                <span className="flex items-center gap-2 truncate">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                  <span className="truncate">{cls.name}</span>
                </span>
                {cls.code && (
                  <span className="px-1.5 py-0.5 rounded bg-[#faf6ee] border border-zinc-900 text-[9px] font-mono font-extrabold text-zinc-900 shrink-0">
                    {cls.code}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pinned GitHub Repos */}
        {(reposList || []).length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="px-2 text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
              GitHub Repos ({reposList.length})
            </div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
              {reposList.slice(0, 5).map((repo) => (
                <button
                  key={repo.id || repo.name}
                  type="button"
                  onClick={() => navigate(`/p/${encodeURIComponent(repo.name)}`)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-800 bg-white hover:bg-[#aee2f5] border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] transition-all text-left"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Code2 className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                    <span className="truncate">{repo.name}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-600 shrink-0">
                    {repo.language || 'Code'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom User / GitHub Account Card */}
      <div className="p-5 border-t-2 border-zinc-900 bg-[#f4efe6]">
        <button
          type="button"
          onClick={onOpenAuth}
          className="w-full neo-card neo-card-interactive p-3 flex items-center justify-between gap-3 text-left bg-white"
        >
          <div className="flex items-center gap-3 min-w-0">
            {githubData?.avatar_url ? (
              <img
                src={githubData.avatar_url}
                alt={githubUsername}
                className="w-9 h-9 rounded-full object-cover border-2 border-zinc-900 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#f8de8c] border-2 border-dashed border-zinc-900 flex items-center justify-center shrink-0 p-0.5 overflow-hidden">
                <img
                  src="/pfp.png"
                  alt="Default Profile"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-zinc-900 truncate">
                {githubUsername ? `Hi, ${githubUsername}` : 'Connect GitHub'}
              </div>
              <div className="text-[10px] font-mono font-bold text-zinc-500 truncate">
                {githubUsername
                  ? `${githubData?.public_repos ?? 0} repos synced`
                  : 'Click to sign in'}
              </div>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}
