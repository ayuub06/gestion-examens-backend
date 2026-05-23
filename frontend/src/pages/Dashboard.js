import { generateStudentPDF, generateProfessorPDF, generateAdminPDF } from '../components/PDFExport';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

const Dashboard = () => {
  const { user, logout, isAdmin, isProfessor, isStudent } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [exams, setExams] = useState([]);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState('exams');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('');
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState('');
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showProfessorForm, setShowProfessorForm] = useState(false);
  const [userFilter, setUserFilter] = useState('all');

   // Debug - Afficher la structure des examens
console.log('=== STRUCTURE DES EXAMENS ===');
console.log('Exams:', exams);
if (exams && exams[0]) {
    console.log('Premier examen:', exams[0]);
    console.log('Clés du premier examen:', Object.keys(exams[0]));
    console.log('Etudiants du premier examen:', exams[0].etudiants);
} 

   const handleExportPDF = () => {
    if (isStudent && user && exams) {
      generateStudentPDF(user, exams);
    } else if (isProfessor && user && exams) {
      generateProfessorPDF(user, exams);
    } else if (isAdmin && exams) {
      generateAdminPDF(exams);
    } else {
      alert('No data to export');
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
  setLoading(true);
  try {
    if (activeTab === 'exams') {
      let endpoint = '/exams';
      if (isStudent)   endpoint = '/exams/my-exams';        // filtered by dept+level
      if (isProfessor) endpoint = '/exams/my-supervisions'; // filtered by surveillant
      const res = await API.get(endpoint);
      console.log('Exams fetched:', res.data.exams?.length);
      setExams(res.data.exams || []);
    }
    else if (activeTab === 'rooms') {
      const res = await API.get('/rooms');
      setRooms(res.data.rooms || []);
    } 
    else if (activeTab === 'users') {
      const res = await API.get('/auth/users');
      setUsers(res.data);
    } 
    else if (activeTab === 'modules') {
      const res = await API.get('/modules');
      setModules(res.data.modules || []);
    }
    else if (activeTab === 'schedule') {
      // Load all data needed for scheduling
      const [modulesRes, roomsRes, usersRes, examsRes] = await Promise.all([
        API.get('/modules'),
        API.get('/rooms'),
        API.get('/auth/users'),
        API.get('/exams')
      ]);
      setModules(modulesRes.data.modules || []);
      setRooms(roomsRes.data.rooms || []);
      setUsers(usersRes.data);
      setExams(examsRes.data.exams || []);
      console.log('Loaded for schedule tab:');
      console.log('  Modules:', modulesRes.data.modules?.length);
      console.log('  Rooms:', roomsRes.data.rooms?.length);
      console.log('  Professors:', usersRes.data.filter(u => u.role === 'professeur').length);
      console.log('  Exams:', examsRes.data.exams?.length);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
  setLoading(false);
};
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    const roleClass = {
      admin: 'role-admin',
      professeur: 'role-professeur',
      etudiant: 'role-etudiant'
    };
    const roleName = {
      admin: 'Admin',
      professeur: 'Professor',
      etudiant: 'Student'
    };
    return (
      <span className={`role-badge ${roleClass[role]}`}>
        {roleName[role]}
      </span>
    );
  };

  const getDepartmentColor = (dept) => {
    return dept === 'GI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post('/auth/admin/create-user', {
        ...formData,
        role: 'etudiant'
      });
      if (response.data.message) {
        setMessage({ type: 'success', text: response.data.message });
        setShowStudentForm(false);
        setFormData({});
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error creating student' });
    }
    setLoading(false);
  };

  const handleCreateProfessor = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post('/auth/admin/create-user', {
        ...formData,
        role: 'professeur'
      });
      if (response.data.message) {
        setMessage({ type: 'success', text: response.data.message });
        setShowProfessorForm(false);
        setFormData({});
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error creating professor' });
    }
    setLoading(false);
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post('/modules', formData);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Module created successfully!' });
        setShowForm(false);
        setFormData({});
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error creating module' });
    }
    setLoading(false);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await API.post('/rooms', formData);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Room created successfully!' });
        setShowForm(false);
        setFormData({});
        fetchData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error creating room' });
    }
    setLoading(false);
  };

  const renderForm = () => {
    if (formType === 'module') {
      return (
        <form onSubmit={handleCreateModule} className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-3">Create New Module</h3>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Module Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="border p-2 rounded" required />
            <input type="text" placeholder="Module Code (e.g., GI301)" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="border p-2 rounded" required />
            <select value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="border p-2 rounded" required>
              <option value="">Select Department</option>
              <option value="GI">GI - Génie Informatique</option>
              <option value="IDS">IDS - Informatique Décisionnelle</option>
            </select>
            <select value={formData.semester || ''} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="border p-2 rounded" required>
              <option value="">Select Semester</option>
              <option value="S1">Semester 1</option>
              <option value="S2">Semester 2</option>
              <option value="S3">Semester 3</option>
              <option value="S4">Semester 4</option>
              <option value="S5">Semester 5</option>
              <option value="S6">Semester 6</option>
            </select>
            <select value={formData.professor || ''} onChange={(e) => setFormData({ ...formData, professor: e.target.value })} className="border p-2 rounded" required>
              <option value="">Select Professor</option>
              {users.filter(u => u.role === 'professeur').map(p => (
                <option key={p._id} value={p._id}>{p.name} {p.prenom} - {p.specialization}</option>
              ))}
            </select>
            <input type="number" placeholder="Credits" value={formData.credits || ''} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} className="border p-2 rounded" />
            <input type="number" placeholder="Hours" value={formData.hours || ''} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} className="border p-2 rounded" />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Create Module</button>
          </div>
        </form>
      );
    }
    if (formType === 'room') {
      return (
        <form onSubmit={handleCreateRoom} className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-3">Create New Room</h3>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Room Name (e.g., GI101)" value={formData.nom || ''} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} className="border p-2 rounded" required />
            <input type="number" placeholder="Capacity" value={formData.capacite || ''} onChange={(e) => setFormData({ ...formData, capacite: e.target.value })} className="border p-2 rounded" required />
            <input type="text" placeholder="Building" value={formData.batiment || ''} onChange={(e) => setFormData({ ...formData, batiment: e.target.value })} className="border p-2 rounded" required />
            <input type="number" placeholder="Floor" value={formData.etage || ''} onChange={(e) => setFormData({ ...formData, etage: e.target.value })} className="border p-2 rounded" required />
            <input type="text" placeholder="Equipment (comma separated)" value={formData.equipment || ''} onChange={(e) => setFormData({ ...formData, equipment: e.target.value.split(',') })} className="border p-2 rounded" />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Create Room</button>
          </div>
        </form>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-title">🏫 University of Soultan Moulay Slimane - Higher School of Technology Fquih Ben Salah</div>
          <div className="user-info">
            <div className="user-details">
              <div className="user-name">{user?.name} {user?.prenom}</div>
              <div className="user-role">{getRoleBadge(user?.role)}</div>
            </div>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <div className="welcome-card">
          <h2 className="welcome-title">Welcome, {user?.name} {user?.prenom}!</h2>
          <p className="welcome-text">
            {isAdmin && "You have full access to manage users, rooms, exams, and modules across all departments."}
            {isProfessor && `You are teaching in the ${user?.specialization || 'Computer Science'} department.`}
            {isStudent && `You are a ${user?.niveau || ''} student in ${user?.departement === 'GI' ? 'Computer Engineering' : 'Decision Support Systems'} department.`}
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="tabs-container">
          <div className="tabs-header">
            <button onClick={() => setActiveTab('schedule')} className={`tab-btn ${activeTab === 'schedule' ? 'active' : 'inactive'}`}>
              📅 Schedule Exams
            </button>
            <button onClick={() => setActiveTab('exams')} className={`tab-btn ${activeTab === 'exams' ? 'active' : 'inactive'}`}>📝 Exams</button>
            {/* PDF EXPORT BUTTON */}
  <button 
        onClick={handleExportPDF} 
        className="tab-btn" 
        style={{ background: '#dc2626', color: 'white', marginLeft: 'auto' }}
      >
        📄 Export PDF
      </button>
            {isAdmin && (
              <>
                <button onClick={() => setActiveTab('users')} className={`tab-btn ${activeTab === 'users' ? 'active' : 'inactive'}`}>👥 Users</button>
                <button onClick={() => setActiveTab('rooms')} className={`tab-btn ${activeTab === 'rooms' ? 'active' : 'inactive'}`}>🏫 Rooms</button>
                <button onClick={() => setActiveTab('modules')} className={`tab-btn ${activeTab === 'modules' ? 'active' : 'inactive'}`}>📚 Modules</button>
                <button onClick={() => setActiveTab('studentsBySemester')} className={`tab-btn ${activeTab === 'studentsBySemester' ? 'active' : 'inactive'}`}>🎓 Students by Semester</button>
              </>
            )}
          </div>

          <div className="tab-content">
            {activeTab === 'schedule' && isAdmin && (
  <div>
    <div className="bg-blue-50 p-4 rounded-lg mb-4">
      <h3 className="font-bold text-lg mb-2">🤖 Auto-Generate Schedule</h3>
      <p className="text-sm text-gray-600 mb-3">Generate complete exam schedule for all departments (Principal exams: 1-15 Jan, Rattrapage: 16-30 Jan)</p>
      <button
        onClick={async () => {
          setLoading(true);
          try {
            const response = await API.post('/scheduling/auto-generate', { year: 2025, month: 1 });
alert(`✅ Scheduled ${response.data.results.scheduled.length} exams successfully!`);

fetchData();
          } catch (error) {
            alert('Error: ' + error.response?.data?.message);
          }
          setLoading(false);
        }}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        🤖 Generate All Exams
      </button>
    </div>

    <div className="mt-6">
      <h3 className="font-bold text-lg mb-3">📝 Manual Exam Scheduling</h3>
      <form onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const response = await API.post('/scheduling/manual', formData);
          alert('✅ Exam scheduled successfully!');
          setShowForm(false);
          fetchData();
        } catch (error) {
          alert('❌ ' + error.response?.data?.message);
        }
        setLoading(false);
      }} className="bg-gray-50 p-4 rounded-lg">
        
        {/* 🔍 DEBUG INFO - Shows what data is loaded */}
        <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-100 rounded">
          📊 Data loaded: 
          Modules: {modules.length} | 
          Rooms: {rooms.length} | 
          Professors: {users.filter(u => u.role === 'professeur').length}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Select Module</label>
            <select 
              value={formData.moduleId || ''} 
              onChange={(e) => setFormData({...formData, moduleId: e.target.value})}
              className="border p-2 rounded w-full"
              required
            >
              <option value="">-- Select Module --</option>
              {modules.map(m => (
                <option key={m._id} value={m._id}>{m.code} - {m.name} ({m.department})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input 
              type="date" 
              value={formData.date || ''} 
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="border p-2 rounded w-full"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <select 
              value={formData.heure_debut || ''} 
              onChange={(e) => setFormData({...formData, heure_debut: e.target.value})}
              className="border p-2 rounded w-full"
              required
            >
              <option value="">-- Select Time --</option>
              <option value="08:00">08:00</option>
              <option value="10:30">10:30</option>
              <option value="14:00">14:00</option>
              <option value="16:30">16:30</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <select 
              value={formData.heure_fin || ''} 
              onChange={(e) => setFormData({...formData, heure_fin: e.target.value})}
              className="border p-2 rounded w-full"
              required
            >
              <option value="">-- Select Time --</option>
              <option value="10:00">10:00</option>
              <option value="12:30">12:30</option>
              <option value="16:00">16:00</option>
              <option value="18:30">18:30</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Select Room</label>
            <select 
              value={formData.salleId || ''} 
              onChange={(e) => setFormData({...formData, salleId: e.target.value})}
              className="border p-2 rounded w-full"
              required
            >
              <option value="">-- Select Room --</option>
              {rooms.map(r => (
                <option key={r._id} value={r._id}>{r.nom} (Capacity: {r.capacite})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Select Supervisors (Hold Ctrl to select multiple)</label>
            <select 
              multiple 
              value={formData.superviseurIds || []} 
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({...formData, superviseurIds: selected});
              }}
              className="border p-2 rounded w-full h-24"
              required
            >
              {users.filter(u => u.role === 'professeur').map(p => (
                <option key={p._id} value={p._id}>{p.name} {p.prenom} - {p.specialization}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl (or Cmd on Mac) to select multiple supervisors</p>
          </div>
        </div>
        
        <div className="mt-4">
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            Schedule Exam
          </button>
        </div>
      </form>
    </div>
    
    <div className="mt-8">
      <h3 className="font-bold text-lg mb-3">📅 Scheduled Exams</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Department</th>
              <th>Date</th>
              <th>Time</th>
              <th>Room</th>
              <th>Supervisors</th>
            </tr>
          </thead>
          <tbody>
            {exams.map(exam => (
              <tr key={exam._id}>
                <td>{exam.module}</td>
                <td>{exam.code_module?.includes('GI') ? 'GI' : exam.code_module?.includes('IDS') ? 'IDS' : 'COMMON'}</td>
                <td>{new Date(exam.date).toLocaleDateString()}</td>
                <td>{exam.heure_debut} - {exam.heure_fin}</td>
                <td>{exam.salle?.nom}</td>
                <td>{exam.surveillant?.name} {exam.surveillant?.prenom}</td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  No exams scheduled yet. Click "Generate All Exams" or use manual scheduling.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

            {loading ? (
              <div className="loading"><div className="spinner"></div><p>Loading...</p></div>
            ) : (
              <>
                {activeTab === 'users' && isAdmin && (
                  <div>
                    <div className="flex gap-3 mb-4">
                      <button onClick={() => { setShowStudentForm(!showStudentForm); setShowProfessorForm(false); setFormData({}); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">🎓 + Add Student</button>
                      <button onClick={() => { setShowProfessorForm(!showProfessorForm); setShowStudentForm(false); setFormData({}); }} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2">👨‍🏫 + Add Professor</button>
                    </div>

                    <div className="flex gap-2 mb-4 flex-wrap">
                      <button onClick={() => setUserFilter('all')} className={`px-3 py-1 rounded text-sm ${userFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}>📊 All Users ({users.length})</button>
                      <button onClick={() => setUserFilter('professors')} className={`px-3 py-1 rounded text-sm ${userFilter === 'professors' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>👨‍🏫 Professors ({users.filter(u => u.role === 'professeur').length})</button>
                      <button onClick={() => setUserFilter('students')} className={`px-3 py-1 rounded text-sm ${userFilter === 'students' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>🎓 Students ({users.filter(u => u.role === 'etudiant').length})</button>
                      <button onClick={() => setUserFilter('admins')} className={`px-3 py-1 rounded text-sm ${userFilter === 'admins' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>👑 Admins ({users.filter(u => u.role === 'admin').length})</button>
                    </div>

                    {showStudentForm && (
                      <form onSubmit={handleCreateStudent} className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
                        <h3 className="font-bold text-lg mb-3 text-blue-800">🎓 Create New Student</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="First Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="border p-2 rounded" required />
                          <input type="text" placeholder="Last Name" value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} className="border p-2 rounded" required />
                          <input type="email" placeholder="Email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="border p-2 rounded" required />
                          <input type="text" placeholder="Student ID (e.g., GI2024001)" value={formData.numero_etudiant || ''} onChange={(e) => setFormData({ ...formData, numero_etudiant: e.target.value })} className="border p-2 rounded" required />
                          <select value={formData.departement || ''} onChange={(e) => setFormData({ ...formData, departement: e.target.value })} className="border p-2 rounded" required>
                            <option value="">Select Department</option>
                            <option value="GI">GI - Génie Informatique</option>
                            <option value="IDS">IDS - Informatique Décisionnelle</option>
                          </select>
                          <select value={formData.niveau || ''} onChange={(e) => setFormData({ ...formData, niveau: e.target.value })} className="border p-2 rounded" required>
                            <option value="">Select Level</option>
                            <option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option>
                            <option value="S4">S4</option><option value="S5">S5</option><option value="S6">S6</option>
                          </select>
                          <input type="password" placeholder="Password" value={formData.password || 'student123'} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="border p-2 rounded" required />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create Student</button>
                          <button type="button" onClick={() => setShowStudentForm(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
                        </div>
                      </form>
                    )}

                    {showProfessorForm && (
                      <form onSubmit={handleCreateProfessor} className="bg-purple-50 p-4 rounded-lg mb-4 border border-purple-200">
                        <h3 className="font-bold text-lg mb-3 text-purple-800">👨‍🏫 Create New Professor</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" placeholder="First Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="border p-2 rounded" required />
                          <input type="text" placeholder="Last Name" value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} className="border p-2 rounded" required />
                          <input type="email" placeholder="Email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="border p-2 rounded" required />
                          <input type="text" placeholder="Specialization" value={formData.specialization || ''} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} className="border p-2 rounded" required />
                          <input type="password" placeholder="Password" value={formData.password || 'prof123'} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="border p-2 rounded" required />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create Professor</button>
                          <button type="button" onClick={() => setShowProfessorForm(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
                        </div>
                      </form>
                    )}

                    <div className="table-container">
                      <table className="data-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department/ID</th><th>Specialization/Level</th></tr></thead>
                        <tbody>
                          {users.filter(u => {
                            if (userFilter === 'professors') return u.role === 'professeur';
                            if (userFilter === 'students') return u.role === 'etudiant';
                            if (userFilter === 'admins') return u.role === 'admin';
                            return true;
                          }).map((u) => (
                            <tr key={u._id}>
                              <td>{u.name} {u.prenom}</td>
                              <td>{u.email}</td>
                              <td>{getRoleBadge(u.role)}</td>
                              <td>{u.role === 'etudiant' ? `${u.departement || '-'} / ${u.numero_etudiant || '-'}` : '-'}</td>
                              <td>{u.role === 'professeur' ? <span className="text-purple-600 font-medium">{u.specialization || '-'}</span> : u.role === 'etudiant' ? <span className="text-blue-600">{u.niveau || '-'}</span> : 'System Administrator'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-gray-600">
                      {userFilter === 'all' && `Total Users: ${users.length}`}
                      {userFilter === 'professors' && `Total Professors: ${users.filter(u => u.role === 'professeur').length}`}
                      {userFilter === 'students' && `Total Students: ${users.filter(u => u.role === 'etudiant').length}`}
                      {userFilter === 'admins' && `Total Admins: ${users.filter(u => u.role === 'admin').length}`}
                    </div>
                  </div>
                )}

                {activeTab === 'rooms' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">All Rooms</h3>
                      <button onClick={() => { setFormType('room'); setShowForm(!showForm); setFormData({}); }} className="bg-indigo-600 text-white px-4 py-2 rounded">{showForm && formType === 'room' ? 'Cancel' : '+ Add Room'}</button>
                    </div>
                    {showForm && formType === 'room' && renderForm()}
                    <div className="table-container">
                      <table className="data-table">
                        <thead><tr><th>Room</th><th>Building</th><th>Floor</th><th>Capacity</th><th>Equipment</th><th>Type</th></tr></thead>
                        <tbody>
                          {rooms.map((room) => (
                            <tr key={room._id}>
                              <td><strong>{room.nom}</strong></td>
                              <td>{room.batiment}</td><td>{room.etage}</td><td>{room.capacite}</td>
                              <td>{room.equipment?.join(', ') || '-'}</td>
                              <td>{room.nom.includes('Amphi') ? 'Amphitheater' : 'Classroom'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'modules' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">All Modules</h3>
                      <button onClick={() => { setFormType('module'); setShowForm(!showForm); setFormData({}); }} className="bg-indigo-600 text-white px-4 py-2 rounded">{showForm && formType === 'module' ? 'Cancel' : '+ Add Module'}</button>
                    </div>
                    {showForm && formType === 'module' && renderForm()}
                    <div className="table-container">
                      <table className="data-table">
                        <thead><tr><th>Code</th><th>Name</th><th>Dept</th><th>Sem</th><th>Professor</th><th>Cr</th><th>Hrs</th></tr></thead>
                        <tbody>
                          {modules.map((module) => (
                            <tr key={module._id}>
                              <td><strong>{module.code}</strong></td><td>{module.name}</td>
                              <td><span className={getDepartmentColor(module.department)}>{module.department}</span></td>
                              <td>{module.semester}</td>
                              <td>{module.professor?.name} {module.professor?.prenom}</td>
                              <td>{module.credits}</td><td>{module.hours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'exams' && (
                  <div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead><tr><th>Module</th><th>Code</th><th>Date</th><th>Time</th><th>Room</th><th>Supervisor</th></tr></thead>
                        <tbody>
                          {exams.map((exam) => (
                            <tr key={exam._id}>
                              <td>{exam.module}</td><td>{exam.code_module}</td>
                              <td>{new Date(exam.date).toLocaleDateString()}</td>
                              <td>{exam.heure_debut} - {exam.heure_fin}</td>
                              <td>{exam.salle?.nom || '-'}</td>
                              <td>{exam.surveillant?.name} {exam.surveillant?.prenom}</td>
                            </tr>
                          ))}
                          {exams.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No exams scheduled yet.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'studentsBySemester' && isAdmin && (
                  <div>
                    <h3 className="font-bold text-xl mb-4">🎓 Students by Promotion and Semester</h3>
                    <div className="bg-green-50 p-4 rounded-lg mb-6 border-l-4 border-green-500">
                      <h4 className="font-bold text-green-800">📅 Current Academic Period</h4>
                      <p className="text-green-700">Current: <strong>Semester 2 (S2)</strong>, <strong>Semester 4 (S4)</strong>, <strong>Semester 6 (S6)</strong></p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                      {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(sem => {
                        const giCount = users.filter(u => u.role === 'etudiant' && u.departement === 'GI' && u.niveau === sem).length;
                        const idsCount = users.filter(u => u.role === 'etudiant' && u.departement === 'IDS' && u.niveau === sem).length;
                        const names = { S1: 'Licence 1 - S1', S2: 'Licence 1 - S2', S3: 'Licence 2 - S3', S4: 'Licence 2 - S4', S5: 'Licence 3 - S5', S6: 'Licence Pro - S6' };
                        const isCurrent = sem === 'S2' || sem === 'S4' || sem === 'S6';
                        return (
                          <div key={sem} className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${isCurrent ? 'border-green-500' : 'border-gray-300'}`}>
                            <h4 className="font-bold text-lg mb-2">{names[sem]}</h4>
                            {isCurrent && <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mb-2">Current</span>}
                            <div><span className="text-blue-600">GI:</span> {giCount}</div>
                            <div><span className="text-green-600">IDS:</span> {idsCount}</div>
                            <div className="pt-2 border-t"><strong>Total: {giCount + idsCount}</strong></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;