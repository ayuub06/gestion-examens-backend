import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateStudentPDF, generateProfessorPDF, generateAdminPDF } from '../components/PDFExport';
import API from '../services/api';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '-';
const formatTime = (t) => t ? t.substring(0, 5) : '-';

const SESSION_BADGE = {
  normale:    { bg:'#dbeafe', color:'#1e40af', label:'Normale' },
  rattrapage: { bg:'#fef3c7', color:'#92400e', label:'Rattrapage' },
};

const ROOM_TYPE_LABEL = { amphi:'Amphi', grande_salle:'Grande Salle', petite_salle:'Petite Salle', labo:'Labo' };

const btn = (active) => ({
  padding:'8px 16px', borderRadius:'8px', border:'none',
  background: active ? '#0f3b5f' : 'white',
  color:       active ? 'white'   : '#475569',
  fontWeight:'600', cursor:'pointer',
});

const Dashboard = () => {
  const { user, logout, isAdmin, isProfessor, isStudent } = useAuth();
  const navigate = useNavigate();
  const [exams,   setExams]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('exams');
  const [msg, setMsg] = useState('');
  const [generating, setGenerating] = useState(false);

  const flash = (text, type='success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(''), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'exams') {
        let endpoint = '/exams';
        if (isStudent)   endpoint = '/exams/my-exams';
        if (isProfessor) endpoint = '/exams/my-supervisions';
        const res = await API.get(endpoint);
        setExams(res.data.exams || []);
      }
      if (isAdmin) {
        if (activeTab === 'professors') {
          const res = await API.get('/auth/users');
          setUsers((res.data || []).filter(u => u.role === 'professeur'));
        }
        if (activeTab === 'rooms') {
          const res = await API.get('/rooms');
          setRooms(res.data.rooms || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [activeTab, isAdmin, isStudent, isProfessor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (isStudent)   setActiveTab('exams');
    if (isProfessor) setActiveTab('exams');
    if (isAdmin)     setActiveTab('schedule');
  }, [isAdmin, isProfessor, isStudent]);

  const handleExportPDF = () => {
    if (!exams.length) return flash('Aucun examen à exporter', 'error');
    if (isStudent)        generateStudentPDF(user, exams);
    else if (isProfessor) generateProfessorPDF(user, exams);
    else                  generateAdminPDF(exams);
  };

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await API.post('/scheduling/auto-generate');
      const r   = res.data.results;
      flash(`${r?.totalScheduled || 0} examens générés (${r?.totalConflicts || 0} conflits)`);
      setActiveTab('exams');
      fetchData();
    } catch (err) {
      flash(err.response?.data?.message || 'Erreur génération', 'error');
    }
    setGenerating(false);
  };

  // ── render helpers ──────────────────────────────────────────────────────────

  const ExamTable = ({ rows, showSurveillants = false, showSession = false, showDept = false }) => (
    <div style={{ background:'white', borderRadius:'12px', overflow:'auto', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'800px' }}>
        <thead>
          <tr style={{ background:'#0f3b5f', color:'white' }}>
            <th style={{ padding:'12px', textAlign:'left' }}>Module</th>
            {showDept    && <th style={{ padding:'12px', textAlign:'left' }}>Dépt / Sem.</th>}
            {showSession && <th style={{ padding:'12px', textAlign:'left' }}>Session</th>}
            <th style={{ padding:'12px', textAlign:'left' }}>Date</th>
            <th style={{ padding:'12px', textAlign:'left' }}>Horaire</th>
            <th style={{ padding:'12px', textAlign:'left' }}>Salle</th>
            <th style={{ padding:'12px', textAlign:'left' }}>
              {showSurveillants ? 'Surveillant(s)' : 'Surveillant'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((exam, idx) => {
            const sb = SESSION_BADGE[exam.session] || SESSION_BADGE['normale'];
            return (
              <tr key={exam._id || idx} style={{ borderTop:'1px solid #e2e8f0', background: idx%2===0 ? 'white' : '#f8fafc' }}>
                <td style={{ padding:'12px' }}>
                  <div style={{ fontWeight:'700', color:'#0f3b5f' }}>{exam.module}</div>
                  <div style={{ fontSize:'11px', color:'#94a3b8' }}>{exam.code_module}</div>
                </td>
                {showDept && (
                  <td style={{ padding:'12px' }}>
                    <span style={{ background:'#e0f2fe', color:'#0369a1', borderRadius:'12px', padding:'2px 8px', fontSize:'12px', fontWeight:'600' }}>
                      {exam.department}
                    </span>
                    <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'2px' }}>{exam.semester}</div>
                  </td>
                )}
                {showSession && (
                  <td style={{ padding:'12px' }}>
                    <span style={{ background:sb.bg, color:sb.color, borderRadius:'12px', padding:'2px 8px', fontSize:'12px', fontWeight:'600' }}>
                      {sb.label}
                    </span>
                  </td>
                )}
                <td style={{ padding:'12px', whiteSpace:'nowrap' }}>{formatDate(exam.date)}</td>
                <td style={{ padding:'12px', whiteSpace:'nowrap', fontWeight:'600' }}>
                  {formatTime(exam.heure_debut)} – {formatTime(exam.heure_fin)}
                </td>
                <td style={{ padding:'12px' }}>
                  <div style={{ fontWeight:'600' }}>{exam.salle?.nom || '-'}</div>
                  <div style={{ fontSize:'11px', color:'#94a3b8' }}>
                    {ROOM_TYPE_LABEL[exam.salle?.type] || exam.salle?.type || ''}
                    {exam.salle?.capacite ? ` · ${exam.salle.capacite} places` : ''}
                  </div>
                </td>
                <td style={{ padding:'12px' }}>
                  <div>{exam.surveillant?.name} {exam.surveillant?.prenom}</div>
                  {showSurveillants && exam.surveillants?.length > 1 && (
                    <div style={{ fontSize:'11px', color:'#64748b' }}>
                      +{exam.surveillants.length - 1} co-surveillant(s)
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9' }}>

      {/* Nav */}
      <nav style={{ background:'#0f3b5f', color:'white', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:'bold', fontSize:'14px' }}>🏫 EST Fquih Ben Salah – Gestion des Examens</div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontWeight:'600', fontSize:'14px' }}>{user?.name} {user?.prenom}</div>
            <div style={{ fontSize:'12px', opacity:0.8 }}>
              {user?.role === 'admin' ? '👑 Admin' : user?.role === 'professeur' ? '👨‍🏫 Professeur' : '🎓 Étudiant'}
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ background:'#dc2626', color:'white', border:'none', padding:'6px 14px', borderRadius:'6px', cursor:'pointer' }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'20px' }}>

        {/* Welcome */}
        <div style={{ background:'white', borderRadius:'12px', padding:'20px', marginBottom:'20px', borderLeft:'5px solid #0f3b5f' }}>
          <h2 style={{ margin:0, fontSize:'20px', color:'#0f3b5f' }}>Bienvenue, {user?.prenom} {user?.name} !</h2>
          <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:'14px' }}>
            {isAdmin     && '👑 Accès administrateur – planification, salles, professeurs.'}
            {isProfessor && `👨‍🏫 Spécialisation : ${user?.specialization || '-'} — Consultez vos surveillances.`}
            {isStudent   && `🎓 ${user?.departement || '-'} – ${user?.niveau || '-'} — Consultez votre calendrier d'examens.`}
          </p>
        </div>

        {/* Flash */}
        {msg && (
          <div style={{ padding:'12px', borderRadius:'8px', marginBottom:'16px',
            background: msg.type==='error' ? '#fee2e2' : '#d1fae5',
            color:       msg.type==='error' ? '#dc2626' : '#065f46' }}>
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'20px', borderBottom:'1px solid #e2e8f0', paddingBottom:'10px' }}>
          {isProfessor && (
            <button onClick={() => setActiveTab('exams')} style={btn(activeTab==='exams')}>
              📝 Mes Surveillances
            </button>
          )}
          {isStudent && (
            <button onClick={() => setActiveTab('exams')} style={btn(activeTab==='exams')}>
              📝 Mes Examens
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => setActiveTab('schedule')}    style={btn(activeTab==='schedule')}>📅 Planification</button>
              <button onClick={() => setActiveTab('exams')}       style={btn(activeTab==='exams')}>📝 Calendrier Examens</button>
              <button onClick={() => setActiveTab('rooms')}       style={btn(activeTab==='rooms')}>🏫 Salles</button>
              <button onClick={() => setActiveTab('professors')}  style={btn(activeTab==='professors')}>👨‍🏫 Professeurs</button>
            </>
          )}
          {exams.length > 0 && (
            <button onClick={handleExportPDF}
              style={{ marginLeft:'auto', background:'#dc2626', color:'white', border:'none', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontWeight:'600' }}>
              📄 Exporter PDF
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8' }}>⏳ Chargement...</div>
        ) : (
          <>

            {/* ── EXAMS TAB ── */}
            {activeTab === 'exams' && (
              <div>
                {exams.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px', background:'white', borderRadius:'12px' }}>
                    <div style={{ fontSize:'48px', marginBottom:'12px' }}>
                      {isProfessor ? '👨‍🏫' : isStudent ? '🎓' : '📅'}
                    </div>
                    <div style={{ fontSize:'18px', fontWeight:'700', color:'#0f3b5f', marginBottom:'8px' }}>
                      {isProfessor ? 'Aucune surveillance assignée' : isStudent ? 'Aucun examen planifié pour vous' : 'Aucun examen planifié'}
                    </div>
                    <div style={{ color:'#94a3b8', fontSize:'14px' }}>
                      {isAdmin ? 'Utilisez l\'onglet "Planification" pour générer les examens.' : 'Les examens apparaîtront ici une fois la planification effectuée.'}
                    </div>
                    {isAdmin && (
                      <button onClick={handleAutoGenerate} disabled={generating}
                        style={{ marginTop:'16px', background:'#059669', color:'white', border:'none', padding:'10px 24px', borderRadius:'8px', cursor:'pointer', fontWeight:'600' }}>
                        {generating ? '⏳ Génération...' : '🤖 Générer les examens'}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom:'12px', color:'#64748b', fontSize:'14px' }}>
                      {exams.length} examen(s) trouvé(s)
                      {isStudent && ` · ${user?.departement} ${user?.niveau}`}
                    </div>
                    <ExamTable
                      rows={exams}
                      showSurveillants={isAdmin || isProfessor}
                      showSession={true}
                      showDept={isAdmin}
                    />
                  </>
                )}
              </div>
            )}

            {/* ── SCHEDULE TAB (Admin) ── */}
            {activeTab === 'schedule' && isAdmin && (
              <div style={{ maxWidth:'600px' }}>
                <div style={{ background:'white', borderRadius:'12px', padding:'28px' }}>
                  <h3 style={{ margin:'0 0 6px', color:'#0f3b5f' }}>🤖 Génération automatique du planning</h3>
                  <p style={{ margin:'0 0 20px', color:'#64748b', fontSize:'14px', lineHeight:'1.5' }}>
                    Génère l'intégralité du calendrier d'examens selon les règles suivantes :
                  </p>
                  <ul style={{ color:'#475569', fontSize:'14px', lineHeight:'1.8', paddingLeft:'20px', marginBottom:'20px' }}>
                    <li><strong>Session normale</strong> : 01 – 07 juin 2026 · Semestres S1, S3, S5</li>
                    <li><strong>Session rattrapage</strong> : 08 – 15 juin 2026 · Semestres S2, S4, S6</li>
                    <li>4 créneaux / jour : 08h–10h, 10h30–12h30, 14h–16h, 16h30–18h30</li>
                    <li>Max 2 examens / jour / étudiant, sans chevauchement</li>
                    <li>Max 2 surveillances / jour / professeur</li>
                    <li>Attribution de salle selon l'effectif (Amphi ≥ 3 surv., Grande ≥ 2, Petite ≥ 1)</li>
                  </ul>
                  <button onClick={handleAutoGenerate} disabled={generating}
                    style={{ background: generating ? '#94a3b8' : '#059669', color:'white', border:'none', padding:'12px 28px', borderRadius:'8px', cursor: generating ? 'not-allowed' : 'pointer', fontWeight:'600', fontSize:'15px' }}>
                    {generating ? '⏳ Génération en cours...' : '🤖 Lancer la génération'}
                  </button>
                  {generating && (
                    <p style={{ marginTop:'12px', color:'#64748b', fontSize:'13px' }}>
                      Patientez — cette opération peut prendre quelques secondes.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── ROOMS TAB (Admin) ── */}
            {activeTab === 'rooms' && isAdmin && (
              <div>
                <div style={{ marginBottom:'12px', color:'#64748b', fontSize:'14px' }}>{rooms.length} salle(s)</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'12px' }}>
                  {rooms.map(r => {
                    const typeColors = {
                      amphi:        { bg:'#ede9fe', color:'#5b21b6' },
                      grande_salle: { bg:'#dbeafe', color:'#1e40af' },
                      petite_salle: { bg:'#d1fae5', color:'#065f46' },
                      labo:         { bg:'#fef9c3', color:'#854d0e' },
                    };
                    const tc = typeColors[r.type] || { bg:'#f1f5f9', color:'#475569' };
                    const surv = { amphi:3, grande_salle:2, petite_salle:1, labo:1 }[r.type] || 1;
                    return (
                      <div key={r._id} style={{ background:'white', borderRadius:'10px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontWeight:'700', fontSize:'16px', color:'#0f3b5f' }}>{r.nom}</div>
                        <div style={{ fontSize:'12px', color:'#94a3b8', marginBottom:'10px' }}>Bât. {r.batiment} – Étage {r.etage}</div>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <span style={{ background:tc.bg, color:tc.color, padding:'2px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600' }}>
                            {ROOM_TYPE_LABEL[r.type] || r.type || '?'}
                          </span>
                          <span style={{ background:'#f1f5f9', color:'#475569', padding:'2px 10px', borderRadius:'20px', fontSize:'12px' }}>
                            {r.capacite} places
                          </span>
                          <span style={{ background:'#f0fdf4', color:'#166534', padding:'2px 10px', borderRadius:'20px', fontSize:'12px' }}>
                            {surv} surv.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── PROFESSORS TAB (Admin) ── */}
            {activeTab === 'professors' && isAdmin && (
              <div style={{ background:'white', borderRadius:'12px', overflow:'auto', padding:'16px' }}>
                <h3 style={{ margin:'0 0 12px', color:'#0f3b5f' }}>👨‍🏫 Professeurs & Surveillants ({users.length})</h3>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      <th style={{ padding:'10px', textAlign:'left' }}>Nom</th>
                      <th style={{ padding:'10px', textAlign:'left' }}>Email</th>
                      <th style={{ padding:'10px', textAlign:'left' }}>Spécialisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id || u.id} style={{ borderTop:'1px solid #e2e8f0' }}>
                        <td style={{ padding:'10px', fontWeight:'600' }}>{u.name} {u.prenom}</td>
                        <td style={{ padding:'10px', fontSize:'13px', color:'#64748b' }}>{u.email}</td>
                        <td style={{ padding:'10px', fontSize:'13px', color:'#475569' }}>{u.specialization || '-'}</td>
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
};

export default Dashboard;
