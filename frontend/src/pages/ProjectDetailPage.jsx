import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Rocket,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  CalendarPlus,
  Save,
  BookOpen,
  Code2
} from 'lucide-react';
import DeployHub from '../components/DeployHub';

export default function ProjectDetailPage({
  githubUsername,
  githubData,
  classesList,
  getRepoData,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onPinTodoToCalendar,
  onChangeNotes,
  onSaveWorkspace
}) {
  const { projectName } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(projectName || '');

  const matchedClass = (classesList || []).find(
    (c) => c.name.toLowerCase() === decodedName.toLowerCase()
  );
  const matchedRepo = (githubData?.repos || []).find(
    (r) => r.name.toLowerCase() === decodedName.toLowerCase()
  );

  const isClass = Boolean(matchedClass && !matchedRepo);
  const project = matchedRepo ||
    matchedClass || {
      name: decodedName || 'Project',
      kind: 'repo',
      language: 'Workspace',
      description: 'Dedicated workspace for tracking tasks, deadlines, and notes.'
    };

  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoTag, setNewTodoTag] = useState(isClass ? 'LAB' : 'FEATURE');
  const [todoFilter, setTodoFilter] = useState('ALL');
  const [syncNotice, setSyncNotice] = useState('');
  const [repoActivity, setRepoActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showDeploy, setShowDeploy] = useState(false);

  const tagOptions = isClass
    ? ['LAB', 'EXAM', 'READING', 'PROJECT', 'NOTES']
    : ['FEATURE', 'BUG', 'DEPLOY', 'REFACTOR', 'DOCS'];

  const fetchRepoActivity = async () => {
    if (isClass || !githubUsername || !project.name) return;
    setActivityLoading(true);
    try {
      const res = await fetch(
        `/api/github/repo-activity?user=${encodeURIComponent(githubUsername)}&repo=${encodeURIComponent(project.name)}`
      );
      if (res.ok) {
        const data = await res.json();
        setRepoActivity(data);
      }
    } catch (e) {}
    setActivityLoading(false);
  };

  useEffect(() => {
    fetchRepoActivity();
  }, [project.name, githubUsername, isClass]);

  const repoData = getRepoData(project.name);
  const todos = repoData.todos || [];
  const notes = repoData.notes || '';
  const pendingCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;
  const progressPct = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0;

  const visibleTodos = todos.filter((t) => {
    if (todoFilter === 'PENDING') return !t.done;
    if (todoFilter === 'DONE') return t.done;
    return true;
  });

  const commitsList = repoActivity?.commits || [];
  const pullsList = repoActivity?.pulls || [];
  const gitFeed = repoActivity?.activity || [];

  const handleSubmitTodo = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    onAddTodo(project.name, newTodoText.trim(), newTodoTag);
    setNewTodoText('');
  };

  const handleTriggerSave = async () => {
    setSyncNotice('Saving...');
    await onSaveWorkspace(project.name, todos, notes);
    setSyncNotice('Saved!');
    setTimeout(() => setSyncNotice(''), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Top Workspace Banner */}
      <div
        className={`${
          isClass ? 'neo-card-mint' : 'neo-card-sky'
        } p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 neo-badge-seal flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#18181b]">
            {isClass ? (
              <BookOpen className="w-6 h-6 text-zinc-900 stroke-[2.2]" />
            ) : (
              <Code2 className="w-6 h-6 text-zinc-900 stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider bg-white border-2 border-zinc-900 text-zinc-900">
                {isClass ? `CLASS // ${project.code || 'COURSE'}` : `REPO // ${project.language || 'CODE'}`}
              </span>
              {syncNotice && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-[#f8de8c] border-2 border-zinc-900 text-zinc-900">
                  {syncNotice}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 mt-1">{project.name}</h1>
            <p className="text-xs font-semibold text-zinc-700 mt-0.5">
              {project.description || 'Manage tasks, schedule deadlines, and keep structured notes.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="neo-btn-white inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Projects
          </button>

          {!isClass && githubUsername && (
            <>
              <a
                href={project.html_url || `https://github.com/${githubUsername}/${project.name}`}
                target="_blank"
                rel="noreferrer"
                className="neo-btn-white inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
              >
                GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowDeploy(true)}
                className="neo-btn-butter inline-flex items-center gap-1.5 px-4 py-2 text-xs"
              >
                <Rocket className="w-3.5 h-3.5" />
                Deploy
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Progress & Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="neo-card p-4 flex flex-col justify-between gap-2 bg-white">
          <div className="flex items-center justify-between text-[10px] font-mono font-extrabold uppercase text-zinc-500">
            <span>TASK PROGRESS</span>
            <span className="text-zinc-900">{progressPct}%</span>
          </div>
          <div className="text-xl font-extrabold text-zinc-900">
            {doneCount} / {todos.length} Completed
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#faf6ee] border-2 border-zinc-900 overflow-hidden">
            <div
              className="h-full bg-[#a3ebb1] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="neo-card p-4 flex flex-col justify-between gap-1 bg-white">
          <div className="flex items-center justify-between text-[10px] font-mono font-extrabold uppercase text-zinc-500">
            <span>PENDING ITEMS</span>
            <span className="px-2 py-0.5 rounded bg-[#f8de8c] border border-zinc-900 text-zinc-900">
              ACTIVE
            </span>
          </div>
          <div className="text-xl font-extrabold text-zinc-900">{pendingCount} Tasks Left</div>
          <div className="text-xs font-semibold text-zinc-600">
            Click &ldquo;Schedule&rdquo; on any task to pin it to your Calendar
          </div>
        </div>

        <div className="neo-card p-4 flex flex-col justify-between gap-1 bg-white">
          <div className="flex items-center justify-between text-[10px] font-mono font-extrabold uppercase text-zinc-500">
            <span>{isClass ? 'COURSE CODE' : 'RECENT GITHUB ACTIVITY'}</span>
            <span className="px-2 py-0.5 rounded bg-[#aee2f5] border border-zinc-900 text-zinc-900">
              {isClass ? project.code || 'CLASS' : `${pullsList.length} PRs`}
            </span>
          </div>
          <div className="text-xl font-extrabold text-zinc-900">
            {isClass ? project.code || 'Active Course' : `${commitsList.length} Recent Commits`}
          </div>
          <div className="text-xs font-semibold text-zinc-600">
            {isClass
              ? 'Use the scratchpad to store syllabus & lecture notes'
              : `Default branch: ${project.default_branch || 'main'}`}
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Task Board */}
        <div className="lg:col-span-6 neo-card p-6 flex flex-col gap-4 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
                ACTION BOARD
              </span>
              <h2 className="text-lg font-extrabold text-zinc-900">To-Do List</h2>
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: 'ALL', label: `All (${todos.length})` },
                { id: 'PENDING', label: `Pending (${pendingCount})` },
                { id: 'DONE', label: `Done (${doneCount})` }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTodoFilter(f.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-extrabold border-2 border-zinc-900 ${
                    todoFilter === f.id ? 'bg-[#f8de8c] text-zinc-900' : 'bg-[#faf6ee] text-zinc-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmitTodo}
            className="flex flex-col gap-2.5 pb-4 border-b-2 border-zinc-900/15"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-extrabold text-zinc-500 mr-1">TAG:</span>
              {tagOptions.map((tKey) => (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => setNewTodoTag(tKey)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-extrabold border-2 border-zinc-900 transition-colors ${
                    newTodoTag === tKey
                      ? 'bg-[#f4b6c2] text-zinc-900 shadow-[2px_2px_0px_#18181b]'
                      : 'bg-[#faf6ee] text-zinc-700 hover:bg-white'
                  }`}
                >
                  {tKey}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder={`Add a ${newTodoTag.toLowerCase()} task for ${project.name}...`}
                className="flex-1 neo-input text-xs"
              />
              <button
                type="submit"
                className="neo-btn-butter px-4 py-2.5 text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Add Task
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-0.5">
            {visibleTodos.length === 0 ? (
              <div className="py-10 text-center text-xs font-bold text-zinc-500">
                No tasks in this view yet. Add your next assignment or milestone above.
              </div>
            ) : (
              visibleTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#faf6ee] border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b] ${
                    todo.done ? 'opacity-60' : ''
                  }`}
                >
                  <div
                    onClick={() => onToggleTodo(project.name, todo.id)}
                    className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 border-zinc-900 flex items-center justify-center shrink-0 ${
                        todo.done ? 'bg-[#a3ebb1] text-zinc-900' : 'bg-white'
                      }`}
                    >
                      {todo.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-[#f8de8c] border border-zinc-900 text-zinc-900 shrink-0">
                      {todo.tag || 'TASK'}
                    </span>
                    <span
                      className={`text-xs font-extrabold truncate ${
                        todo.done ? 'line-through text-zinc-500' : 'text-zinc-900'
                      }`}
                    >
                      {todo.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onPinTodoToCalendar(project.name, todo);
                        setSyncNotice('Pinned to Calendar');
                        setTimeout(() => setSyncNotice(''), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-[#f8de8c] border-2 border-zinc-900 text-[11px] font-extrabold text-zinc-900"
                      title="Pin task to Calendar"
                    >
                      <CalendarPlus className="w-3 h-3" />
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTodo(project.name, todo.id)}
                      className="p-1 text-zinc-500 hover:text-[#e0533c]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Notes + Optional GitHub Commits/PRs */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Notes & Scratchpad */}
          <div className="neo-card p-6 flex flex-col gap-4 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
                  DOCUMENTATION & LECTURE NOTES
                </span>
                <h2 className="text-lg font-extrabold text-zinc-900">Workspace Notes</h2>
              </div>

              <button
                type="button"
                onClick={handleTriggerSave}
                className="neo-btn-butter inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save Notes
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(e) => onChangeNotes(project.name, e.target.value)}
              rows={9}
              placeholder={`Write lecture notes, architecture plans, key formulas, or commands for ${project.name}...`}
              className="w-full p-4 rounded-2xl bg-[#faf6ee] border-2 border-zinc-900 text-xs font-mono font-semibold text-zinc-900 leading-relaxed focus:outline-none focus:bg-white resize-y"
            />
          </div>

          {/* Live GitHub Commits & PRs */}
          {!isClass && githubUsername && (
            <div className="neo-card p-6 flex flex-col gap-4 bg-white">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
                    GITHUB TELEMETRY
                  </span>
                  <h2 className="text-base font-extrabold text-zinc-900">
                    Recent Pushes & Pull Requests
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={fetchRepoActivity}
                  disabled={activityLoading}
                  className="neo-btn-white inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin' : ''}`} />
                  {activityLoading ? 'Syncing...' : 'Refresh'}
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-0.5">
                {gitFeed.length === 0 ? (
                  <div className="py-6 text-center text-xs font-bold text-zinc-500">
                    No recent commit or pull request activity loaded yet.
                  </div>
                ) : (
                  gitFeed.map((item) => {
                    const isPR = item.type?.startsWith('PR');
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[#faf6ee] border-2 border-zinc-900"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold border border-zinc-900 shrink-0 ${
                              isPR ? 'bg-[#f4b6c2] text-zinc-900' : 'bg-[#a3ebb1] text-zinc-900'
                            }`}
                          >
                            {item.type}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-zinc-900 truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] font-mono font-bold text-zinc-600 mt-0.5">
                              {item.subtitle} • {item.date}
                            </div>
                          </div>
                        </div>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white border-2 border-zinc-900 text-[10px] font-mono font-extrabold text-zinc-900 hover:bg-[#f8de8c] shrink-0"
                        >
                          {item.sha}
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deploy Modal */}
      {showDeploy && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowDeploy(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="tool-modal-window">
            <div className="tool-modal-header">
              <div>
                <span className="text-[10px] font-mono font-extrabold text-zinc-500">
                  DEPLOY & HOSTING
                </span>
                <h2 className="text-lg font-extrabold text-zinc-900 mt-0.5">
                  Deploy {project.name}
                </h2>
              </div>
              <button
                type="button"
                className="odysseus-pill-btn"
                onClick={() => setShowDeploy(false)}
              >
                Close
              </button>
            </div>
            <div className="tool-modal-content">
              <DeployHub githubData={githubData} initialRepo={project.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
