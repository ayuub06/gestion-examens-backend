const Module   = require('../models/Module');
const Room     = require('../models/Room');
const User     = require('../models/User');
const Exam     = require('../models/Exam');
const mongoose = require('mongoose');

// ── helpers ───────────────────────────────────────────────────────────────────
const toMin    = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
const overlaps = (s1,e1,s2,e2) => toMin(s1)<toMin(e2) && toMin(e1)>toMin(s2);
const shuffle  = arr => {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
};

// Build working days (Mon–Sat, skip Sun) between two ISO date strings inclusive
const buildWorkingDaysInRange = (startISO, endISO) => {
  const days = [];
  const d   = new Date(startISO + 'T12:00:00Z');
  const end = new Date(endISO   + 'T12:00:00Z');
  while (d <= end) {
    if (d.getUTCDay() !== 0) days.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
};

const TIME_SLOTS = [
  { start:'08:00', end:'10:00' },
  { start:'10:30', end:'12:30' },
  { start:'14:00', end:'16:00' },
  { start:'16:30', end:'18:30' },
];

// Semester → student niveau values in DB (normale session only: S1/S3/S5)
const SEM_TO_NIVEAU = {
  S1: ['DUT1','S1'],
  S3: ['DUT2','S3'],
  S5: ['Bachelor','S5'],
};

const ROOM_SURVEILLANTS = { amphi:3, grande_salle:2, petite_salle:1, labo:1 };

const pickRoomType = (examType, count) => {
  if (examType === 'pratique') return 'labo';
  if (count > 80)  return 'amphi';
  if (count > 30)  return 'grande_salle';
  return 'petite_salle';
};

const ROOM_FALLBACK = {
  amphi:        ['amphi','grande_salle','petite_salle'],
  grande_salle: ['grande_salle','amphi','petite_salle'],
  petite_salle: ['petite_salle','grande_salle','amphi'],
  labo:         ['labo','petite_salle','grande_salle','amphi'],
};

// Session normale only: S1/S3/S5 (01-07 Jun)
const SESSION_CONFIG = {
  normale: { start:'2026-06-01', end:'2026-06-07', semesters:['S1','S3','S5'], label:'Normale (01–07 Juin 2026)' },
};

// ── GET /api/scheduling/current-session ───────────────────────────────────────
exports.getCurrentSession = (req, res) => {
  res.json({ success:true, session: SESSION_CONFIG });
};

// ── CHECK AVAILABILITY ────────────────────────────────────────────────────────
exports.checkAvailability = async (req, res) => {
  try {
    const { date, heure_debut, heure_fin, salleId, supervisorId } = req.body;
    const result = { available:true, roomConflict:null, supervisorConflict:null };

    if (salleId) {
      const ex = await Exam.find({ salle:salleId, date:new Date(date) });
      result.roomConflict = ex.find(e=>overlaps(heure_debut,heure_fin,e.heure_debut,e.heure_fin)) || null;
    }
    if (supervisorId) {
      const ex = await Exam.find({ surveillant:supervisorId, date:new Date(date) });
      result.supervisorConflict = ex.find(e=>overlaps(heure_debut,heure_fin,e.heure_debut,e.heure_fin)) || null;
    }
    result.available = !result.roomConflict && !result.supervisorConflict;
    res.json({ success:true, ...result });
  } catch(err) {
    res.status(500).json({ success:false, message:err.message });
  }
};

// ── MANUAL SCHEDULE ───────────────────────────────────────────────────────────
exports.scheduleExam = async (req, res) => {
  try {
    const { moduleId, date, heure_debut, heure_fin, salleId, superviseurIds } = req.body;
    if (!moduleId||!date||!heure_debut||!heure_fin||!salleId||!superviseurIds?.length)
      return res.status(400).json({ success:false, message:'Champs obligatoires manquants.' });

    const [mod, room] = await Promise.all([Module.findById(moduleId), Room.findById(salleId)]);
    if (!mod)  return res.status(404).json({ success:false, message:'Module introuvable.' });
    if (!room) return res.status(404).json({ success:false, message:'Salle introuvable.' });

    const roomExams = await Exam.find({ salle:salleId, date:new Date(date) });
    if (roomExams.some(e=>overlaps(heure_debut,heure_fin,e.heure_debut,e.heure_fin)))
      return res.status(409).json({ success:false, message:`Salle ${room.nom} déjà occupée à ce créneau.` });

    const profExams = await Exam.find({ surveillant:superviseurIds[0], date:new Date(date) });
    if (profExams.some(e=>overlaps(heure_debut,heure_fin,e.heure_debut,e.heure_fin)))
      return res.status(409).json({ success:false, message:'Ce surveillant est déjà occupé à ce créneau.' });

    const niveaux  = SEM_TO_NIVEAU[mod.semester] || [];
    const students = await User.find({
      role:'etudiant',
      ...(mod.department !== 'COMMON' ? { departement:mod.department } : {}),
      niveau:{ $in:niveaux },
    }).select('_id');

    const exam = new Exam({
      module:mod.name, code_module:mod.code,
      date:new Date(date), heure_debut, heure_fin,
      salle:salleId, surveillant:superviseurIds[0], surveillants:superviseurIds,
      etudiants:students.map(s=>s._id),
      type:'exam', nombre_etudiants:students.length||30,
      department:mod.department, semester:mod.semester,
    });
    await exam.save();

    const populated = await Exam.findById(exam._id)
      .populate('salle','nom capacite type')
      .populate('surveillant','name prenom specialization')
      .populate('surveillants','name prenom');

    res.json({ success:true, message:'Examen planifié.', exam:populated });
  } catch(err) {
    if (err.code===11000) return res.status(409).json({ success:false, message:'Ce créneau/salle est déjà pris.' });
    res.status(500).json({ success:false, message:err.message });
  }
};

// ── AUTO GENERATE ─────────────────────────────────────────────────────────────
exports.autoGenerateSchedule = async (req, res) => {
  try {
    console.log('\n🎯 ═══ GÉNÉRATION AUTOMATIQUE 2026 ═══');
    console.log(`   Session : ${SESSION_CONFIG.normale.label} → ${SESSION_CONFIG.normale.semesters.join(',')}`);

    // ── Step 1: fix rooms missing a type field ──────────────────────────────
    const noTypeRooms = await Room.find({ type:{ $exists:false }, isActive:{ $ne:false } });
    if (noTypeRooms.length) {
      console.log(`🔧 Fixing ${noTypeRooms.length} rooms without type...`);
      for (const r of noTypeRooms) {
        let type;
        if      (r.capacite > 100) type = 'amphi';
        else if (r.capacite > 30)  type = 'grande_salle';
        else                        type = 'petite_salle';
        await Room.findByIdAndUpdate(r._id, { $set:{ type } });
        console.log(`   ${r.nom} (cap ${r.capacite}) → ${type}`);
      }
    }

    // ── Step 2: delete ALL existing exams and ensure unique room index ────
    const del = await Exam.deleteMany({});
    await Exam.syncIndexes(); // ensures unique(salle+date+heure_debut) is active
    console.log(`🗑️  ${del.deletedCount} examens supprimés`);

    // ── Step 3: load data ──────────────────────────────────────────────────
    const [allModules, rooms, professors] = await Promise.all([
      Module.find({ semester:{ $in:SESSION_CONFIG.normale.semesters } }),
      Room.find({ isActive:{ $ne:false } }),
      User.find({ role:'professeur' }),
    ]);

    if (!allModules.length)  return res.status(400).json({ success:false, message:'Aucun module trouvé. Lancez: npm run seed' });
    if (!rooms.length)       return res.status(400).json({ success:false, message:'Aucune salle. Lancez: npm run seed' });
    if (!professors.length)  return res.status(400).json({ success:false, message:'Aucun professeur. Lancez: npm run seed' });

    console.log(`\n📚 ${allModules.length} modules bruts | 🏫 ${rooms.length} salles | 👨‍🏫 ${professors.length} profs`);

    // ── Step 3b: cap to MAX_EXAMS per student group (dept+sem) ────────────
    const MAX_EXAMS_PER_GROUP = 7;

    // Group by semester: separate COMMON from per-dept
    const bySem = {};
    allModules.forEach(m => {
      if (!bySem[m.semester]) bySem[m.semester] = { common: [], byDept: {} };
      if (m.department === 'COMMON') {
        bySem[m.semester].common.push(m);
      } else {
        if (!bySem[m.semester].byDept[m.department]) bySem[m.semester].byDept[m.department] = [];
        bySem[m.semester].byDept[m.department].push(m);
      }
    });

    const schedulableMods = [];
    const _addedIds = new Set();
    const _add = m => { const id = m._id.toString(); if (!_addedIds.has(id)) { _addedIds.add(id); schedulableMods.push(m); } };

    for (const [sem, { common, byDept }] of Object.entries(bySem)) {
      const sortedCommon = [...common].sort((a,b) => (b.credits||0)-(a.credits||0));
      const commonCount  = Math.min(sortedCommon.length, MAX_EXAMS_PER_GROUP);
      const maxDeptMods  = Math.max(0, MAX_EXAMS_PER_GROUP - commonCount);

      // COMMON modules (capped)
      if (sortedCommon.length > MAX_EXAMS_PER_GROUP)
        console.log(`⚠️  Cap COMMON_${sem}: ${sortedCommon.length} → ${MAX_EXAMS_PER_GROUP}`);
      sortedCommon.slice(0, MAX_EXAMS_PER_GROUP).forEach(_add);

      // Dept-specific modules (capped per dept so total ≤ MAX_EXAMS_PER_GROUP)
      for (const [dept, mods] of Object.entries(byDept)) {
        const sorted = [...mods].sort((a,b) => (b.credits||0)-(a.credits||0));
        if (mods.length > maxDeptMods)
          console.log(`⚠️  Cap ${dept}_${sem}: ${mods.length} → ${maxDeptMods} (COMMON=${commonCount})`);
        sorted.slice(0, maxDeptMods).forEach(_add);
      }
    }

    console.log(`📚 ${allModules.length} → ${schedulableMods.length} modules après cap ${MAX_EXAMS_PER_GROUP}/groupe`);

    // ── Step 4: student map ────────────────────────────────────────────────
    const allStudents = await User.find({ role:'etudiant' }).select('_id departement niveau');
    const studentMap  = {};
    allStudents.forEach(s => {
      if (!s.departement || !s.niveau) return;
      const k = `${s.departement}_${s.niveau}`;
      if (!studentMap[k]) studentMap[k] = [];
      studentMap[k].push(s._id);
    });

    console.log('\n👥 Groupes étudiants:');
    Object.entries(studentMap).forEach(([k,v]) => console.log(`   ${k}: ${v.length}`));

    // ── Step 5: helpers ────────────────────────────────────────────────────

    // Which studentMap keys are relevant for a module
    const getGroupKeys = (mod) => {
      const niveaux = SEM_TO_NIVEAU[mod.semester] || [];
      const keys = [];
      if (mod.department === 'COMMON') {
        Object.keys(studentMap).forEach(k => {
          if (niveaux.some(niv => k.endsWith('_' + niv))) keys.push(k);
        });
      } else {
        niveaux.forEach(niv => {
          const k = `${mod.department}_${niv}`;
          if (studentMap[k]) keys.push(k);
        });
      }
      return keys;
    };

    const getStudentIds = (mod) => {
      const keys = getGroupKeys(mod);
      const seen = new Set();
      const ids  = [];
      keys.forEach(k => {
        (studentMap[k] || []).forEach(id => {
          const s = id.toString();
          if (!seen.has(s)) { seen.add(s); ids.push(id); }
        });
      });
      return ids;
    };

    // In-memory busy trackers
    // slotBusy: global per-(date,slot) → Set of profIds already assigned across ALL rooms
    const slotBusy   = {}; // slotBusy[`${ds}_${slotStart}`] = Set<profId>
    const profDayCnt = {}; // profDayCnt[profId][ds] = count (for max-2-per-day limit)
    const roomBusy   = {}; // roomBusy[roomId][ds] = [{start,end}]
    const groupSlot  = {}; // groupSlot[groupKey][ds+slot] = true  (overlap prevention)
    const groupDay   = {}; // groupDay[groupKey][ds] = count       (max 2/day)

    // A professor is free at a slot if they don't appear in the global slotBusy set.
    // Daily limit = 4 (one per time-slot) so professors can cover all 4 daily slots;
    // this is necessary given the small professor pool relative to module count.
    const isProfFree = (id, ds, s) => {
      const key = `${ds}_${s}`;
      if ((profDayCnt[id]?.[ds] || 0) >= 4) return false;
      return !(slotBusy[key]?.has(id));
    };

    // Student group daily limit: raised to 3 to accommodate 136 modules across 6 days.
    // With 24 student groups × max-2/day × 6 days the schedule is mathematically tight;
    // 3/day gives each group enough temporal spread while keeping exam density reasonable.
    const MAX_GROUP_PER_DAY = 3;

    const isRoomFree = (id, ds, s, e) =>
      !(roomBusy[id]?.[ds] || []).some(x => overlaps(s, e, x.start, x.end));

    // Check student group: no simultaneous exam, max 2/day
    const isGroupFree = (mod, ds, slotStart) => {
      const slotKey = `${ds}_${slotStart}`;
      return getGroupKeys(mod).every(k => {
        if (groupSlot[k]?.[slotKey])          return false; // overlap
        if ((groupDay[k]?.[ds] || 0) >= MAX_GROUP_PER_DAY) return false; // configurable daily limit
        return true;
      });
    };

    const markProf = (id, ds, s) => {
      const key = `${ds}_${s}`;
      if (!slotBusy[key]) slotBusy[key] = new Set();
      slotBusy[key].add(id);
      if (!profDayCnt[id]) profDayCnt[id] = {};
      profDayCnt[id][ds] = (profDayCnt[id][ds] || 0) + 1;
      profTotal[id] = (profTotal[id] || 0) + 1;
    };
    const markRoom = (id, ds, s, e) => {
      if (!roomBusy[id])     roomBusy[id]     = {};
      if (!roomBusy[id][ds]) roomBusy[id][ds] = [];
      roomBusy[id][ds].push({ start:s, end:e });
    };
    const markGroup = (mod, ds, slotStart) => {
      const slotKey = `${ds}_${slotStart}`;
      getGroupKeys(mod).forEach(k => {
        if (!groupSlot[k])     groupSlot[k]     = {};
        if (!groupDay[k])      groupDay[k]       = {};
        groupSlot[k][slotKey]  = true;
        groupDay[k][ds]        = (groupDay[k][ds] || 0) + 1;
      });
    };

    // Fair professor picker: always pick least-loaded available professor
    const profTotal = {};
    professors.forEach(p => { profTotal[p._id.toString()] = 0; });

    const pickProf = (ds, s) => {
      const sorted = [...professors].sort((a, b) =>
        (profTotal[a._id.toString()] || 0) - (profTotal[b._id.toString()] || 0)
      );
      return sorted.find(p => isProfFree(p._id.toString(), ds, s)) || null;
    };

    // isCommon=true forces amphi so COMMON modules always get the biggest room
    const pickRoom = (examType, count, ds, s, e, isCommon) => {
      const pref  = isCommon ? 'amphi' : pickRoomType(examType, count);
      const order = ROOM_FALLBACK[pref] || [pref];
      // Sort by total bookings ascending so least-used rooms are tried first
      const byUsage = [...rooms].sort((a, b) => {
        const ua = Object.values(roomBusy[a._id.toString()] || {}).reduce((n, sl) => n + sl.length, 0);
        const ub = Object.values(roomBusy[b._id.toString()] || {}).reduce((n, sl) => n + sl.length, 0);
        return ua - ub;
      });
      for (const rt of order) {
        const r = byUsage.find(r => r.type === rt && r.capacite >= count && isRoomFree(r._id.toString(), ds, s, e));
        if (r) return r;
      }
      // last resort: largest free room regardless of capacity
      return byUsage
        .filter(r => isRoomFree(r._id.toString(), ds, s, e))
        .sort((a, b) => b.capacite - a.capacite)[0] || null;
    };

    // ── Step 6: core scheduler ─────────────────────────────────────────────
    const scheduledExams = [];
    const conflicts      = [];
    const dayLoad        = {}; // dayLoad[ds] = number of exams scheduled that day

    // Attempt to place a single module; returns true if placed, false otherwise
    const tryPlaceMod = async (mod, sessionDates, sessionName) => {
      // Try days in order of ascending load so exams spread evenly across the period
      const sortedDates = [...sessionDates].sort((a, b) => {
        const da = a.toISOString().split('T')[0];
        const db = b.toISOString().split('T')[0];
        return (dayLoad[da] || 0) - (dayLoad[db] || 0);
      });

      for (const date of sortedDates) {
        const ds = date.toISOString().split('T')[0];

        for (const slot of TIME_SLOTS) {
          if (!isGroupFree(mod, ds, slot.start)) continue;

          const studentIds = getStudentIds(mod);
          const count      = studentIds.length || 30;
          const isCommon   = mod.department === 'COMMON';
          const room       = pickRoom(mod.examType || 'theorique', count, ds, slot.start, slot.end, isCommon);
          if (!room) continue;

          const prof = pickProf(ds, slot.start);
          if (!prof) continue;

          const needed = ROOM_SURVEILLANTS[room.type] || 1;
          const extraCandidates = [];
          const sortedForExtra = [...professors].sort((a, b) =>
            (profTotal[a._id.toString()] || 0) - (profTotal[b._id.toString()] || 0)
          );
          for (const p of sortedForExtra) {
            if (extraCandidates.length >= needed - 1) break;
            if (p._id.toString() === prof._id.toString()) continue;
            if (isProfFree(p._id.toString(), ds, slot.start)) extraCandidates.push(p);
          }
          const extras = extraCandidates.map(p => p._id);

          const etudiantOids = studentIds.map(id => {
            try { return new mongoose.Types.ObjectId(id.toString()); } catch { return null; }
          }).filter(Boolean);

          const exam = new Exam({
            module:      mod.name,
            code_module: mod.code,
            date,
            heure_debut: slot.start,
            heure_fin:   slot.end,
            salle:       room._id,
            surveillant: prof._id,
            surveillants:[prof._id, ...extras],
            etudiants:   etudiantOids,
            type:        'exam',
            nombre_etudiants: count,
            department:  mod.department || 'GI',
            semester:    mod.semester   || 'S1',
            session:     sessionName,
          });

          try { await exam.save(); }
          catch (se) {
            if (se.code === 11000) { markRoom(room._id.toString(), ds, slot.start, slot.end); continue; }
            throw se;
          }

          markProf(prof._id.toString(), ds, slot.start);
          markRoom(room._id.toString(), ds, slot.start, slot.end);
          for (const p of extraCandidates) markProf(p._id.toString(), ds, slot.start);
          markGroup(mod, ds, slot.start);
          dayLoad[ds] = (dayLoad[ds] || 0) + 1; // track daily load for balanced spreading

          scheduledExams.push({
            module:   mod.name, code: mod.code, dept: mod.department,
            semester: mod.semester, session: sessionName,
            date: ds, time: `${slot.start}–${slot.end}`,
            room: room.nom, roomType: room.type,
            supervisor: `${prof.name} ${prof.prenom}`,
            surveillantsTotal: 1 + extras.length, students: count,
          });
          console.log(`✅ [${sessionName}] ${mod.code.padEnd(12)} | ${ds} ${slot.start} | ${room.nom.padEnd(10)} | ${prof.name} ${prof.prenom} | ${count} ét.`);
          return true;
        }
      }
      return false;
    };

    const scheduleSession = async (sessionMods, sessionDates, sessionName) => {
      // COMMON modules first so shared group slots are claimed before dept-specific ones
      const common      = shuffle(sessionMods.filter(m => m.department === 'COMMON'));
      const deptSpecific = shuffle(sessionMods.filter(m => m.department !== 'COMMON'));
      const mods = [...common, ...deptSpecific];
      const numDays = sessionDates.length;
      console.log(`\n📅 [${sessionName.toUpperCase()}] ${mods.length} modules / ${numDays} jours`);
      console.log(`   Jours: ${sessionDates.map(d=>d.toISOString().split('T')[0]).join(', ')}`);

      let pending = [...mods];
      let pass = 1;

      // Multi-pass: retry unplaced modules up to 4 times.
      // Load-balanced day selection spreads exams evenly; extra passes resolve
      // any residual ordering effects.
      while (pending.length > 0 && pass <= 4) {
        console.log(`\n🔄 Pass ${pass} — ${pending.length} module(s) à placer`);
        const stillPending = [];
        for (const mod of pending) {
          const placed = await tryPlaceMod(mod, sessionDates, sessionName);
          if (!placed) stillPending.push(mod);
        }
        if (stillPending.length === pending.length) break; // no progress → stop
        pending = stillPending;
        pass++;
      }

      for (const mod of pending) {
        conflicts.push({ module: mod.code, semester: mod.semester, reason: 'Plus de créneaux disponibles' });
        console.warn(`⚠️  [${sessionName}] ${mod.code} (${mod.semester}) — aucun créneau trouvé après ${pass-1} pass(es)`);
      }
    };

    // ── Step 7: schedule normale session only ─────────────────────────────
    const normaleDates = buildWorkingDaysInRange(SESSION_CONFIG.normale.start, SESSION_CONFIG.normale.end);
    console.log(`\n📅 Normale (${schedulableMods.length} modules): ${normaleDates.map(d=>d.toISOString().split('T')[0]).join(', ')}`);

    await scheduleSession(schedulableMods, normaleDates, 'normale');

    // ── Professor distribution report ──────────────────────────────────────
    console.log('\n📊 DISTRIBUTION PROFESSEURS:');
    const profDist = {};
    for (const p of professors) {
      const total = profTotal[p._id.toString()] || 0;
      profDist[`${p.name} ${p.prenom}`] = total;
      if (total > 0) console.log(`   ${`${p.name} ${p.prenom}`.padEnd(30)}: ${total} surveillance(s)`);
    }
    const distVals = Object.values(profDist).filter(v => v > 0);
    if (distVals.length) {
      console.log(`   → Min: ${Math.min(...distVals)} | Max: ${Math.max(...distVals)} | Écart: ${Math.max(...distVals)-Math.min(...distVals)}`);
    }

    console.log(`\n✅ Planifiés : ${scheduledExams.length} / ${schedulableMods.length} (${allModules.length} total avant cap)`);
    console.log(`⚠️  Conflits  : ${conflicts.length}`);

    res.json({
      success: true,
      results: {
        scheduled:      scheduledExams,
        totalScheduled: scheduledExams.length,
        conflicts,
        totalConflicts: conflicts.length,
        professorDistribution: profDist,
        period:         SESSION_CONFIG.normale,
      },
    });

  } catch(err) {
    console.error('autoGenerateSchedule ERROR:', err);
    res.status(500).json({ success:false, message:err.message });
  }
};
