import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';

export default function AddClassModal({ onAddClass, onClose }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddClass({
      id: `cls_${Date.now()}`,
      kind: 'class',
      name: name.trim(),
      code: code.trim().toUpperCase() || 'COURSE',
      description:
        description.trim() ||
        'University course workspace for assignments, labs, exams, and lecture notes.',
      language: code.trim().toUpperCase() || 'CLASS'
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md neo-card-cream p-6 flex flex-col gap-5 shadow-[8px_8px_0px_#18181b]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 neo-badge-seal flex items-center justify-center text-zinc-900 shadow-[2px_2px_0px_#18181b]">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">
                NEW COURSE WORKSPACE
              </span>
              <h2 className="text-lg font-extrabold text-zinc-900">Add a Class or Course</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-900 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-extrabold text-zinc-800">
            Course Name *
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              className="neo-input text-sm"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-extrabold text-zinc-800">
            Course Code (optional)
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS301, MATH2B, PHYS101"
              className="neo-input text-sm font-mono"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-extrabold text-zinc-800">
            Instructor / Schedule / Description (optional)
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Mon/Wed 10:00 AM • Room 302"
              className="neo-input text-sm"
            />
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn-white px-4 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="neo-btn-butter px-4 py-2 text-xs"
            >
              + Create Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
