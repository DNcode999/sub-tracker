import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Users, Clock, CheckCircle, AlertTriangle, UserPlus, 
  ArrowRight, X, LogIn, LogOut, ShieldCheck, Trash2, 
  CalendarClock, Plus, CheckSquare, Layers, Check, ArrowRightLeft, UserX,
  Calendar, Copy
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function App() {
  const [teachers, setTeachers] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Absence Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [absentTeacherId, setAbsentTeacherId] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  // Keyed as: `${dateStr}_${periodId}`
  const [selectedTaskKeys, setSelectedTaskKeys] = useState([]);

  // Modals & Filters
  const [activeAbsence, setActiveAbsence] = useState(null);
  const [subTypeFilter, setSubTypeFilter] = useState('all'); // 'all', 'Junior High', 'Senior High'
  const [dateFilter, setDateFilter] = useState('all');
  const [showAddTeacher, setShowAddTeacher] = useState(false);

  // New Teacher Form State
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('');
  const [newTeacherType, setNewTeacherType] = useState('Junior High');
  const [newTeacherPoints, setNewTeacherPoints] = useState(0);

  // Active day tab in Add Teacher Modal
  const [activeTabDay, setActiveTabDay] = useState('Monday');

  // Monday to Friday Schedule Builder State
  const [weeklySchedule, setWeeklySchedule] = useState({
    Monday: [
      { id: 'm1', startTime: '07:30', endTime: '08:30', type: 'class', subject: '', section: '' },
      { id: 'm2', startTime: '08:30', endTime: '10:00', type: 'vacant', subject: '', section: '' }
    ],
    Tuesday: [
      { id: 't1', startTime: '08:00', endTime: '09:30', type: 'class', subject: '', section: '' },
      { id: 't2', startTime: '09:30', endTime: '11:00', type: 'vacant', subject: '', section: '' }
    ],
    Wednesday: [
      { id: 'w1', startTime: '07:30', endTime: '08:30', type: 'class', subject: '', section: '' },
      { id: 'w2', startTime: '08:30', endTime: '10:00', type: 'vacant', subject: '', section: '' }
    ],
    Thursday: [
      { id: 'th1', startTime: '08:00', endTime: '09:30', type: 'class', subject: '', section: '' },
      { id: 'th2', startTime: '09:30', endTime: '11:00', type: 'vacant', subject: '', section: '' }
    ],
    Friday: [
      { id: 'f1', startTime: '07:30', endTime: '09:30', type: 'class', subject: '', section: '' },
      { id: 'f2', startTime: '09:30', endTime: '11:30', type: 'vacant', subject: '', section: '' }
    ]
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: teacherData } = await supabase.from('teachers').select('*');
    const { data: absenceData } = await supabase.from('absences').select('*').order('absence_date', { ascending: true });

    if (teacherData) setTeachers(teacherData);
    if (absenceData) setAbsences(absenceData);
    setLoading(false);
  }

  // --- Auth Handlers ---
  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
    } else {
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // Helper: Get weekday name from a date string (e.g. '2026-10-26' -> 'Monday')
  function getWeekday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Helper: Safely get schedule for a given day (supports both Mon-Fri object and legacy flat array)
  function getTeacherDaySchedule(teacher, dayName) {
    if (!teacher || !teacher.schedule) return [];
    if (!Array.isArray(teacher.schedule) && typeof teacher.schedule === 'object') {
      return teacher.schedule[dayName] || [];
    }
    // Backward compatibility for legacy flat array
    if (Array.isArray(teacher.schedule)) {
      return teacher.schedule;
    }
    return [];
  }

  // Helper: Get school days (skips Saturday and Sunday)
  function getSchoolDaysInRange(startStr, endStr) {
    const dates = [];
    let curr = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    while (curr <= end) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (dates.length === 0 && startStr) {
      dates.push(startStr);
    }
    return dates;
  }

  // --- Schedule Builder (Add Teacher) Handlers ---
  function addPeriodRow(day) {
    const dayPeriods = weeklySchedule[day] || [];
    const last = dayPeriods[dayPeriods.length - 1];
    const newStart = last ? last.endTime : '10:00';
    
    const [h, m] = newStart.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    const newEnd = `${endH}:${String(m).padStart(2, '0')}`;

    const newPeriod = {
      id: `${day.slice(0, 2).toLowerCase()}_${Date.now()}`,
      startTime: newStart,
      endTime: newEnd,
      type: 'vacant',
      subject: '',
      section: ''
    };

    setWeeklySchedule({
      ...weeklySchedule,
      [day]: [...dayPeriods, newPeriod]
    });
  }

  function updatePeriod(day, id, field, value) {
    setWeeklySchedule({
      ...weeklySchedule,
      [day]: weeklySchedule[day].map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  }

  function removePeriodRow(day, id) {
    if (weeklySchedule[day].length === 1) {
      return alert(`${day} must have at least 1 period.`);
    }
    setWeeklySchedule({
      ...weeklySchedule,
      [day]: weeklySchedule[day].filter(p => p.id !== id)
    });
  }

  // Quick Action: Copy Active Day's Schedule to Tuesday through Friday
  function copyActiveDayToAll() {
    const activePeriods = weeklySchedule[activeTabDay];
    const newSched = {};
    DAYS_OF_WEEK.forEach(d => {
      newSched[d] = activePeriods.map(p => ({
        ...p,
        id: `${d.slice(0, 2).toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`
      }));
    });
    setWeeklySchedule(newSched);
    alert(`Copied ${activeTabDay}'s schedule to all Monday–Friday days!`);
  }

  // --- Dynamic Absence Detection Across Date Range ---
  const absentTeacher = teachers.find(t => t.id === absentTeacherId);
  const schoolDaysInRange = getSchoolDaysInRange(startDate, endDate);

  // Group classes detected for each day in range
  const dailyDetectedClasses = schoolDaysInRange.map(dateStr => {
    const weekday = getWeekday(dateStr);
    const daySchedule = getTeacherDaySchedule(absentTeacher, weekday);
    const classes = daySchedule.filter(p => p.type === 'class');
    return {
      date: dateStr,
      weekday,
      classes
    };
  });

  // When teacher or date changes, pre-check all detected classes
  useEffect(() => {
    if (!absentTeacherId) {
      setSelectedTaskKeys([]);
      return;
    }
    const allKeys = [];
    dailyDetectedClasses.forEach(day => {
      day.classes.forEach(cls => {
        allKeys.push(`${day.date}_${cls.id}`);
      });
    });
    setSelectedTaskKeys(allKeys);
  }, [absentTeacherId, startDate, endDate]);

  function toggleTaskKey(key) {
    if (selectedTaskKeys.includes(key)) {
      setSelectedTaskKeys(selectedTaskKeys.filter(k => k !== key));
    } else {
      setSelectedTaskKeys([...selectedTaskKeys, key]);
    }
  }

  // --- Admin Action: Report Absence ---
  async function handleReportAbsence(e) {
    e.preventDefault();
    if (!user) return alert('Only administrators can report absences.');
    if (!absentTeacherId) return alert('Please select an absent teacher.');
    if (selectedTaskKeys.length === 0) return alert('Select at least one period to substitute.');
    if (new Date(endDate) < new Date(startDate)) return alert('End date cannot be before start date.');

    const newRows = [];
    dailyDetectedClasses.forEach(day => {
      // Each day gets a distinct batch_id so the distinct teacher rule runs per school day
      const dailyBatchId = crypto.randomUUID();

      day.classes.forEach(cls => {
        const key = `${day.date}_${cls.id}`;
        if (selectedTaskKeys.includes(key)) {
          newRows.push({
            batch_id: dailyBatchId,
            absence_date: day.date,
            absent_teacher_id: absentTeacherId,
            class_name: `${cls.subject} (${cls.section})`,
            start_time: cls.startTime,
            end_time: cls.endTime,
            period: `${formatTime(cls.startTime)} - ${formatTime(cls.endTime)}`,
            teacher_type: absentTeacher.teacher_type,
            status: 'pending'
          });
        }
      });
    });

    const { error } = await supabase.from('absences').insert(newRows);

    if (!error) {
      setAbsentTeacherId('');
      setSelectedTaskKeys([]);
      fetchData();
    }
  }

  // --- Admin Action: Assign Substitute (+1 Point) ---
  async function handleAssignSub(subTeacher) {
    if (!user) return alert('Only administrators can assign substitutes.');
    if (!activeAbsence) return;

    await supabase.from('absences').update({
      sub_teacher_id: subTeacher.id,
      status: 'covered'
    }).eq('id', activeAbsence.id);

    await supabase.from('teachers').update({
      points: subTeacher.points + 1
    }).eq('id', subTeacher.id);

    setActiveAbsence(null);
    fetchData();
  }

  // --- Admin Action: Add New Teacher ---
  async function handleAddTeacher(e) {
    e.preventDefault();
    if (!user) return alert('Only administrators can add teachers.');

    const { error } = await supabase.from('teachers').insert([
      { 
        name: newTeacherName, 
        department: newTeacherDept, 
        teacher_type: newTeacherType,
        points: Number(newTeacherPoints),
        schedule: weeklySchedule
      }
    ]);

    if (!error) {
      setShowAddTeacher(false);
      setNewTeacherName('');
      setNewTeacherDept('');
      setNewTeacherType('Junior High');
      setNewTeacherPoints(0);
      fetchData();
    }
  }

  // --- Admin Action: Delete Teacher ---
  async function handleDeleteTeacher(id) {
    if (!user) return alert('Only administrators can delete teachers.');
    if (confirm('Are you sure you want to delete this teacher?')) {
      await supabase.from('teachers').delete().eq('id', id);
      fetchData();
    }
  }

  // --- Time Math & Formatting ---
  function toMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  }

  function formatDateFriendly(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // --- DAY-AWARE COMPATIBILITY ENGINE ---
  // Checks candidate's schedule on THAT specific day of the week
  function getCoveringVacantSlot(teacher, dateStr, absStartStr, absEndStr) {
    const weekday = getWeekday(dateStr);
    const daySchedule = getTeacherDaySchedule(teacher, weekday);

    const absStart = toMinutes(absStartStr);
    const absEnd = toMinutes(absEndStr);

    if (absEnd <= absStart) return null;

    // 1. Conflict Check: No teaching class on THAT day during this time
    const hasClassConflict = daySchedule.some(p => {
      if (p.type !== 'class') return false;
      const cStart = toMinutes(p.startTime);
      const cEnd = toMinutes(p.endTime);
      return Math.max(absStart, cStart) < Math.min(absEnd, cEnd);
    });

    if (hasClassConflict) return null;

    // 2. Coverage Check: Has a vacant slot on THAT day covering the entire time window
    const matchingVacant = daySchedule.find(p => {
      if (p.type !== 'vacant') return false;
      const vStart = toMinutes(p.startTime);
      const vEnd = toMinutes(p.endTime);
      return vStart <= absStart && vEnd >= absEnd;
    });

    return matchingVacant || null;
  }

  const sortedRoster = [...teachers].sort((a, b) => a.points - b.points);
  const pendingAbsences = absences.filter(a => a.status === 'pending');
  const coveredAbsences = absences.filter(a => a.status === 'covered');

  const uniqueDates = Array.from(new Set(pendingAbsences.map(a => a.absence_date))).sort();

  const filteredPendingAbsences = pendingAbsences.filter(a => {
    if (dateFilter === 'all') return true;
    return a.absence_date === dateFilter;
  });

  // Enforce Distinct Teacher per Day: Disqualify teachers already subbing for this teacher on this day
  const teachersAlreadyAssignedInThisBatch = activeAbsence
    ? absences
        .filter(a => a.batch_id === activeAbsence.batch_id && a.sub_teacher_id !== null)
        .map(a => a.sub_teacher_id)
    : [];

  const eligibleSubsWithSlots = activeAbsence
    ? teachers
        .filter(t => t.id !== activeAbsence.absent_teacher_id)
        .filter(t => !teachersAlreadyAssignedInThisBatch.includes(t.id))
        .map(t => ({
          teacher: t,
          vacantSlot: getCoveringVacantSlot(t, activeAbsence.absence_date, activeAbsence.start_time, activeAbsence.end_time)
        }))
        .filter(item => item.vacantSlot !== null)
        .filter(item => subTypeFilter === 'all' ? true : item.teacher.teacher_type === subTypeFilter)
        .sort((a, b) => a.teacher.points - b.teacher.points)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* Top Header */}
      <header className="bg-indigo-700 text-white py-4 px-6 shadow flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">SubTrack</h1>
          <span className="text-xs bg-indigo-500 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <Calendar size={12} /> Mon–Fri Timetable Engine
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button 
              onClick={() => setShowAddTeacher(true)}
              className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <UserPlus size={16} /> Add Teacher
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-3 border-l border-indigo-500 pl-3">
              <span className="text-xs text-indigo-100 flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-300" /> Admin Mode
              </span>
              <button 
                onClick={handleLogout}
                className="bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-3.5 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <LogIn size={15} /> Admin Login
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {!user && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
            <span>Viewing as <strong>Teacher / Guest (Read-Only)</strong>. Log in as an administrator to report teacher absences or assign substitutes.</span>
            <button onClick={() => setShowLoginModal(true)} className="underline font-bold hover:text-amber-950 cursor-pointer">Log In</button>
          </div>
        )}

        {/* Counter Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Junior High Faculty</p>
              <h2 className="text-2xl font-bold text-teal-600">{teachers.filter(t => t.teacher_type === 'Junior High').length}</h2>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200">JHS</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Senior High Faculty</p>
              <h2 className="text-2xl font-bold text-purple-600">{teachers.filter(t => t.teacher_type === 'Senior High').length}</h2>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">SHS</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Pending Tasks</p>
              <h2 className="text-2xl font-bold text-amber-600">{pendingAbsences.length}</h2>
            </div>
            <Clock className="text-amber-500" size={26} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Completed Covers</p>
              <h2 className="text-2xl font-bold text-emerald-600">{coveredAbsences.length}</h2>
            </div>
            <CheckCircle className="text-emerald-500" size={26} />
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Absence Logger & Tasks */}
          <div className="lg:col-span-7 space-y-6">

            {/* Admin: Report Absent Teacher with Mon-Fri Detection */}
            {user && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <UserX size={18} className="text-red-500" /> Report Absent Teacher / Leave
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a faculty member and date range. The system checks each day's specific schedule.
                  </p>
                </div>
                
                <form onSubmit={handleReportAbsence} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Select Absent Faculty Member</label>
                    <select 
                      value={absentTeacherId} 
                      onChange={e => setAbsentTeacherId(e.target.value)}
                      required
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Choose teacher...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          [{t.teacher_type === 'Junior High' ? 'JHS' : 'SHS'}] {t.name} ({t.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Picker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1 flex items-center gap-1">
                        <Calendar size={13} className="text-indigo-600" /> Leave Start Date
                      </label>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => {
                          setStartDate(e.target.value);
                          if (new Date(e.target.value) > new Date(endDate)) {
                            setEndDate(e.target.value);
                          }
                        }}
                        required
                        className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1 flex items-center gap-1">
                        <Calendar size={13} className="text-indigo-600" /> Leave End Date
                      </label>
                      <input 
                        type="date" 
                        value={endDate} 
                        min={startDate}
                        onChange={e => setEndDate(e.target.value)}
                        required
                        className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div className="md:col-span-2 text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex items-center justify-between">
                      <span><strong>Total School Days:</strong> {schoolDaysInRange.length} day(s) (Weekends auto-excluded)</span>
                      <span><strong>{selectedTaskKeys.length}</strong> tasks will be generated</span>
                    </div>
                  </div>

                  {/* Day-by-Day Teaching Classes Detected */}
                  {absentTeacherId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-indigo-600" /> Classes Detected by Day:
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {selectedTaskKeys.length} period(s) selected
                        </span>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {dailyDetectedClasses.map(day => (
                          <div key={day.date} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-b border-slate-100 pb-1">
                              <span className="text-indigo-700">{formatDateFriendly(day.date)} ({day.weekday})</span>
                              <span className="text-slate-400 font-normal">{day.classes.length} class(es)</span>
                            </div>

                            {day.classes.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic py-1">No teaching classes on this day.</p>
                            ) : (
                              day.classes.map(cls => {
                                const key = `${day.date}_${cls.id}`;
                                return (
                                  <label key={key} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded cursor-pointer select-none text-xs">
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="checkbox"
                                        checked={selectedTaskKeys.includes(key)}
                                        onChange={() => toggleTaskKey(key)}
                                        className="w-3.5 h-3.5 rounded text-indigo-600"
                                      />
                                      <span className="font-semibold text-slate-800">{cls.subject} ({cls.section})</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500">
                                      {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button 
                      type="submit" 
                      disabled={!absentTeacherId || selectedTaskKeys.length === 0}
                      className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Layers size={16} /> Generate {selectedTaskKeys.length} Substitution Tasks
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Unassigned Tasks with Date Filter Tabs */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-800">Unassigned Tasks</h2>
                <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-medium">1 Unique Sub / Day</span>
              </div>

              {uniqueDates.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button 
                    onClick={() => setDateFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${dateFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    All Dates ({pendingAbsences.length})
                  </button>
                  {uniqueDates.map(d => (
                    <button 
                      key={d}
                      onClick={() => setDateFilter(d)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 cursor-pointer ${dateFilter === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {formatDateFriendly(d)}
                    </button>
                  ))}
                </div>
              )}

              {filteredPendingAbsences.length === 0 ? (
                <p className="text-sm text-slate-400 italic py-3 text-center">No unassigned period tasks for this selection.</p>
              ) : (
                <div className="space-y-3">
                  {filteredPendingAbsences.map(item => {
                    const absent = teachers.find(t => t.id === item.absent_teacher_id);
                    return (
                      <div key={item.id} className="p-3.5 border border-amber-200 bg-amber-50/50 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <Calendar size={11} /> {formatDateFriendly(item.absence_date)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.teacher_type === 'Junior High' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.teacher_type === 'Junior High' ? 'JHS' : 'SHS'}
                            </span>
                          </div>
                          <p className="font-semibold text-sm text-slate-800 mt-1">{absent?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-600 font-medium">{item.class_name}</p>
                          <span className="inline-block mt-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            <Clock size={11} className="inline mr-1 text-slate-400" />
                            {formatTime(item.start_time)} - {formatTime(item.end_time)}
                          </span>
                        </div>
                        {user ? (
                          <button 
                            onClick={() => {
                              setActiveAbsence(item);
                              setSubTypeFilter('all');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                          >
                            Assign Sub
                          </button>
                        ) : (
                          <span className="text-xs bg-amber-200/70 text-amber-800 font-medium px-2.5 py-1 rounded-md">Pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold mb-3">Recent Substitution History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="py-2 px-3">Date & Time</th>
                      <th className="py-2 px-3">Class</th>
                      <th className="py-2 px-3">Absent Teacher</th>
                      <th className="py-2 px-3">Assigned Sub</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coveredAbsences.length === 0 ? (
                      <tr><td colSpan="4" className="py-4 text-center text-xs text-slate-400 italic">No substitution history yet.</td></tr>
                    ) : (
                      coveredAbsences.map(item => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 text-slate-700 font-medium">
                            <span className="block text-xs font-bold text-indigo-700">{formatDateFriendly(item.absence_date)}</span>
                            <span className="text-[11px] text-slate-400">{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium">{item.class_name}</td>
                          <td className="py-2 px-3 text-red-600 font-medium">
                            {teachers.find(t => t.id === item.absent_teacher_id)?.name}
                          </td>
                          <td className="py-2 px-3 text-indigo-700 font-medium">
                            <span className="flex items-center gap-1">
                              <ArrowRight size={12} className="text-slate-300" /> 
                              {teachers.find(t => t.id === item.sub_teacher_id)?.name}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: Faculty Roster with Mon-Fri Timetable */}
          <div className="lg:col-span-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm sticky top-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-base font-bold">Faculty Roster & Schedules</h2>
                  <p className="text-xs text-slate-400">Ranked by lowest sub points</p>
                </div>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">1 sub = 1 pt</span>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {sortedRoster.map((teacher, index) => (
                  <div key={teacher.id} className={`p-3 rounded-xl border ${index === 0 ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/40'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{teacher.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            teacher.teacher_type === 'Junior High' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {teacher.teacher_type === 'Junior High' ? 'JHS' : 'SHS'}
                          </span>
                          {index === 0 && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">Top Priority</span>}
                        </div>
                        <p className="text-xs text-slate-500">{teacher.department}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                          {teacher.points} pts
                        </span>
                        {user && (
                          <button 
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                            title="Remove Teacher"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mon - Fri Breakdown Pills */}
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <CalendarClock size={11} /> Mon–Fri Schedule Overview:
                      </p>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {DAYS_OF_WEEK.map(d => {
                          const sched = getTeacherDaySchedule(teacher, d);
                          const classesCount = sched.filter(p => p.type === 'class').length;
                          const vacantCount = sched.filter(p => p.type === 'vacant').length;
                          return (
                            <div key={d} className="bg-white p-1 rounded border border-slate-200 text-[10px]">
                              <p className="font-bold text-slate-600">{d.slice(0, 3)}</p>
                              <p className="text-indigo-600 font-medium">{classesCount} cls</p>
                              <p className="text-emerald-600 font-medium">{vacantCount} vac</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Modal: Admin Login */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="text-indigo-600" size={20} /> Administrator Login
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="cursor-pointer"><X size={18} className="text-slate-400" /></button>
            </div>

            {loginError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{loginError}</p>}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Admin Email</label>
                <input 
                  type="email" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)} 
                  required 
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5" 
                  placeholder="admin@school.edu"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Password</label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  required 
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5" 
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition cursor-pointer">
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Teacher with Mon-Fri Day Tabs */}
      {showAddTeacher && user && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold">Add Teacher & Configure Monday–Friday Schedule</h3>
              <button onClick={() => setShowAddTeacher(false)} className="cursor-pointer"><X size={20} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Teacher Full Name</label>
                  <input 
                    type="text" 
                    value={newTeacherName} 
                    onChange={e => setNewTeacherName(e.target.value)} 
                    required 
                    placeholder="e.g. Maria Santos"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Department / Area</label>
                  <input 
                    type="text" 
                    value={newTeacherDept} 
                    onChange={e => setNewTeacherDept(e.target.value)} 
                    required 
                    placeholder="e.g. Science / Mathematics"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Teacher Level</label>
                  <select 
                    value={newTeacherType}
                    onChange={e => setNewTeacherType(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="Junior High">Junior High School (JHS)</option>
                    <option value="Senior High">Senior High School (SHS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Starting Points</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={newTeacherPoints} 
                    onChange={e => setNewTeacherPoints(e.target.value)} 
                    className="w-full text-sm border border-slate-300 rounded-lg p-2" 
                  />
                </div>
              </div>

              {/* MONDAY TO FRIDAY DAY TABS */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarClock size={14} className="text-indigo-600" /> Mon–Fri Timetable Builder
                    </h4>
                    <p className="text-[11px] text-slate-500">Configure each day individually or copy to all days.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={copyActiveDayToAll}
                    className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} /> Copy {activeTabDay} to All Days
                  </button>
                </div>

                {/* Day Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setActiveTabDay(d)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeTabDay === d 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d} ({weeklySchedule[d]?.length || 0})
                    </button>
                  ))}
                </div>

                {/* Periods for Active Tab Day */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700">{activeTabDay} Periods:</span>
                    <button 
                      type="button" 
                      onClick={() => addPeriodRow(activeTabDay)} 
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Add Period to {activeTabDay}
                    </button>
                  </div>

                  {(weeklySchedule[activeTabDay] || []).map((period, index) => (
                    <div key={period.id} className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                        
                        <div className="flex items-center gap-1.5 text-xs">
                          <input 
                            type="time" 
                            step="60"
                            value={period.startTime} 
                            onChange={e => updatePeriod(activeTabDay, period.id, 'startTime', e.target.value)}
                            required
                            className="border border-slate-300 rounded p-1 text-xs"
                          />
                          <span className="text-slate-400">to</span>
                          <input 
                            type="time" 
                            step="60"
                            value={period.endTime} 
                            onChange={e => updatePeriod(activeTabDay, period.id, 'endTime', e.target.value)}
                            required
                            className="border border-slate-300 rounded p-1 text-xs"
                          />
                        </div>

                        <select 
                          value={period.type}
                          onChange={e => updatePeriod(activeTabDay, period.id, 'type', e.target.value)}
                          className={`text-xs font-semibold rounded p-1.5 border cursor-pointer ${
                            period.type === 'vacant' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                          }`}
                        >
                          <option value="vacant">Vacant / Free</option>
                          <option value="class">Class (Subject & Section)</option>
                        </select>

                        <button 
                          type="button" 
                          onClick={() => removePeriodRow(activeTabDay, period.id)} 
                          className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {period.type === 'class' && (
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <input 
                            type="text" 
                            placeholder="Subject (e.g. Science 8)" 
                            value={period.subject}
                            onChange={e => updatePeriod(activeTabDay, period.id, 'subject', e.target.value)}
                            required
                            className="text-xs border border-slate-300 rounded p-1.5"
                          />
                          <input 
                            type="text" 
                            placeholder="Section (e.g. Newton)" 
                            value={period.section}
                            onChange={e => updatePeriod(activeTabDay, period.id, 'section', e.target.value)}
                            required
                            className="text-xs border border-slate-300 rounded p-1.5"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddTeacher(false)} className="px-3 py-2 text-sm border rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition cursor-pointer">Save Teacher & Timetable</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Substitute */}
      {activeAbsence && user && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-bold">Assign Eligible Substitute</h3>
                <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                  {formatDateFriendly(activeAbsence.absence_date)} ({getWeekday(activeAbsence.absence_date)}) &bull; {activeAbsence.class_name} ({formatTime(activeAbsence.start_time)} - {formatTime(activeAbsence.end_time)})
                </p>
              </div>
              <button onClick={() => setActiveAbsence(null)} className="cursor-pointer"><X size={20} className="text-slate-400" /></button>
            </div>

            {/* Rule Banner */}
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-600 shrink-0" />
              <span><strong>{getWeekday(activeAbsence.absence_date)} Matching:</strong> Evaluating candidate teachers' {getWeekday(activeAbsence.absence_date)} schedule. Teachers already assigned on this day are excluded.</span>
            </div>

            {/* Sub Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setSubTypeFilter('all')} 
                className={`flex-1 py-1 rounded font-medium transition cursor-pointer ${subTypeFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
              >
                All Eligible ({eligibleSubsWithSlots.length})
              </button>
              <button 
                onClick={() => setSubTypeFilter('Junior High')} 
                className={`flex-1 py-1 rounded font-medium transition cursor-pointer ${subTypeFilter === 'Junior High' ? 'bg-white shadow text-teal-800' : 'text-slate-500'}`}
              >
                JHS Only
              </button>
              <button 
                onClick={() => setSubTypeFilter('Senior High')} 
                className={`flex-1 py-1 rounded font-medium transition cursor-pointer ${subTypeFilter === 'Senior High' ? 'bg-white shadow text-purple-800' : 'text-slate-500'}`}
              >
                SHS Only
              </button>
            </div>

            {eligibleSubsWithSlots.length === 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-1">
                <p className="text-sm font-bold text-red-700">No available substitutes found</p>
                <p className="text-xs text-red-600">
                  Either no teachers have a vacant slot on {getWeekday(activeAbsence.absence_date)} covering <strong>{formatTime(activeAbsence.start_time)} - {formatTime(activeAbsence.end_time)}</strong>, or available teachers are already assigned to other periods on this date.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {eligibleSubsWithSlots.map(({ teacher: sub, vacantSlot }, index) => (
                  <div key={sub.id} className={`p-3 border rounded-xl flex justify-between items-center ${index === 0 ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{sub.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          sub.teacher_type === 'Junior High' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {sub.teacher_type === 'Junior High' ? 'JHS' : 'SHS'}
                        </span>
                        {index === 0 && <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Top Match (Least Pts)</span>}
                      </div>
                      <p className="text-xs text-slate-500">{sub.department} &bull; Current Points: <strong className="text-slate-700">{sub.points}</strong></p>
                      
                      <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                        <Check size={12} className="text-emerald-600" />
                        Free on {getWeekday(activeAbsence.absence_date)}: {formatTime(vacantSlot.startTime)} - {formatTime(vacantSlot.endTime)}
                      </p>
                    </div>

                    <button 
                      onClick={() => handleAssignSub(sub)} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                    >
                      Assign (+1 pt)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}