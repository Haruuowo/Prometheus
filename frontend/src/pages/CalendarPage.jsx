import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import {
  FULL_MONTH_NAMES,
  WEEKDAYS,
  toDateKey,
  getRelativeDayLabel,
  buildMonthlyGrid
} from '../lib/dateUtils';

export default function CalendarPage({
  deadlines,
  onAddDeadline,
  onToggleDeadline,
  onDeleteDeadline
}) {
  const todayObj = new Date();
  const todayKey = toDateKey(todayObj);
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('LAB');
  const [newTime, setNewTime] = useState('11:59 PM');
  const [filter, setFilter] = useState('UPCOMING');

  const calendarCells = buildMonthlyGrid(calYear, calMonth);

  const filteredDeadlines = deadlines
    .filter((d) => {
      if (filter === 'SELECTED_DATE') return d.date === selectedDate;
      if (filter === 'DONE') return d.done;
      return !d.done;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddDeadline({
      title: newTitle.trim(),
      date: selectedDate,
      time: newTime.trim() || '11:59 PM',
      category: newCategory
    });
    setNewTitle('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Full Monthly Calendar */}
      <div className="xl:col-span-8 neo-card p-6 flex flex-col gap-4 bg-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-zinc-900">
              {FULL_MONTH_NAMES[calMonth]} {calYear}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-extrabold bg-[#f8de8c] border-2 border-zinc-900 text-zinc-900">
              Selected: {selectedDate}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="neo-btn-white px-3 py-1.5 text-xs"
            >
              &larr; Prev
            </button>
            <button
              type="button"
              onClick={handleJumpToday}
              className="neo-btn-butter px-3 py-1.5 text-xs"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="neo-btn-white px-3 py-1.5 text-xs"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-left px-1 font-mono text-[11px] font-extrabold uppercase text-zinc-500">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell) => {
            const dayEvents = deadlines.filter((d) => d.date === cell.dateKey);
            const activeEvents = dayEvents.filter((d) => !d.done);
            const isToday = cell.dateKey === todayKey;
            const isSelected = cell.dateKey === selectedDate;

            return (
              <div
                key={cell.dateKey}
                onClick={() => setSelectedDate(cell.dateKey)}
                className={`min-h-[96px] rounded-2xl p-2.5 flex flex-col gap-1.5 cursor-pointer transition-all border-2 overflow-hidden ${
                  !cell.inCurrentMonth
                    ? 'opacity-35 bg-[#faf6ee] border-zinc-300'
                    : isSelected
                    ? 'bg-[#f8de8c] border-zinc-900 shadow-[3px_3px_0px_#18181b]'
                    : isToday
                    ? 'bg-[#aee2f5] border-zinc-900'
                    : 'bg-[#faf6ee] border-zinc-900/40 hover:border-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-xs font-extrabold text-zinc-900">
                  <span>{cell.dayNum}</span>
                  {activeEvents.length > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e0533c] border border-zinc-900" />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`deadline-pill cat-${ev.category || 'LAB'} ${
                        ev.done ? 'done' : ''
                      }`}
                      title={`${ev.title} (${ev.time})`}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] font-bold text-zinc-600 pl-1">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Add Deadline & Schedule List */}
      <div className="xl:col-span-4 neo-card p-6 flex flex-col gap-4 bg-white">
        <div>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
            SCHEDULE & DEADLINES
          </span>
          <h2 className="text-lg font-extrabold text-zinc-900 mt-0.5">Add Task or Deadline</h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2.5 pb-4 border-b-2 border-zinc-900/15"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`Deadline title for ${selectedDate}...`}
            className="neo-input text-xs"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2.5 py-2 rounded-xl bg-[#faf6ee] border-2 border-zinc-900 text-xs font-mono font-extrabold text-zinc-900 focus:outline-none"
            >
              <option value="LAB">LAB / HW</option>
              <option value="EXAM">EXAM</option>
              <option value="PROJECT">PROJECT</option>
              <option value="HACKATHON">HACKATHON</option>
            </select>
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="11:59 PM"
              className="px-2.5 py-2 rounded-xl bg-[#faf6ee] border-2 border-zinc-900 text-xs font-mono font-bold text-zinc-900 focus:outline-none"
            />
            <button
              type="submit"
              className="neo-btn-butter px-3 py-2 text-xs flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              Add
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-extrabold text-zinc-600">DEADLINE LIST</span>
          <div className="flex items-center gap-1">
            {[
              { id: 'UPCOMING', label: 'Upcoming' },
              { id: 'SELECTED_DATE', label: selectedDate.slice(5) },
              { id: 'DONE', label: 'Done' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-extrabold border-2 border-zinc-900 ${
                  filter === f.id ? 'bg-[#f8de8c] text-zinc-900' : 'bg-[#faf6ee] text-zinc-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-0.5">
          {filteredDeadlines.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-zinc-500">
              No deadlines in this view. Click any date on the calendar to add one.
            </div>
          ) : (
            filteredDeadlines.map((dl) => {
              const relLabel = getRelativeDayLabel(dl.date, todayKey);
              const isUrgent = dl.date <= todayKey && !dl.done;

              return (
                <div
                  key={dl.id}
                  className="flex items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#faf6ee] border-2 border-zinc-900 shadow-[2px_2px_0px_#18181b]"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleDeadline(dl.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md border-2 border-zinc-900 flex items-center justify-center shrink-0 ${
                        dl.done ? 'bg-[#a3ebb1] text-zinc-900' : 'bg-white'
                      }`}
                    >
                      {dl.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-extrabold ${
                          dl.done ? 'line-through text-zinc-400' : 'text-zinc-900'
                        }`}
                      >
                        {dl.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px] font-bold text-zinc-600 flex-wrap">
                        <span className={`deadline-pill cat-${dl.category || 'LAB'}`}>
                          {dl.category || 'LAB'}
                        </span>
                        <span>{dl.date}</span>
                        <span>• {dl.time}</span>
                        {relLabel && (
                          <span
                            className={`font-extrabold ${
                              isUrgent ? 'text-[#e0533c]' : 'text-zinc-900'
                            }`}
                          >
                            ({relLabel})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteDeadline(dl.id)}
                    className="text-zinc-500 hover:text-[#e0533c] p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
