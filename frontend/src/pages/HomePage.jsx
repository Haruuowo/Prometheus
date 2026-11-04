import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Plus,
  Trash2,
  BookOpen,
  Code2,
  ArrowRight,
  ExternalLink,
  Briefcase,
  Calendar as CalendarIcon
} from 'lucide-react';
import {
  FULL_MONTH_NAMES,
  getRelativeDayLabel,
  buildMonthlyGrid,
  buildContributionCalendar,
  toDateKey
} from '../lib/dateUtils';

export default function HomePage({
  githubUsername,
  githubData,
  contribYear,
  onSelectYear,
  deadlines,
  onAddDeadline,
  onToggleDeadline,
  onDeleteDeadline,
  classesList,
  getRepoData,
  onOpenAuth,
  onOpenAddClass
}) {
  const navigate = useNavigate();

  const todayObj = new Date();
  const todayKey = toDateKey(todayObj);
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState('LAB');
  const [quickTime, setQuickTime] = useState('11:59 PM');

  const displayHandle = githubData?.username || githubUsername || 'Student';

  const upcomingDeadlines = deadlines
    .filter((d) => !d.done)
    .sort((a, b) => a.date.localeCompare(b.date));

  const calendarCells = buildMonthlyGrid(calYear, calMonth);

  const contribTotal = githubData?.contributions?.total ?? 0;
  const { weeks: contribWeeks, monthLabels } = buildContributionCalendar(
    githubData?.contributions?.days || []
  );

  const currentYear = todayObj.getFullYear();
  const contribYearOptions = [
    { id: 'last', label: 'Past year' },
    { id: String(currentYear), label: String(currentYear) },
    { id: String(currentYear - 1), label: String(currentYear - 1) },
    { id: String(currentYear - 2), label: String(currentYear - 2) }
  ];

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalYear(calYear - 1);
      setCalMonth(11);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalYear(calYear + 1);
      setCalMonth(0);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDate(toDateKey(now));
  };

  const handleSubmitQuickDeadline = (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddDeadline({
      title: quickTitle.trim(),
      date: selectedDate,
      time: quickTime.trim() || '11:59 PM',
      category: quickCategory
    });
    setQuickTitle('');
  };

  const allWorkspaces = [
    ...(classesList || []).map((c) => ({ ...c, kind: 'class' })),
    ...((githubData?.repos || []).slice(0, 6).map((r) => ({ ...r, kind: 'repo' })))
  ];

  const spotlightWorkspaces = allWorkspaces.slice(0, 2);

  return (
    <div className="flex flex-col gap-7">
      {/* 1. Top "Hi, Student / Welcome back" Header + Quick Action Bar (Exact Pablo Layout) */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Hi, {displayHandle}
            </h1>
            <p className="text-sm font-semibold text-zinc-500">
              Welcome back — you have <b className="text-zinc-900">{upcomingDeadlines.length} tasks due soon</b> across{' '}
              <b className="text-zinc-900">{classesList?.length || 0} classes</b> and{' '}
              <b className="text-zinc-900">{githubData?.repos?.length || 0} repos</b>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenAddClass}
              className="neo-btn-white px-4 py-2.5 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Class
            </button>
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-12 h-12 rounded-full bg-white border-2 border-zinc-900 shadow-[3px_3px_0px_#18181b] flex items-center justify-center overflow-hidden hover:translate-y-[-1px] transition-transform"
              title="Manage GitHub Account"
            >
              {githubData?.avatar_url ? (
                <img
                  src={githubData.avatar_url}
                  alt={displayHandle}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <img
                  src="/pfp.png"
                  alt="Default Profile"
                  className="w-full h-full object-contain p-1 rounded-full"
                />
              )}
            </button>
          </div>
        </div>

        {/* Wide Pill Quick-Add Bar (Like "Place my regular order" in the reference) */}
        <form
          onSubmit={handleSubmitQuickDeadline}
          className="neo-card p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={`Quick-add task or assignment for ${selectedDate}...`}
            className="flex-1 px-3 py-2 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 bg-transparent focus:outline-none"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#faf6ee] border-2 border-zinc-900 text-xs font-mono font-extrabold text-zinc-900 focus:outline-none"
            >
              <option value="LAB">LAB / HW</option>
              <option value="EXAM">EXAM</option>
              <option value="PROJECT">PROJECT</option>
              <option value="HACKATHON">HACKATHON</option>
            </select>
            <input
              type="text"
              value={quickTime}
              onChange={(e) => setQuickTime(e.target.value)}
              placeholder="11:59 PM"
              className="w-24 px-3 py-2 rounded-xl bg-[#faf6ee] border-2 border-zinc-900 text-xs font-mono font-bold text-zinc-900 focus:outline-none"
            />
            <button
              type="submit"
              className="neo-btn-butter px-4 py-2 text-xs flex items-center justify-center gap-1.5"
              title="Add task to selected date"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Task
            </button>
          </div>
        </form>
      </section>

      {/* OJT Automation Banner */}
      <section
        onClick={() => navigate('/ojt')}
        className="neo-card p-4 sm:p-5 bg-gradient-to-r from-[#f8de8c] via-[#a3ebb1] to-[#aee2f5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:translate-y-[-2px] transition-transform shadow-[4px_4px_0px_#18181b]"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white border-2 border-zinc-900 flex items-center justify-center text-zinc-900 font-extrabold shadow-[2px_2px_0px_#18181b] shrink-0">
            <Briefcase className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-white border border-zinc-900 text-zinc-900">
                OJT Practicum Hub
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-800">
                16 Weeks Automation
              </span>
            </div>
            <h2 className="text-base font-extrabold text-zinc-900 mt-0.5">
              Automate your OJT daily logs, hours tracking & weekly SOC journal reports
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/ojt');
          }}
          className="neo-btn-white px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_#18181b]"
        >
          Open OJT Hub <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </section>

      {/* 2. Featured Pastel Cards Row (Sky Blue & Mint Green with Circular Dashed Stamp Seal + Butter CTA) */}
      {spotlightWorkspaces.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-zinc-900">
              Pinned Focus Workspaces
            </h2>
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="text-xs font-extrabold text-zinc-900 hover:underline inline-flex items-center gap-1"
            >
              All Classes & Repos <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {spotlightWorkspaces.map((item, idx) => {
              const pData = getRepoData(item.name);
              const pendingCount = (pData.todos || []).filter((t) => !t.done).length;
              const isClass = item.kind === 'class';
              const cardTheme = idx % 2 === 0 ? 'neo-card-sky' : 'neo-card-mint';

              return (
                <div
                  key={`spot_${item.id || item.name}`}
                  onClick={() => navigate(`/p/${encodeURIComponent(item.name)}`)}
                  className={`${cardTheme} neo-card-interactive p-6 flex flex-col items-center text-center justify-between gap-4 cursor-pointer`}
                >
                  {/* Circular Scalloped/Dashed White Icon Badge */}
                  <div className="w-16 h-16 neo-badge-seal flex items-center justify-center shadow-[2px_2px_0px_#18181b]">
                    {isClass ? (
                      <BookOpen className="w-7 h-7 text-zinc-900 stroke-[2.2]" />
                    ) : (
                      <Code2 className="w-7 h-7 text-zinc-900 stroke-[2.2]" />
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-zinc-700">
                      {isClass ? item.code || 'UNIVERSITY COURSE' : `${item.language || 'CODE'} REPOSITORY`}
                    </div>
                    <h3 className="text-xl font-extrabold text-zinc-900 mt-1">
                      {item.name} *
                    </h3>
                    <p className="text-xs font-semibold text-zinc-700 mt-1 max-w-md">
                      {pendingCount > 0
                        ? `${pendingCount} pending ${pendingCount === 1 ? 'task' : 'tasks'} on board`
                        : item.description || 'Open workspace to add assignments, labs & notes'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="w-full neo-btn-butter py-3 text-xs font-extrabold"
                  >
                    Open Workspace
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Due Date Radar (Canvas-Style Calendar with Red Dots) + Upcoming Deadlines */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Canvas Mini Monthly Calendar with Red Dots */}
        <div className="lg:col-span-5 neo-card p-5 flex flex-col justify-between gap-4 bg-white">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
                  DUE DATE RADAR
                </span>
                <h2 className="text-lg font-extrabold text-zinc-900">
                  {FULL_MONTH_NAMES[calMonth]} {calYear}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="px-2.5 py-1 rounded-lg bg-[#faf6ee] border-2 border-zinc-900 text-xs font-extrabold text-zinc-900"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="px-2.5 py-1 rounded-lg bg-[#f8de8c] border-2 border-zinc-900 text-xs font-extrabold text-zinc-900"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="px-2.5 py-1 rounded-lg bg-[#faf6ee] border-2 border-zinc-900 text-xs font-extrabold text-zinc-900"
                >
                  &rarr;
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-mono font-extrabold text-zinc-500 pb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell) => {
                const dayEvents = deadlines.filter((d) => d.date === cell.dateKey);
                const activeEvents = dayEvents.filter((d) => !d.done);
                const doneEvents = dayEvents.filter((d) => d.done);
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDate;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateKey)}
                    title={
                      dayEvents.length > 0
                        ? `${cell.dateKey}: ${dayEvents.map((e) => e.title).join(', ')}`
                        : cell.dateKey
                    }
                    className={`h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 font-mono text-xs font-extrabold transition-all border-2 ${
                      !cell.inCurrentMonth
                        ? 'opacity-35 bg-transparent border-transparent'
                        : isSelected
                        ? 'bg-[#f8de8c] border-zinc-900 text-zinc-900 shadow-[2px_2px_0px_#18181b]'
                        : isToday
                        ? 'bg-[#aee2f5] border-zinc-900 text-zinc-900'
                        : 'bg-[#faf6ee] border-zinc-900/20 text-zinc-800 hover:border-zinc-900'
                    }`}
                  >
                    <span>{cell.dayNum}</span>
                    <div className="flex items-center justify-center gap-1 h-1.5">
                      {activeEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="w-1.5 h-1.5 rounded-full bg-[#e0533c] border border-zinc-900"
                        />
                      ))}
                      {activeEvents.length === 0 && doneEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-zinc-900/15 flex items-center justify-between text-[11px] font-mono font-bold text-zinc-600">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e0533c] border border-zinc-900" />
              Due deadline dot
            </span>
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="text-zinc-900 hover:underline font-extrabold"
            >
              Open Full Calendar &rarr;
            </button>
          </div>
        </div>

        {/* Right: Upcoming Deadlines List */}
        <div className="lg:col-span-7 neo-card p-5 flex flex-col justify-between gap-4 bg-white">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
                  SELECTED DATE: {selectedDate}
                </span>
                <h2 className="text-lg font-extrabold text-zinc-900">
                  Upcoming Deadlines & Assignments
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-[#f8de8c] border-2 border-zinc-900 text-zinc-900">
                {upcomingDeadlines.length} active
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
              {upcomingDeadlines.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-zinc-500">
                  No pending deadlines! Add one in the bar above.
                </div>
              ) : (
                upcomingDeadlines.slice(0, 6).map((dl) => {
                  const rel = getRelativeDayLabel(dl.date, todayKey);
                  const isUrgent = dl.date <= todayKey && !dl.done;

                  return (
                    <div
                      key={dl.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#faf6ee] border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleDeadline(dl.id)}
                          className={`w-6 h-6 rounded-lg border-2 border-zinc-900 flex items-center justify-center shrink-0 transition-colors ${
                            dl.done ? 'bg-[#a3ebb1] text-zinc-900' : 'bg-white hover:bg-[#f8de8c]'
                          }`}
                        >
                          {dl.done && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-zinc-900 truncate">
                            {dl.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono font-bold text-zinc-600 flex-wrap">
                            <span className={`deadline-pill cat-${dl.category || 'LAB'}`}>
                              {dl.category || 'LAB'}
                            </span>
                            <span>{dl.date}</span>
                            <span>• {dl.time}</span>
                            {rel && (
                              <span
                                className={`font-extrabold ${
                                  isUrgent ? 'text-[#e0533c]' : 'text-zinc-900'
                                }`}
                              >
                                ({rel})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteDeadline(dl.id)}
                        className="text-zinc-500 hover:text-[#e0533c] p-1 shrink-0"
                        title="Delete deadline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. All Classes & Projects Cards Grid (Like "Sandwiches" Grid with Yellow Seal Badge & Butter CTA) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-extrabold text-zinc-900">
            All Classes & Projects ({allWorkspaces.length})
          </h2>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="text-xs font-extrabold text-zinc-900 hover:underline inline-flex items-center gap-1"
          >
            See all <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {allWorkspaces.slice(0, 6).map((item) => {
            const pData = getRepoData(item.name);
            const pendingCount = (pData.todos || []).filter((t) => !t.done).length;
            const nextTodo = (pData.todos || []).find((t) => !t.done);
            const isClass = item.kind === 'class';

            return (
              <div
                key={`${item.kind}_${item.id || item.name}`}
                onClick={() => navigate(`/p/${encodeURIComponent(item.name)}`)}
                className="neo-card neo-card-interactive p-5 flex flex-col justify-between gap-4 cursor-pointer bg-white"
              >
                <div>
                  {/* Top Banner Box with TOP / CODE Seal Badge */}
                  <div
                    className={`relative h-24 rounded-2xl border-2 border-zinc-900 p-3.5 flex items-end justify-between ${
                      isClass ? 'bg-[#a3ebb1]' : 'bg-[#aee2f5]'
                    }`}
                  >
                    <span className="px-2.5 py-1 rounded-lg bg-white border-2 border-zinc-900 text-[10px] font-mono font-extrabold text-zinc-900">
                      {isClass ? item.code || 'CLASS' : item.language || 'REPO'}
                    </span>

                    <div className="w-11 h-11 rounded-full bg-[#f8de8c] border-2 border-dashed border-zinc-900 flex items-center justify-center text-[10px] font-mono font-extrabold text-zinc-900 shadow-[2px_2px_0px_#18181b]">
                      {pendingCount > 0 ? `${pendingCount}T` : 'TOP'}
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-zinc-900 mt-3">
                    {item.name}
                  </h3>
                  <p className="text-xs font-semibold text-zinc-600 mt-0.5 line-clamp-2">
                    {nextTodo
                      ? `Next: ${nextTodo.text}`
                      : item.description || 'Click to manage tasks, deadlines, and notes.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="w-full neo-btn-butter py-2.5 text-xs font-extrabold"
                >
                  Open Workspace
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Compact GitHub Contribution Heatmap */}
      {githubUsername && (
        <section className="neo-card p-5 flex flex-col gap-4 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#16a34a] border border-zinc-900" />
              <h3 className="text-sm font-extrabold text-zinc-900">
                {contribTotal} GitHub contributions{' '}
                {contribYear === 'last' ? 'in the last year' : `in ${contribYear}`}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {contribYearOptions.map((yr) => (
                <button
                  key={yr.id}
                  type="button"
                  onClick={() => onSelectYear(yr.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-extrabold border-2 border-zinc-900 transition-all ${
                    contribYear === yr.id
                      ? 'bg-[#f8de8c] text-zinc-900 shadow-[2px_2px_0px_#18181b]'
                      : 'bg-[#faf6ee] text-zinc-700 hover:bg-white'
                  }`}
                >
                  {yr.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gh-contrib-box">
            <div className="gh-contrib-months">
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${(m.weekIndex / Math.max(contribWeeks.length, 52)) * 100}%`
                  }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="gh-contrib-grid-row">
              <div className="gh-contrib-days-col">
                <span />
                <span>Mon</span>
                <span />
                <span>Wed</span>
                <span />
                <span>Fri</span>
                <span />
              </div>

              <div className="gh-contrib-weeks">
                {contribWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="gh-contrib-week-col">
                    {week.map((day, dIdx) =>
                      day ? (
                        <div
                          key={day.date}
                          className={`gh-contrib-cell gh-level-${day.level || 0}`}
                          title={`${day.date}: ${
                            day.level > 0 ? `Level ${day.level} contributions` : 'No contributions'
                          }`}
                        />
                      ) : (
                        <div key={dIdx} style={{ width: '100%', height: 13 }} />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
