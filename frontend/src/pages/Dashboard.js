import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateStudentPDF, generateProfessorPDF, generateAdminPDF } from '../components/PDFExport';
import API from '../services/api';

// ── Constants ──────────────────────────────────────────────────────────────
const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '–';
const fmtDateShort = d =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }) : '–';
const fmtTime = t => (t ? t.substring(0, 5) : '–');

const SB = {
  normale:    { bg:'#dbeafe', color:'#1e40af', label:'Normale'    },
  rattrapage: { bg:'#fef3c7', color:'#92400e', label:'Rattrapage' },
};
const RTL = { amphi:'Amphi', grande_salle:'Grande Salle', petite_salle:'Petite Salle', labo:'Labo' };
const RC = {
  amphi:        { bg:'#dbeafe', color:'#1e40af', border:'#93c5fd', light:'#eff6ff' },
  grande_salle: { bg:'#d1fae5', color:'#065f46', border:'#6ee7b7', light:'#f0fdf4' },
  petite_salle: { bg:'#ffedd5', color:'#9a3412', border:'#fdba74', light:'#fff7ed' },
  labo:         { bg:'#ede9fe', color:'#5b21b6', border:'#c4b5fd', light:'#faf5ff' },
};
const SC = { amphi:3, grande_salle:2, petite_salle:1, labo:1 };

const TIME_SLOTS = [
  { start:'08:00', end:'10:00', label:'08:00 – 10:00' },
  { start:'10:30', end:'12:30', label:'10:30 – 12:30' },
  { start:'14:00', end:'16:00', label:'14:00 – 16:00' },
  { start:'16:30', end:'18:30', label:'16:30 – 18:30' },
];

const buildExamDays = () => {
  const days = [];
  let d = new Date('2026-06-01T12:00:00Z');
  const end = new Date('2026-06-15T12:00:00Z');
  while (d <= end) {
    if (d.getUTCDay() !== 0) days.push(d.toISOString().split('T')[0]);
    const n = new Date(d); n.setUTCDate(n.getUTCDate() + 1); d = n;
  }
  return days;
};
const ALL_DAYS = buildExamDays();

const detectConflicts = exams => {
  const slots = {};
  exams.forEach(ex => {
    if (!ex?.date) return;
    const ds = new Date(ex.date).toISOString().split('T')[0];
    const sk = `${ds}_${ex.heure_debut}`;
    const profs = [...(ex.surveillants || [])];
    if (ex.surveillant) {
      const pid = ex.surveillant._id?.toString();
      if (!profs.find(p => p?._id?.toString() === pid)) profs.push(ex.surveillant);
    }
    profs.forEach(p => {
      if (!p?._id) return;
      const key = `${p._id}_${sk}`;
      if (!slots[key]) slots[key] = { name:`${p.name||''} ${p.prenom||''}`.trim(), modules:[] };
      if (!slots[key].modules.includes(ex.module)) slots[key].modules.push(ex.module);
    });
  });
  return Object.values(slots).filter(x => x.modules.length > 1);
};

// ── Animated counter hook ───────────────────────────────────────────────────
const useCounter = (target, duration = 1400) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let id;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
};

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout, isAdmin, isProfessor, isStudent } = useAuth();
  const navigate = useNavigate();

  const [exams,        setExams]       = useState([]);
  const [users,        setUsers]       = useState([]);
  const [rooms,        setRooms]       = useState([]);
  const [salleExams,   setSalleExams]  = useState([]);
  const [stats,        setStats]       = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [activeTab,    setActiveTab]   = useState('exams');
  const [msg,          setMsg]         = useState('');
  const [generating,   setGenerating]  = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [examFilters,  setExamFilters] = useState({ dept:'', date:'', room:'', session:'' });
  // capacity bar animation
  const [capBars, setCapBars] = useState({});

  const flash = (text, type='ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(''), 5000);
  };

  // Stats fetch (admin)
  useEffect(() => {
    if (!isAdmin) return;
    API.get('/stats/dashboard').then(r => setStats(r.data.stats)).catch(() => {});
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'exams') {
        const ep = isStudent ? '/exams/my-exams' : isProfessor ? '/exams/my-supervisions' : '/exams';
        const res = await API.get(ep);
        setExams(res.data.exams || []);
      }
      if (isAdmin) {
        if (activeTab === 'professors') {
          const res = await API.get('/auth/users');
          setUsers((res.data || []).filter(u => u.role === 'professeur'));
        }
        if (activeTab === 'rooms') {
          const [rR, eR] = await Promise.all([API.get('/rooms'), API.get('/exams')]);
          setRooms(rR.data.rooms || []);
          setSalleExams(eR.data.exams || []);
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [activeTab, isAdmin, isStudent, isProfessor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (isStudent || isProfessor) setActiveTab('exams');
    if (isAdmin) setActiveTab('schedule');
  }, [isAdmin, isProfessor, isStudent]);

  // Trigger capacity bar animations after rooms load
  useEffect(() => {
    if (!rooms.length || !salleExams.length) return;
    const obj = {};
    rooms.forEach(r => {
      const rid = r._id?.toString();
      const n = salleExams.filter(e => (e.salle?._id?.toString() || e.salle?.toString()) === rid).length;
      obj[rid] = Math.min((n / 15) * 100, 100); // 15 exams = full bar
    });
    const t = setTimeout(() => setCapBars(obj), 120);
    return () => clearTimeout(t);
  }, [rooms, salleExams]);

  const handleExportPDF = () => {
    if (!exams.length) return flash('Aucun examen à exporter', 'err');
    if (isStudent)        generateStudentPDF(user, exams);
    else if (isProfessor) generateProfessorPDF(user, exams);
    else                  generateAdminPDF(exams);
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await API.post('/scheduling/auto-generate');
      const r   = res.data.results;
      flash(`✅ ${r?.totalScheduled || 0} examens générés (${r?.totalConflicts || 0} conflits)`);
      API.get('/stats/dashboard').then(r2 => setStats(r2.data.stats)).catch(() => {});
      setActiveTab('exams');
      fetchData();
    } catch (err) {
      flash(err.response?.data?.message || 'Erreur génération', 'err');
    }
    setGenerating(false);
  };

  // ── Computed ────────────────────────────────────────────────────────────
  const allLoaded  = [...new Map([...exams, ...salleExams].map(e => [e._id, e])).values()];
  const conflicts  = detectConflicts(allLoaded);
  const roomsUsed  = new Set(allLoaded.map(e => e.salle?._id).filter(Boolean)).size;
  const totalExams = stats?.exams?.total ?? allLoaded.length;
  const totalStud  = stats?.users?.students ?? 0;

  const depts     = [...new Set(exams.map(e => e.department).filter(Boolean))].sort();
  const examRooms = [...new Set(exams.map(e => e.salle?.nom).filter(Boolean))].sort();
  const hasFilter = examFilters.dept || examFilters.session || examFilters.room || examFilters.date;

  const filteredExams = exams.filter(e => {
    if (examFilters.dept    && e.department !== examFilters.dept)    return false;
    if (examFilters.session && e.session    !== examFilters.session)  return false;
    if (examFilters.room    && e.salle?.nom  !== examFilters.room)    return false;
    if (examFilters.date) {
      const ds = new Date(e.date).toISOString().split('T')[0];
      if (ds !== examFilters.date) return false;
    }
    return true;
  });

  // Countdown for students
  const nextExam = exams
    .filter(e => new Date(e.date) > new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  const countdownText = (() => {
    if (!nextExam) return null;
    const diff = new Date(nextExam.date) - new Date();
    const days = Math.floor(diff / 86400000);
    const hrs  = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `Dans ${days}j ${hrs}h` : `Dans ${hrs}h`;
  })();

  // Professor: exams grouped by date
  const profByDate = (() => {
    if (!isProfessor) return {};
    const map = {};
    exams.forEach(e => {
      const ds = new Date(e.date).toISOString().split('T')[0];
      if (!map[ds]) map[ds] = [];
      map[ds].push(e);
    });
    return map;
  })();

  // ── Animated counter values (admin stats) ───────────────────────────────
  const cntExams  = useCounter(totalExams);
  const cntStuds  = useCounter(totalStud);
  const cntRooms  = useCounter(roomsUsed);
  const cntConfl  = useCounter(conflicts.length);

  // ═══════════════════════════════════════════════════════════════════════
  //  SUB-COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════

  // ── Navbar ──────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img
            src="/images/ESTFBS.jpg"
            alt="EST FBS"
            className="navbar-logo"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
          />
          <span className="navbar-logo-fb" style={{ display:'none' }}>🏫</span>
          <div>
            <div className="navbar-name">EST Fquih Ben Salah</div>
            <div className="navbar-name-sub">Gestion des Examens</div>
          </div>
        </div>
        <div className="navbar-right">
          <div style={{ textAlign:'right' }}>
            <div className="nb-user-name">{user?.prenom} {user?.name}</div>
            <div className="nb-user-sub">{user?.email}</div>
          </div>
          <span className={`role-badge role-${user?.role}`}>
            {user?.role === 'admin' ? '👑 Admin' : user?.role === 'professeur' ? '👨‍🏫 Professeur' : '🎓 Étudiant'}
          </span>
          <button className="nb-logout" onClick={() => { logout(); navigate('/login'); }}>
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );

  // ── Stats bar (admin) ────────────────────────────────────────────────────
  const StatsBar = () => {
    const items = [
      { label:'Total Examens',    val:cntExams, icon:'📋', bg:'#EFF6FF', ic:'#DBEAFE', color:'#1e40af' },
      { label:'Étudiants',        val:cntStuds, icon:'🎓', bg:'#F0FDF4', ic:'#D1FAE5', color:'#065f46' },
      { label:'Salles utilisées', val:cntRooms, icon:'🏫', bg:'#FFFBEB', ic:'#FEF3C7', color:'#92400e' },
      {
        label:'Conflits',         val:cntConfl, icon:'⚠️',
        bg: conflicts.length ? '#FEF2F2' : '#F0FDF4',
        ic: conflicts.length ? '#FEE2E2' : '#D1FAE5',
        color: conflicts.length ? '#dc2626' : '#065f46',
      },
    ];
    return (
      <>
        <div className="stats-bar">
          {items.map(s => (
            <div key={s.label} className="stat-card" style={{ background:s.bg }}>
              <div className="stat-icon" style={{ background:s.ic }}>{s.icon}</div>
              <div>
                <div className="stat-value" style={{ color:s.color }}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
        {conflicts.length > 0 && (
          <div className="conflict-alert">
            <strong>⚠️ Conflits de surveillance :</strong>{' '}
            {conflicts.slice(0, 3).map(c => `${c.name} (${c.modules.join(' & ')})`).join(' | ')}
            {conflicts.length > 3 && ` … +${conflicts.length - 3} autre(s)`}
          </div>
        )}
      </>
    );
  };

  // ── Hero (student/professor) ─────────────────────────────────────────────
  const Hero = () => (
    <div className="hero">
      <div className="hero-bg" />
      <div className="hero-content">
        <div className="hero-greeting">
          {isStudent ? 'Bonjour étudiant(e)' : 'Bonjour professeur'}
        </div>
        <div className="hero-name">{user?.prenom} {user?.name}</div>
        <div className="hero-tags">
          {isStudent && user?.departement && <span className="hero-tag">{user.departement}</span>}
          {isStudent && user?.niveau      && <span className="hero-tag">{user.niveau}</span>}
          {isProfessor && user?.specialization && (
            <span className="hero-tag">{user.specialization}</span>
          )}
          <span className="hero-tag hero-tag-gold">
            {isStudent ? `${exams.length} examen(s)` : `${exams.length} surveillance(s)`}
          </span>
          {isStudent && countdownText && (
            <span className="countdown-chip">⏱ {countdownText}</span>
          )}
        </div>
      </div>
    </div>
  );

  // ── Exam card (student) ──────────────────────────────────────────────────
  const ExamCard = ({ exam, index }) => {
    const sb = SB[exam.session] || SB.normale;
    const tc = RC[exam.salle?.type] || RC.petite_salle;
    return (
      <div className="exam-card" style={{ animationDelay:`${Math.min(index * 0.08, 0.48)}s` }}>
        <div className="ec-head" style={{ borderTop:`3px solid ${tc.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
            <div className="ec-module">{exam.module}</div>
            <span style={{ background:sb.bg, color:sb.color, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600, flexShrink:0 }}>
              {sb.label}
            </span>
          </div>
          <div className="ec-code">{exam.code_module}</div>
        </div>
        <div className="ec-body">
          <div className="ec-row">
            <div className="ec-icon" style={{ background:tc.bg }}>📅</div>
            <span style={{ fontWeight:500 }}>{fmtDate(exam.date)}</span>
          </div>
          <div className="ec-row">
            <div className="ec-icon" style={{ background:'#f0fdf4' }}>🕐</div>
            <span style={{ fontWeight:600, color:'var(--navy)' }}>
              {fmtTime(exam.heure_debut)} – {fmtTime(exam.heure_fin)}
            </span>
          </div>
          <div className="ec-row">
            <div className="ec-icon" style={{ background:tc.bg }}>📍</div>
            <div>
              <div style={{ fontWeight:600, color:'var(--navy)', fontSize:13 }}>{exam.salle?.nom || '–'}</div>
              <div style={{ fontSize:11, color:'var(--gray-400)' }}>
                {RTL[exam.salle?.type] || exam.salle?.type}
                {exam.salle?.capacite ? ` · ${exam.salle.capacite} pl.` : ''}
              </div>
            </div>
          </div>
          <div className="ec-row">
            <div className="ec-icon" style={{ background:'#f0f9ff' }}>👁</div>
            <span>{exam.surveillant?.name} {exam.surveillant?.prenom || '–'}</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Professor surveillance cards ─────────────────────────────────────────
  const ProfView = () => {
    const days = Object.keys(profByDate).sort();
    if (!days.length) return null;
    return (
      <div>
        {days.map((ds, di) => {
          const dayExams = profByDate[ds];
          const isNormale = ds <= '2026-06-07';
          const sb = isNormale ? SB.normale : SB.rattrapage;
          const dayLabel = new Date(ds + 'T12:00:00Z').toLocaleDateString('fr-FR', {
            weekday:'long', day:'2-digit', month:'long', year:'numeric',
          });
          return (
            <div key={ds}>
              <div className="surv-day-header">
                <div className="surv-day-label" style={{ textTransform:'capitalize' }}>{dayLabel}</div>
                <span className="surv-day-badge" style={{ background:sb.bg, color:sb.color }}>
                  {sb.label}
                </span>
              </div>
              {dayExams.map((exam, i) => {
                const tc = RC[exam.salle?.type] || RC.petite_salle;
                return (
                  <div
                    key={exam._id || i}
                    className="surv-card"
                    style={{ animationDelay:`${(di * 0.1 + i * 0.06)}s`, borderLeft:`4px solid ${tc.border}`, cursor:'pointer' }}
                    onClick={() => setSelectedExam(exam)}
                  >
                    <div className="surv-time" style={{ background:tc.color }}>
                      <div className="surv-time-main">{fmtTime(exam.heure_debut)}</div>
                      <div className="surv-time-sub">{fmtTime(exam.heure_fin)}</div>
                    </div>
                    <div className="surv-info">
                      <div className="surv-module">{exam.module}</div>
                      <div className="surv-details">
                        <span className="surv-chip">
                          <span>📍</span>{exam.salle?.nom || '–'}
                        </span>
                        <span className="surv-chip" style={{ background:tc.bg, color:tc.color, borderColor:tc.border }}>
                          {RTL[exam.salle?.type] || exam.salle?.type}
                        </span>
                        {exam.salle?.batiment && (
                          <span className="surv-chip">
                            <span>🏢</span>Bât. {exam.salle.batiment}
                            {exam.salle.etage != null ? ` – Ét. ${exam.salle.etage}` : ''}
                          </span>
                        )}
                        <span className="surv-chip">
                          <span>🎓</span>{exam.nombre_etudiants || 0} ét.
                        </span>
                        <span className="surv-chip">
                          <span>👁</span>{SC[exam.salle?.type] || 1} surv.
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Exam filters ─────────────────────────────────────────────────────────
  const ExamFilters = () => (
    <div className="filter-bar">
      <span style={{ fontSize:12, fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'.7px' }}>Filtrer</span>
      <select value={examFilters.dept}    onChange={e => setExamFilters(f => ({...f, dept:e.target.value}))}>
        <option value="">Toutes filières</option>
        {depts.map(d => <option key={d}>{d}</option>)}
      </select>
      <select value={examFilters.session} onChange={e => setExamFilters(f => ({...f, session:e.target.value}))}>
        <option value="">Les 2 sessions</option>
        <option value="normale">Normale</option>
        <option value="rattrapage">Rattrapage</option>
      </select>
      <select value={examFilters.room}    onChange={e => setExamFilters(f => ({...f, room:e.target.value}))}>
        <option value="">Toutes salles</option>
        {examRooms.map(r => <option key={r}>{r}</option>)}
      </select>
      <input
        type="date" value={examFilters.date}
        onChange={e => setExamFilters(f => ({...f, date:e.target.value}))}
        min="2026-06-01" max="2026-06-15"
        style={{ fontFamily:'inherit' }}
      />
      {hasFilter && (
        <button className="filter-clear" onClick={() => setExamFilters({ dept:'', date:'', room:'', session:'' })}>
          × Effacer
        </button>
      )}
      <span style={{ fontSize:12, color:'var(--gray-400)', marginLeft:'auto' }}>
        {filteredExams.length}{hasFilter ? ` / ${exams.length}` : ''} résultat(s)
      </span>
    </div>
  );

  // ── Exam table ───────────────────────────────────────────────────────────
  const ExamTable = ({ rows, showSurv=false, showSession=false, showDept=false }) => (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Module</th>
            {showDept    && <th>Filière / Sem.</th>}
            {showSession && <th>Session</th>}
            <th>Date</th>
            <th>Horaire</th>
            <th>Salle</th>
            <th>Surveillant(s)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((exam, i) => {
            const sb  = SB[exam.session] || SB.normale;
            const tc  = RC[exam.salle?.type] || { border:'#e2e8f0' };
            const sl  = exam.surveillants?.length ? exam.surveillants : (exam.surveillant ? [exam.surveillant] : []);
            return (
              <tr key={exam._id || i}>
                <td>
                  <div style={{ fontWeight:700, color:'var(--navy)', fontSize:13 }}>{exam.module}</div>
                  <div style={{ fontSize:11, color:'var(--gray-400)', fontFamily:'monospace' }}>{exam.code_module}</div>
                </td>
                {showDept && (
                  <td>
                    <span style={{ background:'#e0f2fe', color:'#0369a1', borderRadius:99, padding:'2px 8px', fontSize:11, fontWeight:600 }}>
                      {exam.department}
                    </span>
                    <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>{exam.semester}</div>
                  </td>
                )}
                {showSession && (
                  <td>
                    <span style={{ background:sb.bg, color:sb.color, borderRadius:99, padding:'2px 9px', fontSize:11, fontWeight:600 }}>
                      {sb.label}
                    </span>
                  </td>
                )}
                <td style={{ whiteSpace:'nowrap' }}>{fmtDate(exam.date)}</td>
                <td style={{ whiteSpace:'nowrap', fontWeight:600, color:'var(--navy)' }}>
                  {fmtTime(exam.heure_debut)} – {fmtTime(exam.heure_fin)}
                </td>
                <td>
                  <div style={{ fontWeight:600, color:'var(--navy)' }}>{exam.salle?.nom || '–'}</div>
                  <div style={{ fontSize:11, color:'var(--gray-400)' }}>
                    {RTL[exam.salle?.type] || exam.salle?.type || ''}
                    {exam.salle?.capacite ? ` · ${exam.salle.capacite} pl.` : ''}
                  </div>
                  {isProfessor && exam.salle?.batiment && (
                    <div style={{ fontSize:11, color:'var(--gray-600)' }}>
                      Bât. {exam.salle.batiment}{exam.salle.etage != null ? ` – Ét. ${exam.salle.etage}` : ''}
                    </div>
                  )}
                </td>
                <td>
                  {showSurv ? (
                    sl.length ? sl.map((s, j) => (
                      <div key={s._id || j} style={{
                        fontSize: j === 0 ? 13 : 12,
                        color:    j === 0 ? 'var(--navy)' : 'var(--gray-400)',
                        fontWeight: j === 0 ? 600 : 400,
                      }}>
                        {s.name} {s.prenom}{j === 0 && sl.length > 1 ? ' ★' : ''}
                      </div>
                    )) : <span style={{ color:'var(--gray-400)' }}>–</span>
                  ) : (
                    <div>{exam.surveillant?.name} {exam.surveillant?.prenom || '–'}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Room timetable ───────────────────────────────────────────────────────
  const RoomTimetable = ({ room }) => {
    const tc  = RC[room.type] || { bg:'#f4f6fa', color:'#475569', border:'#e2e8f0', light:'#f8fafc' };
    const rid = room._id?.toString();
    const rExams = salleExams.filter(e => (e.salle?._id?.toString() || e.salle?.toString()) === rid);
    const days = ALL_DAYS.filter(d => rExams.some(e => new Date(e.date).toISOString().split('T')[0] === d));
    if (!days.length) return (
      <div style={{ padding:'18px 20px', textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>
        Aucun examen planifié dans cette salle
      </div>
    );
    return (
      <div className="tt-outer">
        <table className="tt-table">
          <thead>
            <tr>
              <th className="tt-header-time">Créneau</th>
              {days.map(d => {
                const isN = d <= '2026-06-07';
                return (
                  <th key={d} className="tt-header-day"
                    style={{ background: isN ? '#dbeafe' : '#fef3c7', color: isN ? '#1e40af' : '#92400e' }}>
                    {fmtDateShort(d)}
                    <div style={{ fontWeight:400, fontSize:10, opacity:.8 }}>{isN ? 'Normale' : 'Rattrapage'}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(slot => (
              <tr key={slot.start}>
                <td className="tt-slot-time">{slot.label}</td>
                {days.map(d => {
                  const ex = rExams.find(e =>
                    new Date(e.date).toISOString().split('T')[0] === d && e.heure_debut === slot.start
                  );
                  return ex ? (
                    <td key={d} className="tt-cell-filled" style={{ background:tc.bg }} onClick={() => setSelectedExam(ex)}>
                      <div style={{ fontWeight:700, color:tc.color, fontSize:11, marginBottom:3, lineHeight:1.3 }}>{ex.module}</div>
                      <div style={{ fontSize:10, color:'var(--gray-600)', marginBottom:2 }}>
                        <span style={{ background:tc.bg, border:`1px solid ${tc.border}`, padding:'1px 5px', borderRadius:4, fontWeight:600 }}>
                          {ex.department}
                        </span>
                        {' '}· {ex.nombre_etudiants || 0} ét.
                      </div>
                      {(ex.surveillants || []).slice(0, 2).map((s, si) => (
                        <div key={si} style={{ fontSize:9, color:'var(--gray-400)', lineHeight:1.3 }}>
                          {s.name} {s.prenom}
                        </div>
                      ))}
                    </td>
                  ) : (
                    <td key={d} className="tt-cell-empty" />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Exam detail modal ────────────────────────────────────────────────────
  const ExamModal = () => {
    if (!selectedExam) return null;
    const ex  = selectedExam;
    const tc  = RC[ex.salle?.type] || { bg:'#f4f6fa', color:'#475569' };
    const sb  = SB[ex.session]     || SB.normale;
    const primary = ex.surveillant;
    const extras  = (ex.surveillants || []).filter((_, i) => i > 0);
    return (
      <div className="modal-overlay" onClick={() => setSelectedExam(null)}>
        <div className="modal-panel" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div>
              <div className="modal-title">{ex.module}</div>
              <div className="modal-sub">{ex.code_module} · {ex.department} · {ex.semester}</div>
            </div>
            <button className="modal-close" onClick={() => setSelectedExam(null)}>×</button>
          </div>

          <div className="modal-body">
            {/* Info grid */}
            <div className="info-grid">
              {[
                { l:'Date',      v:fmtDate(ex.date) },
                { l:'Horaire',   v:`${fmtTime(ex.heure_debut)} – ${fmtTime(ex.heure_fin)}` },
                { l:'Salle',     v:ex.salle?.nom || '–' },
                { l:'Type',      v:RTL[ex.salle?.type] || ex.salle?.type || '–', bg:tc.bg, color:tc.color },
                { l:'Session',   v:sb.label, bg:sb.bg, color:sb.color },
                { l:'Étudiants', v:`${ex.nombre_etudiants || ex.etudiants?.length || 0}` },
              ].map(x => (
                <div key={x.l} className="info-cell" style={{ background:x.bg, border:`1px solid ${x.bg||'var(--gray-100)'}` }}>
                  <div className="info-cell-label">{x.l}</div>
                  <div className="info-cell-value" style={{ color:x.color||'var(--navy)' }}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* Surveillants */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:10 }}>
                👁 Surveillants ({(extras.length + (primary ? 1 : 0))} / {SC[ex.salle?.type] || 1} requis)
              </div>
              <div className="surv-list">
                {primary && (
                  <div className="surv-pill surv-pill-primary">
                    <div className="surv-pill-name">{primary.name} {primary.prenom} ★</div>
                    {primary.specialization && <div className="surv-pill-spec">{primary.specialization}</div>}
                    <div className="surv-pill-role">Surveillant principal</div>
                  </div>
                )}
                {extras.map((s, i) => (
                  <div key={s._id || i} className="surv-pill surv-pill-extra">
                    <div className="surv-pill-name">{s.name} {s.prenom}</div>
                    {s.specialization && <div className="surv-pill-spec">{s.specialization}</div>}
                    <div className="surv-pill-role">Co-surveillant</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Students */}
            {ex.etudiants?.length > 0 && (
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--navy)', marginBottom:10 }}>
                  🎓 Étudiants ({ex.etudiants.length})
                </div>
                <div className="students-tbl-wrap">
                  <table className="students-tbl">
                    <thead>
                      <tr>
                        <th>Nom</th><th>Filière</th><th>Niveau</th><th>N° Étudiant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.etudiants.map((s, i) => (
                        <tr key={s._id || i}>
                          <td style={{ fontWeight:500 }}>{s.name} {s.prenom}</td>
                          <td>
                            <span style={{ background:'#e0f2fe', color:'#0369a1', borderRadius:99, padding:'1px 7px', fontSize:11, fontWeight:600 }}>
                              {s.departement || '–'}
                            </span>
                          </td>
                          <td style={{ color:'var(--gray-400)' }}>{s.niveau || '–'}</td>
                          <td style={{ fontFamily:'monospace', fontSize:11 }}>{s.numero_etudiant || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="modal-foot">
            <button className="btn btn-danger btn-sm" onClick={() => generateAdminPDF([ex])}>📄 Exporter PDF</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedExam(null)}>Fermer</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight:'100vh', background:'var(--gray-50)' }}>

      <Navbar />
      <ExamModal />

      <div className="main-wrap page-enter">

        {/* Admin stats bar */}
        {isAdmin && <StatsBar />}

        {/* Hero (student / professor) */}
        {(isStudent || isProfessor) && exams.length > 0 && <Hero />}

        {/* Flash */}
        {msg && (
          <div className={`flash flash-${msg.type === 'err' ? 'err' : 'ok'}`}>
            {msg.text}
          </div>
        )}

        {/* ── Tab bar ── */}
        <div className="tabs-wrap">
          {isProfessor && (
            <button className={`tab ${activeTab === 'exams' ? 'on' : ''}`} onClick={() => setActiveTab('exams')}>
              👁 Mes Surveillances
            </button>
          )}
          {isStudent && (
            <button className={`tab ${activeTab === 'exams' ? 'on' : ''}`} onClick={() => setActiveTab('exams')}>
              📋 Mes Examens
            </button>
          )}
          {isAdmin && (
            <>
              <button className={`tab ${activeTab === 'schedule'    ? 'on' : ''}`} onClick={() => setActiveTab('schedule')}>📅 Planification</button>
              <button className={`tab ${activeTab === 'exams'       ? 'on' : ''}`} onClick={() => setActiveTab('exams')}>📋 Calendrier</button>
              <button className={`tab ${activeTab === 'rooms'       ? 'on' : ''}`} onClick={() => { setActiveTab('rooms'); setExpandedRoom(null); }}>🏫 Salles & Planning</button>
              <button className={`tab ${activeTab === 'professors'  ? 'on' : ''}`} onClick={() => setActiveTab('professors')}>👨‍🏫 Professeurs</button>
            </>
          )}
          {exams.length > 0 && (
            <button className="tab-export" onClick={handleExportPDF} style={{ marginLeft:'auto' }}>
              📄 Exporter PDF
            </button>
          )}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:80, gap:16 }}>
            <div className="spinner spinner-lg spinner-navy" />
            <span style={{ color:'var(--gray-400)', fontSize:14 }}>Chargement…</span>
          </div>
        ) : (
          <>

            {/* ── EXAMS TAB ── */}
            {activeTab === 'exams' && (
              <div>
                {exams.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">{isProfessor ? '👨‍🏫' : isStudent ? '🎓' : '📅'}</div>
                    <div className="empty-state-title">
                      {isProfessor ? 'Aucune surveillance assignée' : isStudent ? 'Aucun examen planifié' : 'Aucun examen planifié'}
                    </div>
                    <div className="empty-state-text">
                      {isAdmin ? 'Utilisez l\'onglet Planification pour générer les examens.' : 'Les examens apparaîtront ici une fois la planification effectuée.'}
                    </div>
                    {isAdmin && (
                      <button className="btn btn-green btn-lg" style={{ marginTop:20 }} onClick={handleAutoGenerate} disabled={generating}>
                        {generating ? <><span className="spinner" /> Génération…</> : '🤖 Générer les examens'}
                      </button>
                    )}
                  </div>
                ) : isStudent ? (
                  <>
                    {!exams.length && <Hero />}
                    <div className="exams-grid">
                      {exams.map((e, i) => <ExamCard key={e._id || i} exam={e} index={i} />)}
                    </div>
                  </>
                ) : isProfessor ? (
                  <ProfView />
                ) : (
                  <>
                    <ExamFilters />
                    <ExamTable rows={filteredExams} showSurv showSession showDept />
                  </>
                )}
              </div>
            )}

            {/* ── SCHEDULE TAB (admin) ── */}
            {activeTab === 'schedule' && isAdmin && (
              <div className="schedule-card">
                <h3 style={{ margin:'0 0 6px', color:'var(--navy)', fontSize:18, fontWeight:800 }}>
                  🤖 Génération automatique du planning
                </h3>
                <p style={{ color:'var(--gray-400)', fontSize:13, marginBottom:4 }}>
                  Génère l'intégralité du calendrier d'examens selon les règles ci-dessous.
                </p>
                <ul className="schedule-rules">
                  <li><strong>Session normale</strong> · 01 – 07 juin 2026 · Semestres S1, S3, S5</li>
                  <li><strong>Session rattrapage</strong> · 08 – 15 juin 2026 · Semestres S2, S4, S6</li>
                  <li>4 créneaux/jour · 08h–10h · 10h30–12h30 · 14h–16h · 16h30–18h30</li>
                  <li>Max <strong>7 examens / filière / semestre</strong> (priorité par crédits)</li>
                  <li>Max 2 examens / jour / étudiant · sans chevauchement</li>
                  <li>Amphi = 3 surveillants · Grande Salle = 2 · Petite Salle / Labo = 1</li>
                </ul>
                <button
                  className="btn btn-green btn-lg"
                  onClick={handleAutoGenerate}
                  disabled={generating}
                >
                  {generating ? <><span className="spinner" /> Génération en cours…</> : '🤖 Lancer la génération'}
                </button>
              </div>
            )}

            {/* ── ROOMS & PLANNING TAB (admin) ── */}
            {activeTab === 'rooms' && isAdmin && (
              <div>
                {/* Room cards */}
                <div className="rooms-grid">
                  {rooms.map((r, ri) => {
                    const tc  = RC[r.type] || { bg:'#f4f6fa', color:'#475569', border:'#e2e8f0', light:'#f8fafc' };
                    const rid = r._id?.toString();
                    const cnt = salleExams.filter(e => (e.salle?._id?.toString() || e.salle?.toString()) === rid).length;
                    const isOn = expandedRoom === rid;
                    return (
                      <div
                        key={r._id}
                        className={`room-card${isOn ? ' rm-on' : ''}`}
                        style={{
                          animationDelay:`${ri * 0.06}s`,
                          '--rc-border': tc.border,
                          '--rc-bg': tc.light,
                        }}
                        onClick={() => setExpandedRoom(isOn ? null : rid)}
                      >
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)', marginBottom:2 }}>{r.nom}</div>
                        <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:8 }}>
                          Bât. {r.batiment} · Étage {r.etage}
                        </div>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
                          <span style={{ background:tc.bg, color:tc.color, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600 }}>
                            {RTL[r.type] || r.type}
                          </span>
                          <span style={{ background:'var(--gray-50)', color:'var(--gray-600)', padding:'2px 9px', borderRadius:99, fontSize:11 }}>
                            {r.capacite} pl.
                          </span>
                          {cnt > 0 && (
                            <span style={{ background:tc.bg, color:tc.color, padding:'2px 9px', borderRadius:99, fontSize:11, fontWeight:600 }}>
                              {cnt} exam.
                            </span>
                          )}
                        </div>
                        {/* Capacity bar */}
                        <div className="cap-bar-wrap">
                          <div className="cap-bar-labels">
                            <span>Charge planning</span>
                            <span>{cnt} exam.</span>
                          </div>
                          <div className="cap-bar-track">
                            <div className="cap-bar-fill" style={{ width:`${capBars[rid] || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Timetable panel */}
                {expandedRoom ? (
                  rooms.filter(r => r._id?.toString() === expandedRoom).map(r => {
                    const tc = RC[r.type] || { bg:'#f4f6fa', color:'#475569', border:'#e2e8f0', light:'#f8fafc' };
                    return (
                      <div key={r._id} style={{ background:'white', borderRadius:'var(--radius-lg)', overflow:'hidden', border:`2px solid ${tc.border}`, animation:'fadeInUp .3s ease' }}>
                        {/* Room header */}
                        <div style={{ background:tc.light, padding:'12px 18px', borderBottom:`1px solid ${tc.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>{r.nom}</div>
                              <div style={{ fontSize:11, color:'var(--gray-400)' }}>Bât. {r.batiment} – Étage {r.etage}</div>
                            </div>
                            <span style={{ background:tc.bg, color:tc.color, padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600 }}>
                              {RTL[r.type] || r.type}
                            </span>
                          </div>
                          <div style={{ display:'flex', gap:14, fontSize:13, color:'var(--gray-400)' }}>
                            <span>🪑 {r.capacite} places</span>
                            <span>👁 {SC[r.type] || 1} surv. requis</span>
                            <span style={{ color:tc.color, fontWeight:600 }}>
                              {salleExams.filter(e => (e.salle?._id?.toString() || e.salle?.toString()) === r._id?.toString()).length} examen(s)
                            </span>
                          </div>
                        </div>
                        <RoomTimetable room={r} />
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign:'center', padding:'30px 20px', background:'white', borderRadius:'var(--radius-lg)', border:'2px dashed var(--gray-200)', color:'var(--gray-400)', fontSize:14 }}>
                    Cliquez sur une salle pour afficher son planning détaillé
                  </div>
                )}
              </div>
            )}

            {/* ── PROFESSORS TAB (admin) ── */}
            {activeTab === 'professors' && isAdmin && (
              <div className="prof-table-wrap">
                <h3 style={{ margin:'0 0 16px', color:'var(--navy)', fontSize:16, fontWeight:700 }}>
                  👨‍🏫 Professeurs & Surveillants ({users.length})
                </h3>
                <table className="prof-table">
                  <thead>
                    <tr>
                      <th>Nom complet</th>
                      <th>Adresse e-mail</th>
                      <th>Spécialisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id || u.id}>
                        <td style={{ fontWeight:600, color:'var(--navy)' }}>{u.name} {u.prenom}</td>
                        <td style={{ color:'var(--gray-400)', fontSize:13 }}>{u.email}</td>
                        <td style={{ fontSize:13 }}>
                          {u.specialization
                            ? <span style={{ background:'var(--gray-50)', padding:'2px 9px', borderRadius:6, border:'1px solid var(--gray-100)' }}>{u.specialization}</span>
                            : <span style={{ color:'var(--gray-400)' }}>–</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
