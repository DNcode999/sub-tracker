import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Users, Clock, CheckCircle, AlertTriangle, UserPlus, 
  ArrowRight, X, LogIn, LogOut, ShieldCheck, Trash2, 
  CalendarClock, Plus, CheckSquare, Layers, Check, ArrowRightLeft, UserX,
  Calendar, Copy, Coffee, LogOut as DismissalIcon, Loader2
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function App() {
  const [teachers, setTeachers] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [isLoggingAbsence, setIsLoggingAbsence] = useState(false);

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
  const [selectedTaskKeys, setSelectedTaskKeys] = useState([]);

  // Modals & Filters
  const [activeAbsence, setActiveAbsence] = useState(null);
  const [subTypeFilter, setSubTypeFilter] = useState('all');
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
      { id: 'm1', startTime: '07:30', endTime: '08:30', type: 'class', subject: 'Math 7', section: 'Diamond' },
      { id: 'm2', startTime: '08:30', endTime: '10:00', type: 'vacant', subject: '', section: '' },
      { id: 'm3', startTime: '12:00', endTime: '13:00', type: 'break', subject: '', section: '' }
    ],
    Tuesday: [
      { id: 't1', startTime: '08:00', endTime: '09:30', type: 'vacant', subject: '', section: '' },
      { id: 't2', startTime: '09:30', endTime: '11:00', type: 'vacant', subject: '', section: '' }
    ],
    Wednesday: [
      { id: 'w1', startTime: '07:30', endTime: '08:30', type: 'vacant', subject: '', section: '' },
      { id: 'w2', startTime: '08:30', endTime: '10:00', type: 'vacant', subject: '', section: '' }
    ],
    Thursday: [
      { id: 'th1', startTime: '08:00', endTime: '09:30', type: 'vacant', subject: '', section: '' },
      { id: 'th2', startTime: '09:30', endTime: '11:00', type: 'vacant', subject: '', section: '' }
    ],
    Friday: [
      { id: 'f1', startTime: '07:30', endTime: '09:30', type: 'vacant', subject: '', section: '' },
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
    const { data: teacherData, error: tErr } = await supabase.from('teachers').select('*');
    const { data: absenceData, error: aErr } = await supabase.from('absences').select('*').order('absence_date', { ascending: true });

    if (tErr) console.error('Error fetching teachers:', tErr);
    if (aErr) console.error('Error fetching absences:', aErr);

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

  function getWeekday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  function getTeacherDaySchedule(teacher, dayName) {
    if (!teacher || !teacher.schedule) return [];
    if (!Array.isArray(teacher.schedule) && typeof teacher.schedule === 'object') {
      return teacher.schedule[dayName] || [];
    }
    if (Array.isArray(teacher.schedule)) {
      return teacher.schedule;
    }
    return [];
  }

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

  // --- Schedule Builder Handlers ---
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
    alert(`Copied ${activeTabDay}'s schedule to Monday–Friday!`);
  }

  const absentTeacher = teachers.find(t => t.id === absentTeacherId);
  const schoolDaysInRange = getSchoolDaysInRange(startDate, endDate);

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
    if (!user) return alert('Only administrators can report absences. Please log in.');
    if (!absentTeacherId) return alert('Please select an absent teacher.');
    if (selectedTaskKeys.length === 0) return alert('Select at least one period to substitute.');
    if (new Date(endDate) < new Date(startDate)) return alert('End date cannot be before start date.');

    setIsLoggingAbsence(true);

    const newRows = [];
    dailyDetectedClasses.forEach(day => {
      const dailyBatchId = crypto.randomUUID();

      day.classes.forEach(cls => {
        const key = `${day.date}_${cls.id}`;
        if (selectedTaskKeys.includes(key)) {
          newRows.push({
            batch_id: dailyBatchId,
            absence_date: day.date,
            absent_teacher_id: absentTeacherId,
            class_name: `${cls.subject || 'Class'} (${cls.section || 'General'})`,
            start_time: cls.startTime,
            end_time: cls.endTime,
            period: `${formatTime(cls.startTime)} - ${formatTime(cls.endTime)}`,
            teacher_type: absentTeacher?.teacher_type || 'Junior High',
            status: 'pending'
          });
        }
      });
    });

    const { error } = await supabase.from('absences').insert(newRows);

    setIsLoggingAbsence(false);

    if (error) {
      console.error('Error logging absence:', error);
      alert('Failed to log absence: ' + error.message);
      return;
    }

    setAbsentTeacherId('');
    setSelectedTaskKeys([]);
    fetchData();
  }

  // --- Admin Action: Assign Substitute (+1 Point) ---
  async function handleAssignSub(subTeacher) {
    if (!user) return alert('Only administrators can assign substitutes.');
    if (!activeAbsence) return;

    const { error: absErr } = await supabase.from('absences').update({
      sub_teacher_id: subTeacher.id,
      status: 'covered'
    }).eq('id', activeAbsence.id);

    if (absErr) {
      alert('Error assigning sub: ' + absErr.message);
      return;
    }

    const { error: tErr } = await supabase.from('teachers').update({
      points: subTeacher.points + 1
    }).eq('id', subTeacher.id);

    if (tErr) {
      alert('Error updating teacher points: ' + tErr.message);
    }

    setActiveAbsence(null);
    fetchData();
  }

  // --- Admin Action: Add New Teacher (Department is now OPTIONAL) ---
  async function handleAddTeacher(e) {
    e.preventDefault();
    if (!user) return alert('Only administrators can add teachers. Please log in.');
    if (!newTeacherName.trim()) return alert('Please enter the teacher full name.');

    setIsSavingTeacher(true);

    const { error } = await supabase.from('teachers').insert([
      { 
        name: newTeacherName.trim(), 
        department: newTeacherDept.trim() || null, // Stores clean null/empty if omitted
        teacher_type: newTeacherType,
        points: Number(newTeacherPoints) || 0,
        schedule: weeklySchedule
      }
    ]);

    setIsSavingTeacher(false);

    if (error) {
      console.error('Supabase Save Error:', error);
      alert('Database error: ' + error.message + '\n\nIf error persists, run: alter table teachers alter column department drop not null; in Supabase SQL editor.');
      return;
    }

    setShowAddTeacher(false);
    setNewTeacherName('');
    setNewTeacherDept('');
    setNewTeacherType('Junior High');
    setNewTeacherPoints(0);
    fetchData();
    alert('Teacher saved successfully!');
  }

  // --- Admin Action: Delete Teacher ---
  async function handleDeleteTeacher(id) {
    if (!user) return alert('Only administrators can delete teachers.');
    if (confirm('Are you sure you want to delete this teacher?')) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) {
        alert('Error deleting teacher: ' + error.message);
      } else {
        fetchData();
      }
    }
  }

  // --- Helpers ---
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

  function getCoveringVacantSlot(teacher, dateStr, absStartStr, absEndStr) {
    const weekday = getWeekday(dateStr);
    const daySchedule = getTeacherDaySchedule(teacher, weekday);

    const absStart = toMinutes(absStartStr);
    const absEnd = toMinutes(absEndStr);

    if (absEnd <= absStart) return null;

    const hasConflict = daySchedule.some(p => {
      if (p.type === 'vacant') return false;
      const pStart = toMinutes(p.startTime);
      const pEnd = toMinutes(p.endTime);
      return Math.max(absStart, pStart) < Math.min(absEnd, pEnd);
    });

    if (hasConflict) return null;

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
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      
      {/* Top Header */}
      <header className="bg-indigo-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 sm:p-2 bg-indigo-600 rounded-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">SubTrack</h1>
                <span className="text-[10px] sm:text-xs text-indigo-200 block sm:inline">
                  Mon–Fri Timetable & Duty Engine
                </span>
              </div>
            </div>

            {user ? (
              <span className="sm:hidden text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} /> Admin
              </span>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="sm:hidden text-xs bg-white text-indigo-700 font-bold px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
              >
                Log In
              </button>
            )}
          </div>

          <div className="flex items-center justify-between w-full sm:w-auto gap-2">
            {user && (
              <button 
                onClick={() => setShowAddTeacher(true)}
                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
              >
                <UserPlus size={16} /> Add Teacher
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2 border-l border-indigo-500/50 pl-2 sm:pl-3">
                <span className="hidden sm:flex text-xs text-indigo-100 items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-300" /> Admin
                </span>
                <button 
                  onClick={handleLogout}
                  className="bg-indigo-800 hover:bg-indigo-900 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <LogOut size={14} /> <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="hidden sm:flex bg-white text-indigo-700 hover:bg-indigo-50 px-3.5 py-1.5 rounded-lg text-sm font-semibold items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <LogIn size={15} /> Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">

        {!user && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
            <span>
              <AlertTriangle size={14} className="inline mr-1 text-amber-600" />
              Viewing as <strong>Teacher / Guest (Read-Only)</strong>. Log in as an administrator to report teacher absences or assign substitutes.
            </span>
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="font-bold underline text-amber-950 hover:text-black cursor-pointer self-end sm:self-auto"
            >
              Log In
            </button>
          </div>
        )}

        {/* Counter Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Junior High</p>
              <h2 className="text-xl sm:text-2xl font-bold text-teal-600">{teachers.filter(t => t.teacher_type === 'Junior High').length}</h2>
            </div>
            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-teal-50 text-teal-700 border border-teal-200">JHS</span>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Senior High</p>
              <h2 className="text-xl sm:text-2xl font-bold text-purple-600">{teachers.filter(t => t.teacher_type === 'Senior High').length}</h2>
            </div>
            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">SHS</span>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
              <h2 className="text-xl sm:text-2xl font-bold text-amber-600">{pendingAbsences.length}</h2>
            </div>
            <Clock className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Covered</p>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600">{coveredAbsences.length}</h2>
            </div>
            <CheckCircle className="text-emerald-500 w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* Left Column: Absence Logger & Tasks */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">

            {/* Admin: Report Absent Teacher */}
            {user && (
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
                <div>
                  <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <UserX size={18} className="text-red-500" /> Report Absent Teacher / Leave
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a faculty member and date range. Teaching classes are automatically detected.
                  </p>
                </div>
                
                <form onSubmit={handleReportAbsence} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Select Absent Faculty Member</label>
                    <select 
                      value={absentTeacherId} 
                      onChange={e => setAbsentTeacherId(e.target.value)}
                      required
                      className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Choose teacher...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          [{t.teacher_type === 'Junior High' ? 'JHS' : 'SHS'}] {t.name} {t.department ? `(${t.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Picker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1 flex items-center gap-1">
                        <Calendar size={13} className="text-indigo-600" /> Start Date
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
                        className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1 flex items-center gap-1">
                        <Calendar size={13} className="text-indigo-600" /> End Date
                      </label>
                      <input 
                        type="date" 
                        value={endDate} 
                        min={startDate}
                        onChange={e => setEndDate(e.target.value)}
                        required
                        className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2 text-xs text-indigo-700 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                      <span><strong>Total School Days:</strong> {schoolDaysInRange.length} day(s) (Weekends auto-excluded)</span>
                      <span><strong>{selectedTaskKeys.length}</strong> tasks calculated</span>
                    </div>
                  </div>

                  {/* Teaching Classes Checklist */}
                  {absentTeacherId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-indigo-600" /> Teaching Classes Requiring Subs:
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {selectedTaskKeys.length} class(es) selected
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
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
                                        className="w-4 h-4 rounded text-indigo-600"
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
                      disabled={!absentTeacherId || selectedTaskKeys.length === 0 || isLoggingAbsence}
                      className="w-full sm:w-auto bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      {isLoggingAbsence ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Logging Absences...
                        </>
                      ) : (
                        <>
                          <Layers size={16} /> Generate {selectedTaskKeys.length} Sub Tasks
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Unassigned Tasks with Date Filter Tabs */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm sm:text-base font-bold text-slate-800">Unassigned Tasks</h2>
                <span className="text-[10px] sm:text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-medium">1 Sub / Period / Day</span>
              </div>

              {uniqueDates.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs touch-pan-x">
                  <button 
                    onClick={() => setDateFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${dateFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}
                  >
                    All ({pendingAbsences.length})
                  </button>
                  {uniqueDates.map(d => (
                    <button 
                      key={d}
                      onClick={() => setDateFilter(d)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 cursor-pointer ${dateFilter === d ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {formatDateFriendly(d)}
                    </button>
                  ))}
                </div>
              )}

              {filteredPendingAbsences.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-400 italic py-4 text-center">No unassigned period tasks for this selection.</p>
              ) : (
                <div className="space-y-2.5">
                  {filteredPendingAbsences.map(item => {
                    const absent = teachers.find(t => t.id === item.absent_teacher_id);
                    return (
                      <div key={item.id} className="p-3 sm:p-3.5 border border-amber-200 bg-amber-50/50 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] sm:text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <Calendar size={11} /> {formatDateFriendly(item.absence_date)}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
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
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 sm:py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer text-center"
                          >
                            Assign Sub
                          </button>
                        ) : (
                          <span className="text-xs bg-amber-200/70 text-amber-800 font-medium px-2.5 py-1 rounded-md self-start sm:self-auto">Pending</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Substitution History Table */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm sm:text-base font-bold mb-3">Recent Substitution History</h2>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="min-w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] sm:text-xs uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3">Absent</th>
                        <th className="py-2.5 px-3">Assigned Sub</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {coveredAbsences.length === 0 ? (
                        <tr><td colSpan="4" className="py-4 text-center text-xs text-slate-400 italic">No substitution history yet.</td></tr>
                      ) : (
                        coveredAbsences.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                              <span className="block text-xs font-bold text-indigo-700">{formatDateFriendly(item.absence_date)}</span>
                              <span className="text-[10px] text-slate-400">{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-medium whitespace-nowrap">{item.class_name}</td>
                            <td className="py-2.5 px-3 text-red-600 font-medium whitespace-nowrap">
                              {teachers.find(t => t.id === item.absent_teacher_id)?.name}
                            </td>
                            <td className="py-2.5 px-3 text-indigo-700 font-medium whitespace-nowrap">
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

          </div>

          {/* Right Column: Faculty Roster */}
          <div className="lg:col-span-5">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm sticky top-20">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold">Faculty Roster & Schedules</h2>
                  <p className="text-[11px] text-slate-400">Ranked by lowest sub points</p>
                </div>
                <span className="text-[10px] sm:text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">1 sub = 1 pt</span>
              </div>

              <div className="space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-1">
                {sortedRoster.map((teacher, index) => (
                  <div key={teacher.id} className={`p-3 rounded-xl border ${index === 0 ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/40'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-800">{teacher.name}</span>
                          <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            teacher.teacher_type === 'Junior High' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {teacher.teacher_type === 'Junior High' ? 'JHS' : 'SHS'}
                          </span>
                          {index === 0 && <span className="text-[9px] sm:text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">Top Priority</span>}
                        </div>
                        {teacher.department && (
                          <p className="text-[11px] text-slate-500">{teacher.department}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {teacher.points} pts
                        </span>
                        {user && (
                          <button 
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                            title="Remove Teacher"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <CalendarClock size={11} /> Mon–Fri Schedule:
                      </p>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {DAYS_OF_WEEK.map(d => {
                          const sched = getTeacherDaySchedule(teacher, d);
                          const classesCount = sched.filter(p => p.type === 'class').length;
                          const vacantCount = sched.filter(p => p.type === 'vacant').length;
                          return (
                            <div key={d} className="bg-white p-1 rounded border border-slate-200 text-[9px] sm:text-[10px]">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="text-indigo-600" size={20} /> Administrator Login
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>

            {loginError && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">{loginError}</p>}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Admin Email</label>
                <input 
                  type="email" 
                  value={loginEmail} 
                  onChange={e => setLoginEmail(e.target.value)} 
                  required 
                  className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2.5" 
                  placeholder="admin@school.edu"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Password</label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  required 
                  className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2.5" 
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition cursor-pointer active:scale-95 shadow-sm">
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Teacher with Optional Department */}
      {showAddTeacher && user && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm sm:text-base font-bold">Add Teacher & Configure Monday–Friday Schedule</h3>
              <button onClick={() => setShowAddTeacher(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Teacher Full Name</label>
                  <input 
                    type="text" 
                    value={newTeacherName} 
                    onChange={e => setNewTeacherName(e.target.value)} 
                    required 
                    placeholder="e.g. Maria Santos"
                    className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2.5" 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Department / Area <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={newTeacherDept} 
                    onChange={e => setNewTeacherDept(e.target.value)} 
                    placeholder="e.g. Science / Mathematics (leave blank if none)"
                    className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2.5" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Teacher Level</label>
                  <select 
                    value={newTeacherType}
                    onChange={e => setNewTeacherType(e.target.value)}
                    className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2.5 font-medium bg-white cursor-pointer"
                  >
                    <option value="Junior High">Junior High School (JHS)</option>
                    <option value="Senior High">Senior High School (SHS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Starting Points</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={newTeacherPoints} 
                    onChange={e => setNewTeacherPoints(e.target.value)} 
                    className="w-full text-base sm:text-sm border border-slate-300 rounded-lg p-2.5" 
                  />
                </div>
              </div>

              {/* Mon-Fri Timetable Builder Container */}
              <div className="border border-slate-200 rounded-xl p-3 sm:p-3.5 bg-slate-50/70 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarClock size={14} className="text-indigo-600" /> Mon–Fri Timetable Builder
                    </h4>
                    <p className="text-[11px] text-slate-500">Pick Teaching Class, Vacant, Break, or Dismissal for each time slot.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={copyActiveDayToAll}
                    className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-200 flex items-center justify-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <Copy size={12} /> Copy {activeTabDay} to All Days
                  </button>
                </div>

                {/* Day Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto touch-pan-x">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setActiveTabDay(d)}
                      className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                        activeTabDay === d 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d.slice(0, 3)} ({weeklySchedule[d]?.length || 0})
                    </button>
                  ))}
                </div>

                {/* Periods for Active Tab Day */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">{activeTabDay} Periods:</span>
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
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        
                        {/* Time Inputs */}
                        <div className="flex items-center gap-2">
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
                        </div>

                        {/* Dropdown with Class, Vacant, Break, Dismissal */}
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <select 
                            value={period.type}
                            onChange={e => updatePeriod(activeTabDay, period.id, 'type', e.target.value)}
                            className={`text-xs font-semibold rounded p-1.5 border cursor-pointer flex-1 sm:flex-initial ${
                              period.type === 'vacant' 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                : period.type === 'class'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                : period.type === 'break'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="vacant">Vacant / Free</option>
                            <option value="class">Teaching Class</option>
                            <option value="break">Break (Lunch / Health)</option>
                            <option value="dismissal">Dismissal</option>
                          </select>

                          <button 
                            type="button" 
                            onClick={() => removePeriodRow(activeTabDay, period.id)} 
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* If Teaching Class, show Subject & Section inputs */}
                      {period.type === 'class' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <input 
                            type="text" 
                            placeholder="Subject (e.g. Science 8)" 
                            value={period.subject}
                            onChange={e => updatePeriod(activeTabDay, period.id, 'subject', e.target.value)}
                            className="text-xs border border-slate-300 rounded p-2"
                          />
                          <input 
                            type="text" 
                            placeholder="Section (e.g. Newton)" 
                            value={period.section}
                            onChange={e => updatePeriod(activeTabDay, period.id, 'section', e.target.value)}
                            className="text-xs border border-slate-300 rounded p-2"
                          />
                        </div>
                      )}

                      {period.type === 'break' && (
                        <p className="text-[11px] text-amber-700 bg-amber-50/60 px-2 py-1 rounded border border-amber-200/60 flex items-center gap-1">
                          <Coffee size={12} /> Lunch / Health Break — Protected time.
                        </p>
                      )}

                      {period.type === 'dismissal' && (
                        <p className="text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center gap-1">
                          <DismissalIcon size={12} /> Dismissal — Teacher is dismissed.
                        </p>
                      )}

                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddTeacher(false)} 
                  disabled={isSavingTeacher}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingTeacher}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingTeacher ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving Teacher...
                    </>
                  ) : (
                    'Save Teacher & Timetable'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Modal: Assign Substitute */}
      {activeAbsence && user && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold">Assign Eligible Substitute</h3>
                <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                  {formatDateFriendly(activeAbsence.absence_date)} ({getWeekday(activeAbsence.absence_date)}) &bull; {activeAbsence.class_name}
                </p>
                <p className="text-[11px] text-slate-500">
                  Time: {formatTime(activeAbsence.start_time)} - {formatTime(activeAbsence.end_time)}
                </p>
              </div>
              <button onClick={() => setActiveAbsence(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start sm:items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>Checking candidate teachers' {getWeekday(activeAbsence.absence_date)} schedule. Teachers on Break, Dismissed, or already assigned on this day are excluded.</span>
            </div>

            <div className="flex items-center gap-1 text-xs bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setSubTypeFilter('all')} 
                className={`flex-1 py-1.5 rounded font-medium transition cursor-pointer text-center ${subTypeFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
              >
                All ({eligibleSubsWithSlots.length})
              </button>
              <button 
                onClick={() => setSubTypeFilter('Junior High')} 
                className={`flex-1 py-1.5 rounded font-medium transition cursor-pointer text-center ${subTypeFilter === 'Junior High' ? 'bg-white shadow text-teal-800' : 'text-slate-500'}`}
              >
                JHS Only
              </button>
              <button 
                onClick={() => setSubTypeFilter('Senior High')} 
                className={`flex-1 py-1.5 rounded font-medium transition cursor-pointer text-center ${subTypeFilter === 'Senior High' ? 'bg-white shadow text-purple-800' : 'text-slate-500'}`}
              >
                SHS Only
              </button>
            </div>

            {eligibleSubsWithSlots.length === 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-1">
                <p className="text-sm font-bold text-red-700">No available substitutes found</p>
                <p className="text-xs text-red-600">
                  Either no teachers have a vacant slot on {getWeekday(activeAbsence.absence_date)} covering <strong>{formatTime(activeAbsence.start_time)} - {formatTime(activeAbsence.end_time)}</strong>, or available teachers are on Break, Dismissed, or already assigned on this date.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {eligibleSubsWithSlots.map(({ teacher: sub, vacantSlot }, index) => (
                  <div key={sub.id} className={`p-3 border rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 ${index === 0 ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-semibold text-slate-800">{sub.name}</p>
                        <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          sub.teacher_type === 'Junior High' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {sub.teacher_type === 'Junior High' ? 'JHS' : 'SHS'}
                        </span>
                        {index === 0 && <span className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Top Match</span>}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {sub.department ? `${sub.department} • ` : ''}Current Points: <strong className="text-slate-700">{sub.points}</strong>
                      </p>
                      
                      <p className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                        <Check size={12} className="text-emerald-600" />
                        Free on {getWeekday(activeAbsence.absence_date)}: {formatTime(vacantSlot.startTime)} - {formatTime(vacantSlot.endTime)}
                      </p>
                    </div>

                    <button 
                      onClick={() => handleAssignSub(sub)} 
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 sm:py-1.5 rounded-lg shadow-sm cursor-pointer transition active:scale-95 text-center"
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