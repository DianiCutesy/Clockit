/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ListFilter, Trash, CheckSquare, Square, ChevronDown, ChevronRight, CornerDownRight, Bell, Clock, X, BellRing, FileText, Save, Volume2, Music } from 'lucide-react';

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  subtasks: SubTask[];
  isExpanded: boolean;
  reminderTime?: string; // HH:mm format
  reminderNotified?: boolean;
  reminderSound?: string;
  notes?: string;
  isNotesExpanded?: boolean;
}

type FilterType = 'all' | 'active' | 'completed';

const SOUNDS = [
  { id: 'classic', name: 'Classic Bell', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'digital', name: 'Digital Alert', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
  { id: 'chime', name: 'Soft Chime', url: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' },
  { id: 'success', name: 'Success', url: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3' },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [reminderInput, setReminderInput] = useState('');
  const [soundInput, setSoundInput] = useState('classic');
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeReminder, setActiveReminder] = useState<Task | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load tasks from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('clockit_tasks');
    if (savedTasks) {
      try {
        const parsed = JSON.parse(savedTasks);
        // Migration for old tasks
        const migrated = parsed.map((t: any) => ({
          ...t,
          subtasks: t.subtasks || [],
          isExpanded: t.isExpanded || false,
          reminderNotified: t.reminderNotified || false,
          reminderSound: t.reminderSound || 'classic',
          notes: t.notes || '',
          isNotesExpanded: t.isNotesExpanded || false
        }));
        setTasks(migrated);
      } catch (e) {
        console.error('Failed to parse tasks from localStorage', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save tasks to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('clockit_tasks', JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  const playReminderSound = (soundId: string) => {
    const sound = SOUNDS.find(s => s.id === soundId) || SOUNDS[0];
    if (audioRef.current) {
      audioRef.current.src = sound.url;
      audioRef.current.play().catch(err => console.error("Audio play failed:", err));
    }
  };

  // Reminder Check Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      setTasks(prevTasks => {
        let changed = false;
        const updatedTasks = prevTasks.map(task => {
          if (task.reminderTime === currentTime && !task.reminderNotified && !task.completed) {
            setActiveReminder(task);
            playReminderSound(task.reminderSound || 'classic');
            changed = true;
            return { ...task, reminderNotified: true };
          }
          return task;
        });
        return changed ? updatedTasks : prevTasks;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const addTask = (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      completed: false,
      createdAt: Date.now(),
      subtasks: [],
      isExpanded: false,
      reminderTime: reminderInput || undefined,
      reminderNotified: false,
      reminderSound: soundInput,
      notes: '',
      isNotesExpanded: false,
    };

    setTasks([newTask, ...tasks]);
    setInputValue('');
    setReminderInput('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const newCompleted = !task.completed;
        const updatedSubtasks = task.subtasks.map(st => ({ ...st, completed: newCompleted }));
        return { ...task, completed: newCompleted, subtasks: updatedSubtasks };
      }
      return task;
    }));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const toggleExpand = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, isExpanded: !task.isExpanded } : task
    ));
  };

  const toggleNotesExpand = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, isNotesExpanded: !task.isNotesExpanded } : task
    ));
  };

  const updateNotes = (id: string, notes: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, notes } : task
    ));
  };

  const addSubTask = (taskId: string) => {
    const text = subTaskInputs[taskId]?.trim();
    if (!text) return;

    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newSubTask: SubTask = {
          id: crypto.randomUUID(),
          text,
          completed: false,
        };
        const updatedSubtasks = [...task.subtasks, newSubTask];
        return { 
          ...task, 
          subtasks: updatedSubtasks, 
          completed: false,
          isExpanded: true 
        };
      }
      return task;
    }));

    setSubTaskInputs({ ...subTaskInputs, [taskId]: '' });
  };

  const toggleSubTask = (taskId: string, subTaskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(st => 
          st.id === subTaskId ? { ...st, completed: !st.completed } : st
        );
        const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
        return { ...task, subtasks: updatedSubtasks, completed: allCompleted };
      }
      return task;
    }));
  };

  const deleteSubTask = (taskId: string, subTaskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.filter(st => st.id !== subTaskId);
        const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
        return { ...task, subtasks: updatedSubtasks, completed: allCompleted };
      }
      return task;
    }));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(task => !task.completed));
  };

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'active': return tasks.filter(t => !t.completed);
      case 'completed': return tasks.filter(t => t.completed);
      default: return tasks;
    }
  }, [tasks, filter]);

  const activeCount = tasks.filter(t => !t.completed).length;

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 font-sans text-slate-900">
      <audio ref={audioRef} hidden />
      <div className="max-w-md mx-auto relative">
        {/* Reminder Alert Modal */}
        <AnimatePresence>
          {activeReminder && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-xs w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <button 
                  onClick={() => setActiveReminder(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 animate-bounce">
                  <BellRing size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Reminder!</h2>
                <p className="text-slate-600 font-medium mb-6">It's time to: <br/><span className="text-indigo-600 font-bold">"{activeReminder.text}"</span></p>
                <button
                  onClick={() => setActiveReminder(null)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            ClockIt
          </h1>
          <p className="text-slate-500 font-medium">Time to get things done.</p>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/50 border border-white overflow-hidden"
        >
          {/* Input Section */}
          <form onSubmit={addTask} className="p-6 border-bottom border-slate-100 bg-white/50 space-y-4">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full pl-4 pr-14 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white rounded-2xl outline-none transition-all duration-200 text-slate-700 placeholder:text-slate-400 font-medium"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4 px-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Set Reminder</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={reminderInput}
                    onChange={(e) => setReminderInput(e.target.value)}
                    className="bg-slate-100 border-none rounded-lg px-3 py-1.5 text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-400 outline-none transition-all"
                  />
                  {reminderInput && (
                    <button 
                      type="button"
                      onClick={() => setReminderInput('')}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {reminderInput && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center justify-between pt-2 border-t border-slate-100"
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <Volume2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Alert Sound</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={soundInput}
                      onChange={(e) => {
                        setSoundInput(e.target.value);
                        const sound = SOUNDS.find(s => s.id === e.target.value);
                        if (sound && audioRef.current) {
                          audioRef.current.src = sound.url;
                          audioRef.current.play();
                        }
                      }}
                      className="bg-slate-100 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-purple-600 focus:ring-2 focus:ring-purple-400 outline-none transition-all cursor-pointer"
                    >
                      {SOUNDS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}
            </div>
          </form>

          {/* Filters & Stats */}
          <div className="px-6 py-4 bg-slate-50/50 border-y border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex bg-slate-200/50 p-1 rounded-xl">
              {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                    filter === f 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeCount} {activeCount === 1 ? 'task' : 'tasks'} left
            </span>
          </div>

          {/* Task List */}
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <div className="group flex items-center gap-4 px-6 py-4 hover:bg-indigo-50/30 transition-colors">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`flex-shrink-0 transition-colors ${
                          task.completed ? 'text-emerald-500' : 'text-slate-300 group-hover:text-indigo-400'
                        }`}
                      >
                        {task.completed ? (
                          <CheckSquare size={24} fill="currentColor" fillOpacity={0.1} />
                        ) : (
                          <Square size={24} />
                        )}
                      </button>
                      
                      <div className="flex-grow flex flex-col">
                        <div className="flex items-center gap-2">
                          <span 
                            onClick={() => toggleTask(task.id)}
                            className={`cursor-pointer font-bold transition-all duration-300 ${
                              task.completed 
                                ? 'text-slate-400 line-through decoration-2 decoration-slate-300' 
                                : 'text-slate-700'
                            }`}
                          >
                            {task.text}
                          </span>
                          {task.subtasks.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black rounded-md uppercase tracking-tighter">
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                            </span>
                          )}
                        </div>
                        {task.reminderTime && !task.completed && (
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            <div className="flex items-center gap-1">
                              <Bell size={10} />
                              {task.reminderTime}
                            </div>
                            <div className="flex items-center gap-1 text-purple-400">
                              <Music size={10} />
                              {SOUNDS.find(s => s.id === task.reminderSound)?.name || 'Classic'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleNotesExpand(task.id)}
                          className={`p-2 rounded-lg transition-all ${
                            task.isNotesExpanded ? 'bg-purple-100 text-purple-600' : 'text-slate-300 hover:text-purple-400 hover:bg-purple-50'
                          }`}
                          title="Notes"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className={`p-2 rounded-lg transition-all ${
                            task.isExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-indigo-400 hover:bg-indigo-50'
                          }`}
                          title="Subtasks"
                        >
                          {task.isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <AnimatePresence>
                      {task.isNotesExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-purple-50/30 border-t border-purple-100/50"
                        >
                          <div className="px-14 py-4">
                            <div className="flex items-center gap-2 mb-2 text-purple-600">
                              <FileText size={14} />
                              <span className="text-xs font-black uppercase tracking-widest">Task Notes</span>
                            </div>
                            <textarea
                              value={task.notes || ''}
                              onChange={(e) => updateNotes(task.id, e.target.value)}
                              placeholder="Add detailed description or context here..."
                              className="w-full bg-white/50 border border-purple-100 rounded-xl p-3 text-sm text-slate-600 placeholder:text-slate-300 focus:border-purple-300 focus:bg-white outline-none transition-all min-h-[100px] resize-none custom-scrollbar"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Subtasks Section */}
                    <AnimatePresence>
                      {task.isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50/50 border-t border-slate-100/50"
                        >
                          <div className="pl-14 pr-6 pb-4 pt-4 space-y-2">
                            <div className="flex items-center gap-2 mb-2 text-indigo-600">
                              <CornerDownRight size={14} />
                              <span className="text-xs font-black uppercase tracking-widest">Subtasks</span>
                            </div>
                            {task.subtasks.map((subtask) => (
                              <motion.div 
                                key={subtask.id}
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="group/sub flex items-center gap-3 py-1"
                              >
                                <CornerDownRight size={14} className="text-slate-300" />
                                <button
                                  onClick={() => toggleSubTask(task.id, subtask.id)}
                                  className={`transition-colors ${
                                    subtask.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-400'
                                  }`}
                                >
                                  {subtask.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>
                                <span 
                                  onClick={() => toggleSubTask(task.id, subtask.id)}
                                  className={`flex-grow text-sm cursor-pointer transition-all ${
                                    subtask.completed ? 'text-slate-400 line-through' : 'text-slate-600 font-medium'
                                  }`}
                                >
                                  {subtask.text}
                                </span>
                                <button
                                  onClick={() => deleteSubTask(task.id, subtask.id)}
                                  className="opacity-0 group-hover/sub:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </motion.div>
                            ))}
                            
                            {/* Add Subtask Input */}
                            <div className="flex items-center gap-2 pt-2">
                              <CornerDownRight size={14} className="text-slate-300" />
                              <input
                                type="text"
                                value={subTaskInputs[task.id] || ''}
                                onChange={(e) => setSubTaskInputs({ ...subTaskInputs, [task.id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && addSubTask(task.id)}
                                placeholder="Add subtask..."
                                className="flex-grow bg-transparent border-b border-slate-200 focus:border-indigo-400 outline-none text-sm py-1 text-slate-600 placeholder:text-slate-300 transition-colors"
                              />
                              <button
                                onClick={() => addSubTask(task.id)}
                                disabled={!subTaskInputs[task.id]?.trim()}
                                className="p-1 text-indigo-600 hover:bg-indigo-100 rounded-md disabled:opacity-0 transition-all"
                              >
                                <Plus size={16} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-16 px-6 text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4 text-slate-300">
                    <ListFilter size={32} />
                  </div>
                  <h3 className="text-slate-500 font-bold">No tasks found</h3>
                  <p className="text-slate-400 text-sm">
                    {filter === 'all' 
                      ? "You're all caught up! Add a task to get started." 
                      : `No ${filter} tasks to show.`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          {tasks.some(t => t.completed) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white border-t border-slate-100"
            >
              <button
                onClick={clearCompleted}
                className="w-full py-3 px-4 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash size={16} />
                Clear Completed Tasks
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Footer Info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-slate-400 text-xs font-medium"
        >
          Built with precision. Your data is saved locally.
        </motion.p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(48%) sepia(13%) saturate(3207%) hue-rotate(215deg) brightness(95%) contrast(80%);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
