const Exam = require('../models/Exam');
const Module = require('../models/Module');
const Room = require('../models/Room');
const User = require('../models/User');

const TIME_SLOTS = [
  { start: '08:00', end: '10:00' },
  { start: '10:30', end: '12:30' },
  { start: '14:00', end: '16:00' },
  { start: '16:30', end: '18:30' },
];

// Convert "HH:MM" to minutes for overlap detection
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hasOverlap = (s1, e1, s2, e2) => toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);

// Build array of Date objects for a date range
const buildDates = (startDay, endDay, month = 0, year = 2025) => {
  const dates = [];
  for (let d = startDay; d <= endDay; d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
};

// Fisher-Yates shuffle
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── AUTO-GENERATE ───────────────────────────────────────────────────────────
exports.autoGenerateSchedule = async (req, res) => {
  try {
    console.log('🎯 DÉMARRAGE GÉNÉRATION AUTOMATIQUE...');

    await Exam.deleteMany({});
    console.log('🗑️  Anciens examens supprimés');

    // FIX: Removed { isActive: true } for rooms — fetch all rooms
    const [modules, rooms, professors] = await Promise.all([
      Module.find({}),
      Room.find({}),
      User.find({ role: 'professeur' }),
    ]);

    console.log(`📚 Modules: ${modules.length} | 🏫 Salles: ${rooms.length} | 👨‍🏫 Profs: ${professors.length}`);

    if (!modules.length) return res.status(400).json({ success: false, message: 'Aucun module trouvé. Exécutez le script seed.' });
    if (!rooms.length) return res.status(400).json({ success: false, message: 'Aucune salle trouvée. Exécutez le script seed.' });
    if (!professors.length) return res.status(400).json({ success: false, message: 'Aucun professeur trouvé. Exécutez le script seed.' });

    // Pre-load students grouped by department+semester
    const allStudents = await User.find({ role: 'etudiant' }).select('_id departement niveau');
    const studentMap = {};
    allStudents.forEach((s) => {
      const key = `${s.departement}_${s.niveau}`;
      if (!studentMap[key]) studentMap[key] = [];
      studentMap[key].push(s._id);
    });
    console.log(`👨‍🎓 Groupes étudiants: ${Object.keys(studentMap).join(', ')}`);

    // Session dates
    const normalDates = buildDates(1, 7);    // 01-07 jan 2025
    const rattrapageDates = buildDates(8, 15); // 08-15 jan 2025

    // Split modules into sessions (odd semesters → normale, even → rattrapage)
    const normalModules = shuffle(modules.filter(m => ['S1', 'S3', 'S5'].includes(m.semester)));
    const rattrapageModules = shuffle(modules.filter(m => ['S2', 'S4', 'S6'].includes(m.semester)));

    // Fallback: if no semester filter matches, split evenly
    const useNormal = normalModules.length ? normalModules : shuffle(modules).slice(0, Math.ceil(modules.length / 2));
    const useRattrapage = rattrapageModules.length ? rattrapageModules : shuffle(modules).slice(Math.ceil(modules.length / 2));

    const scheduledExams = [];
    const conflicts = [];

    // In-memory busy tracking: profBusy[profId][dateStr] = [{start, end}]
    const profBusy = {};
    const roomBusy = {};

    const isProfFree = (profId, dateStr, start, end) => {
      const slots = profBusy[profId]?.[dateStr] || [];
      if (slots.length >= 2) return false; // max 2 exams/day per prof
      return !slots.some(s => hasOverlap(start, end, s.start, s.end));
    };
    const isRoomFree = (roomId, dateStr, start, end) => {
      const slots = roomBusy[roomId]?.[dateStr] || [];
      return !slots.some(s => hasOverlap(start, end, s.start, s.end));
    };
    const markProf = (profId, dateStr, start, end) => {
      if (!profBusy[profId]) profBusy[profId] = {};
      if (!profBusy[profId][dateStr]) profBusy[profId][dateStr] = [];
      profBusy[profId][dateStr].push({ start, end });
    };
    const markRoom = (roomId, dateStr, start, end) => {
      if (!roomBusy[roomId]) roomBusy[roomId] = {};
      if (!roomBusy[roomId][dateStr]) roomBusy[roomId][dateStr] = [];
      roomBusy[roomId][dateStr].push({ start, end });
    };

    // FIX: True round-robin professor index per session
    let profIdx = 0;

    const scheduleSession = async (sessionModules, sessionDates, sessionName) => {
      let modIdx = 0;

      for (const date of sessionDates) {
        if (modIdx >= sessionModules.length) break;
        const dateStr = date.toISOString().split('T')[0];

        for (const slot of TIME_SLOTS) {
          if (modIdx >= sessionModules.length) break;
          const mod = sessionModules[modIdx];

          // Get students for this module's dept+semester
          const studentKey = `${mod.department}_${mod.semester}`;
          const studentIds = studentMap[studentKey] || [];
          const needed = studentIds.length || 1;

          // FIX: Find available room with sufficient capacity
          const room = rooms.find(r => r.capacite >= needed && isRoomFree(r._id.toString(), dateStr, slot.start, slot.end));
          if (!room) {
            // Try any available room (ignore capacity constraint as fallback)
            const anyRoom = rooms.find(r => isRoomFree(r._id.toString(), dateStr, slot.start, slot.end));
            if (!anyRoom) {
              conflicts.push({ module: mod.code, reason: `Aucune salle disponible: ${dateStr} ${slot.start}` });
              modIdx++;
              continue;
            }
          }

          const chosenRoom = rooms.find(r => r.capacite >= needed && isRoomFree(r._id.toString(), dateStr, slot.start, slot.end))
            || rooms.find(r => isRoomFree(r._id.toString(), dateStr, slot.start, slot.end));

          // FIX: Round-robin professor — try each starting at profIdx
          let chosenProf = null;
          for (let a = 0; a < professors.length; a++) {
            const candidate = professors[(profIdx + a) % professors.length];
            if (isProfFree(candidate._id.toString(), dateStr, slot.start, slot.end)) {
              chosenProf = candidate;
              profIdx = (profIdx + a + 1) % professors.length; // advance for next call
              break;
            }
          }

          if (!chosenProf) {
            conflicts.push({ module: mod.code, reason: `Aucun prof disponible: ${dateStr} ${slot.start}` });
            modIdx++;
            continue;
          }

          const exam = new Exam({
            module: mod.name,
            code_module: mod.code,
            date,
            heure_debut: slot.start,
            heure_fin: slot.end,
            salle: chosenRoom._id,
            surveillant: chosenProf._id,
            etudiants: studentIds,
            nombre_etudiants: studentIds.length || chosenRoom.capacite,
            department: mod.department || 'GI',
            semester: mod.semester || 'S1',
            session: sessionName,
            type: 'exam',
            status: 'scheduled',
          });

          await exam.save();

          markProf(chosenProf._id.toString(), dateStr, slot.start, slot.end);
          markRoom(chosenRoom._id.toString(), dateStr, slot.start, slot.end);

          scheduledExams.push({
            module: mod.name,
            code: mod.code,
            date: dateStr,
            time: `${slot.start} - ${slot.end}`,
            room: chosenRoom.nom,
            supervisor: `${chosenProf.name} ${chosenProf.prenom}`,
            students: studentIds.length,
            session: sessionName,
          });

          console.log(`✅ [${sessionName}] ${mod.code} | ${dateStr} ${slot.start} | ${chosenRoom.nom} | ${chosenProf.name} ${chosenProf.prenom} | ${studentIds.length} étudiants`);
          modIdx++;
        }
      }
    };

    await scheduleSession(useNormal, normalDates, 'normale');
    await scheduleSession(useRattrapage, rattrapageDates, 'rattrapage');

    // Build professor distribution summary
    const profDist = {};
    scheduledExams.forEach(e => {
      profDist[e.supervisor] = (profDist[e.supervisor] || 0) + 1;
    });
    console.log('\n📊 Distribution profs:', profDist);
    console.log(`\n✅ Total: ${scheduledExams.length} examens | ⚠️  Conflits: ${conflicts.length}`);

    res.json({
      success: true,
      results: {
        scheduled: scheduledExams,
        totalScheduled: scheduledExams.length,
        conflicts,
        professorDistribution: profDist,
        period: {
          normale: { start: '2025-01-01', end: '2025-01-07' },
          rattrapage: { start: '2025-01-08', end: '2025-01-15' },
        },
      },
    });

  } catch (error) {
    console.error('❌ Erreur autoGenerateSchedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── MANUAL SCHEDULE ─────────────────────────────────────────────────────────
exports.scheduleExam = async (req, res) => {
  try {
    const { moduleId, date, heure_debut, heure_fin, salleId, superviseurIds } = req.body;

    if (!moduleId || !date || !heure_debut || !heure_fin || !salleId || !superviseurIds?.length) {
      return res.status(400).json({ success: false, message: 'Champs obligatoires manquants.' });
    }

    const [mod, room] = await Promise.all([Module.findById(moduleId), Room.findById(salleId)]);
    if (!mod) return res.status(404).json({ success: false, message: 'Module introuvable.' });
    if (!room) return res.status(404).json({ success: false, message: 'Salle introuvable.' });

    const examDate = new Date(date);

    // Conflict: room
    const roomExams = await Exam.find({ salle: salleId, date: examDate });
    const roomConflict = roomExams.find(e => hasOverlap(heure_debut, heure_fin, e.heure_debut, e.heure_fin));
    if (roomConflict) return res.status(409).json({ success: false, message: `Salle ${room.nom} déjà occupée sur ce créneau.` });

    // Conflict: prof
    const profExams = await Exam.find({ surveillant: superviseurIds[0], date: examDate });
    const profConflict = profExams.find(e => hasOverlap(heure_debut, heure_fin, e.heure_debut, e.heure_fin));
    if (profConflict) return res.status(409).json({ success: false, message: 'Ce surveillant a déjà un examen sur ce créneau.' });

    // Auto-assign students
    const students = await User.find({ role: 'etudiant', departement: mod.department, niveau: mod.semester }).select('_id');
    if (students.length > room.capacite) {
      return res.status(400).json({ success: false, message: `Capacité insuffisante: salle ${room.nom} (${room.capacite}) < étudiants (${students.length})` });
    }

    const exam = new Exam({
      module: mod.name,
      code_module: mod.code,
      date: examDate,
      heure_debut,
      heure_fin,
      salle: salleId,
      surveillant: superviseurIds[0],
      surveillants_supplementaires: superviseurIds.slice(1),
      etudiants: students.map(s => s._id),
      nombre_etudiants: students.length || room.capacite,
      department: mod.department,
      semester: mod.semester,
      session: 'normale',
    });

    await exam.save();
    await exam.populate([
      { path: 'salle', select: 'nom capacite' },
      { path: 'surveillant', select: 'name prenom' },
    ]);

    res.json({ success: true, message: 'Examen planifié avec succès.', exam });
  } catch (error) {
    console.error('Erreur scheduleExam:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CHECK AVAILABILITY ──────────────────────────────────────────────────────
exports.checkAvailability = async (req, res) => {
  try {
    const { date, heure_debut, heure_fin, salleId, supervisorId } = req.body;
    const result = { available: true, roomConflict: null, supervisorConflict: null };

    if (salleId) {
      const exams = await Exam.find({ salle: salleId, date: new Date(date) });
      result.roomConflict = exams.find(e => hasOverlap(heure_debut, heure_fin, e.heure_debut, e.heure_fin)) || null;
    }
    if (supervisorId) {
      const exams = await Exam.find({ surveillant: supervisorId, date: new Date(date) });
      result.supervisorConflict = exams.find(e => hasOverlap(heure_debut, heure_fin, e.heure_debut, e.heure_fin)) || null;
    }

    result.available = !result.roomConflict && !result.supervisorConflict;
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET SCHEDULE ─────────────────────────────────────────────────────────────
exports.getSchedule = async (req, res) => {
  try {
    const { session, department } = req.query;
    const filter = {};
    if (session) filter.session = session;
    if (department) filter.department = department;

    const exams = await Exam.find(filter)
      .populate('salle', 'nom capacite batiment')
      .populate('surveillant', 'name prenom email')
      .sort({ date: 1, heure_debut: 1 });

    res.json({ success: true, count: exams.length, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};