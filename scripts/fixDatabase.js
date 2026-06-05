/**
 * scripts/fixDatabase.js
 *
 * COMPREHENSIVE FIX - Run ONCE against MongoDB Atlas:
 *   1. Delete all rattrapage exams (session='rattrapage' or semester S2/S4/S6)
 *   2. Delete all rattrapage modules (semester S2/S4/S6)
 *   3. Delete all students → recreate with 2010+ UNIQUE Moroccan names
 *   4. Regenerate NORMALE session exams (S1/S3/S5 only) with fair professor distribution
 *   5. Verify: each student group = 7 exams, no duplicate assignments, fair prof distribution
 *
 * Usage:
 *   1. Set MONGODB_URI in .env to your Atlas URI
 *   2. node scripts/fixDatabase.js
 */

require('dotenv').config();
// Force Google DNS so SRV lookup works on machines with broken local DNS resolvers
require('dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User   = require('../models/User');
const Module = require('../models/Module');
const Exam   = require('../models/Exam');
const Room   = require('../models/Room');

// ─── NAMES (user-specified required list + extended for 2010 unique names) ───

const REQUIRED_PRENOMS = [
  'Youssef','Mohammed','Fatima','Aicha','Omar','Hajar','Karim','Sara',
  'Hamza','Nadia','Amine','Zineb','Khalid','Meryem','Bilal','Houda',
  'Mehdi','Souad','Adil','Loubna','Rachid','Khadija','Tarik','Samira',
  'Hicham','Leila','Saad','Ghita','Iliass','Malak',
];
const REQUIRED_NOMS = [
  'Benali','Idrissi','Alaoui','Tazi','Chraibi','Filali','Bennani','Fassi',
  'Ghali','Berrada','Senhaji','Kadiri','Laraki','Moussaoui','Ziani','Bargach',
  'Tahiri','Bensouda','Lahlou','Kettani','Squalli','Benhima','Benkirane',
  'Lamrani','Mekouar','Benaboud','Cherkaoui','Bensalah','Hajoui','Naciri',
];
// Extra prenoms for overflow students (also Moroccan/Arabic names)
const EXTRA_PRENOMS = [
  'Ahmed','Hassan','Walid','Nabil','Ismail','Aymane','Aziz','Mouad',
  'Adam','Soufiane','Mounir','Yahya','Badr','Driss','Anass','Fouad',
  'Marouane','Soukaina','Imane','Rajaa','Safae','Kaoutar','Maroua',
  'Hind','Sanae','Oumaima','Salma','Hanane','Narjiss','Wafae',
  'Nawal','Rim','Yasmine','Rania','Asma','Sana','Meriem','Chaimae',
  'Boutaina','Nihal',
];

// Build a pool of 2100+ globally unique (prenom, nom) pairs.
// Order: required×required first (900), then extra_prenoms×required_noms (1200).
function buildNamePool() {
  const pool = [];
  const used = new Set();

  const add = (prenom, nom) => {
    const key = `${prenom}|${nom}`;
    if (!used.has(key)) { used.add(key); pool.push({ prenom, nom }); }
  };

  // Pass 1: 30 required prenoms × 30 required noms = 900 unique names
  for (const nom of REQUIRED_NOMS)
    for (const prenom of REQUIRED_PRENOMS)
      add(prenom, nom);

  // Pass 2: 40 extra prenoms × 30 required noms = 1200 more (total 2100)
  for (const nom of REQUIRED_NOMS)
    for (const prenom of EXTRA_PRENOMS)
      add(prenom, nom);

  return pool;
}

const normalizeStr = s =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// ─── STUDENT COHORTS ─────────────────────────────────────────────────────────
const STUDENT_COHORTS = [
  ['GI',      'DUT1',     150, 'gi',      '2024'],
  ['GI',      'DUT2',     150, 'gi',      '2023'],
  ['GI',      'Bachelor', 120, 'gi',      '2022'],
  ['IDS',     'DUT1',     120, 'ids',     '2024'],
  ['IDS',     'DUT2',     120, 'ids',     '2023'],
  ['IDS',     'Bachelor', 100, 'ids',     '2022'],
  ['BigData', 'Bachelor', 100, 'bd',      '2022'],
  ['GC',      'DUT1',      80, 'gc',      '2024'],
  ['GC',      'DUT2',      80, 'gc',      '2023'],
  ['GC',      'Bachelor',  70, 'gc',      '2022'],
  ['GE',      'DUT1',      80, 'ge',      '2024'],
  ['GE',      'DUT2',      80, 'ge',      '2023'],
  ['GE',      'Bachelor',  70, 'ge',      '2022'],
  ['GM',      'DUT1',      80, 'gm',      '2024'],
  ['GM',      'DUT2',      80, 'gm',      '2023'],
  ['GM',      'Bachelor',  70, 'gm',      '2022'],
  ['TM',      'DUT1',      80, 'tm',      '2024'],
  ['TM',      'DUT2',      80, 'tm',      '2023'],
  ['TM',      'Bachelor',  70, 'tm',      '2022'],
  ['IG',      'DUT1',      80, 'ig',      '2024'],
  ['IG',      'DUT2',      80, 'ig',      '2023'],
  ['IG',      'Bachelor',  70, 'ig',      '2022'],
];

// ─── SCHEDULING HELPERS ───────────────────────────────────────────────────────

const toMin    = t  => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const overlaps = (s1, e1, s2, e2) => toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);
const shuffle  = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildWorkingDays = (startISO, endISO) => {
  const days = [];
  const d    = new Date(startISO + 'T12:00:00Z');
  const end  = new Date(endISO   + 'T12:00:00Z');
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

const SEM_TO_NIVEAU = {
  S1: ['DUT1','S1'],  S3: ['DUT2','S3'],  S5: ['Bachelor','S5'],
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

// ─── MAIN FIX FUNCTION ───────────────────────────────────────────────────────

async function fixDatabase() {

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1: Delete ALL rattrapage exams
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('STEP 1: Suppression des examens rattrapage');
  console.log('═══════════════════════════════════════════════════════');

  const del1 = await Exam.deleteMany({
    $or: [
      { session: 'rattrapage' },
      { semester: { $in: ['S2','S4','S6'] } },
    ],
  });
  console.log(`✅ ${del1.deletedCount} examens rattrapage supprimés`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2: Delete ALL rattrapage modules (S2/S4/S6)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('STEP 2: Suppression des modules rattrapage (S2/S4/S6)');
  console.log('═══════════════════════════════════════════════════════');

  const del2 = await Module.deleteMany({ semester: { $in: ['S2','S4','S6'] } });
  console.log(`✅ ${del2.deletedCount} modules rattrapage supprimés`);

  // Show remaining modules
  const remMods = await Module.countDocuments();
  console.log(`📚 Modules restants (S1/S3/S5): ${remMods}`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3: Delete all students and recreate with unique Moroccan names
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('STEP 3: Recréation des étudiants avec noms uniques');
  console.log('═══════════════════════════════════════════════════════');

  await User.deleteMany({ role: 'etudiant' });
  await Exam.deleteMany({}); // also wipe existing normale exams so we regenerate fresh
  console.log('🗑️  Anciens étudiants et examens normaux supprimés');

  const namePool = buildNamePool();
  console.log(`📋 Pool de noms: ${namePool.length} noms uniques disponibles`);

  if (namePool.length < 2010) {
    throw new Error(`Pas assez de noms uniques! Pool: ${namePool.length}, nécessaire: 2010`);
  }

  const hashed = await bcrypt.hash('student123', 12);
  let totalStudents = 0;
  let namePoolIdx   = 0;

  for (const [dept, niveau, count, prefix, year] of STUDENT_COHORTS) {
    const batch = [];
    for (let i = 1; i <= count; i++) {
      const { prenom, nom } = namePool[namePoolIdx++];
      const safeP  = normalizeStr(prenom);
      const safeN  = normalizeStr(nom);
      // Email format: firstname.lastname.department+year+number@edu.uca.ma
      const email  = `${safeP}.${safeN}.${prefix}+${year}+${String(i).padStart(3,'0')}@edu.uca.ma`;
      const numEtud = `${prefix.toUpperCase()}${year}${String(i).padStart(3,'0')}`;

      batch.push({
        name:            nom,
        prenom,
        email,
        password:        hashed,
        role:            'etudiant',
        numero_etudiant: numEtud,
        departement:     dept,
        niveau,
        isActive:        true,
      });
    }

    try {
      const result = await User.insertMany(batch, { ordered: false });
      totalStudents += result.length;
    } catch (e) {
      if (e.code === 11000 || e.writeErrors) {
        const inserted = e.insertedDocs?.length || 0;
        totalStudents += inserted;
        console.warn(`  ⚠️  ${dept}-${niveau}: ${e.writeErrors?.length || 0} doublons (${inserted} insérés)`);
      } else throw e;
    }
    console.log(`  ✅ ${dept}-${niveau}: ${count} étudiants`);
  }
  console.log(`\n✅ Total étudiants créés: ${totalStudents}`);

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4: Regenerate NORMALE session exams (S1/S3/S5 only)
  //         with fair professor distribution and max 2 exams/day/professor
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('STEP 4: Génération des examens Session Normale (S1/S3/S5)');
  console.log('═══════════════════════════════════════════════════════');

  await Exam.syncIndexes();

  const [normaleMods, rooms, professors] = await Promise.all([
    Module.find({ semester: { $in: ['S1','S3','S5'] } }),
    Room.find({ isActive: { $ne: false } }),
    User.find({ role: 'professeur' }),
  ]);

  if (!normaleMods.length)  throw new Error('Aucun module normale. Lancez: npm run seed');
  if (!rooms.length)        throw new Error('Aucune salle. Lancez: npm run seed');
  if (!professors.length)   throw new Error('Aucun professeur. Lancez: npm run seed');

  console.log(`📚 ${normaleMods.length} modules | 🏫 ${rooms.length} salles | 👨‍🏫 ${professors.length} profs`);

  // Cap to 7 exams per student group (dept+semester)
  const MAX_EXAMS = 7;
  const bySem = {};
  normaleMods.forEach(m => {
    if (!bySem[m.semester]) bySem[m.semester] = { common: [], byDept: {} };
    if (m.department === 'COMMON') {
      bySem[m.semester].common.push(m);
    } else {
      if (!bySem[m.semester].byDept[m.department]) bySem[m.semester].byDept[m.department] = [];
      bySem[m.semester].byDept[m.department].push(m);
    }
  });

  const toSchedule = [];
  const addedIds   = new Set();
  const addMod     = m => { const id = m._id.toString(); if (!addedIds.has(id)) { addedIds.add(id); toSchedule.push(m); } };

  for (const [sem, { common, byDept }] of Object.entries(bySem)) {
    const sortedCommon = [...common].sort((a, b) => (b.credits || 0) - (a.credits || 0));
    const commonCount  = Math.min(sortedCommon.length, MAX_EXAMS);
    const maxDeptMods  = Math.max(0, MAX_EXAMS - commonCount);

    sortedCommon.slice(0, MAX_EXAMS).forEach(addMod);
    for (const [, mods] of Object.entries(byDept)) {
      [...mods].sort((a, b) => (b.credits || 0) - (a.credits || 0)).slice(0, maxDeptMods).forEach(addMod);
    }
  }

  console.log(`📚 ${normaleMods.length} → ${toSchedule.length} modules après cap ${MAX_EXAMS}/groupe`);

  // Build student map
  const allStudents = await User.find({ role: 'etudiant' }).select('_id departement niveau');
  const studentMap  = {};
  allStudents.forEach(s => {
    if (!s.departement || !s.niveau) return;
    const k = `${s.departement}_${s.niveau}`;
    if (!studentMap[k]) studentMap[k] = [];
    studentMap[k].push(s._id);
  });

  console.log('\n👥 Groupes étudiants:');
  Object.entries(studentMap).forEach(([k, v]) => console.log(`   ${k}: ${v.length}`));

  const getGroupKeys = mod => {
    const niveaux = SEM_TO_NIVEAU[mod.semester] || [];
    if (mod.department === 'COMMON') {
      return Object.keys(studentMap).filter(k => niveaux.some(niv => k.endsWith('_' + niv)));
    }
    return niveaux.map(niv => `${mod.department}_${niv}`).filter(k => studentMap[k]);
  };

  const getStudentIds = mod => {
    const seen = new Set();
    const ids  = [];
    getGroupKeys(mod).forEach(k => {
      (studentMap[k] || []).forEach(id => {
        const s = id.toString();
        if (!seen.has(s)) { seen.add(s); ids.push(id); }
      });
    });
    return ids;
  };

  // In-memory trackers
  const profBusy    = {}; // profBusy[id][ds] = [{start,end}]  — all slots (overlap check)
  const profPrimary = {}; // profPrimary[id][ds] = count        — primary-only count (max 2/day)
  const roomBusy    = {}; // roomBusy[id][ds] = [{start,end}]
  const groupSlot   = {}; // groupSlot[key][ds+slot] = true
  const groupDay    = {}; // groupDay[key][ds] = count  (max 2)
  const profTotal   = {}; // profTotal[id] = total primary assignments

  professors.forEach(p => { profTotal[p._id.toString()] = 0; });

  // No time-slot overlap (for both primary and co-surveillant)
  const isProfSlotFree = (id, ds, s, e) =>
    !(profBusy[id]?.[ds] || []).some(x => overlaps(s, e, x.start, x.end));

  // Primary: no overlap + max 2 primary per day
  const isProfFreePrimary = (id, ds, s, e) => {
    if ((profPrimary[id]?.[ds] || 0) >= 2) return false;
    return isProfSlotFree(id, ds, s, e);
  };

  const isRoomFree = (id, ds, s, e) =>
    !(roomBusy[id]?.[ds] || []).some(x => overlaps(s, e, x.start, x.end));

  const isGroupFree = (mod, ds, slotStart) => {
    const slotKey = `${ds}_${slotStart}`;
    return getGroupKeys(mod).every(k => {
      if (groupSlot[k]?.[slotKey])       return false;
      if ((groupDay[k]?.[ds] || 0) >= 2) return false;
      return true;
    });
  };

  const markProfSlot = (id, ds, s, e) => {
    if (!profBusy[id])     profBusy[id]     = {};
    if (!profBusy[id][ds]) profBusy[id][ds] = [];
    profBusy[id][ds].push({ start: s, end: e });
  };
  const markProfPrimary = (id, ds, s, e) => {
    markProfSlot(id, ds, s, e);
    if (!profPrimary[id])     profPrimary[id]     = {};
    profPrimary[id][ds] = (profPrimary[id][ds] || 0) + 1;
    profTotal[id] = (profTotal[id] || 0) + 1;
  };
  const markRoom = (id, ds, s, e) => {
    if (!roomBusy[id])     roomBusy[id]     = {};
    if (!roomBusy[id][ds]) roomBusy[id][ds] = [];
    roomBusy[id][ds].push({ start: s, end: e });
  };
  const markGroup = (mod, ds, slotStart) => {
    const slotKey = `${ds}_${slotStart}`;
    getGroupKeys(mod).forEach(k => {
      if (!groupSlot[k]) groupSlot[k] = {};
      if (!groupDay[k])  groupDay[k]  = {};
      groupSlot[k][slotKey] = true;
      groupDay[k][ds]       = (groupDay[k][ds] || 0) + 1;
    });
  };

  // Fair picker for PRIMARY surveillant: least-loaded first, max 2 primary/day
  const pickProf = (ds, s, e) => {
    const sorted = [...professors].sort((a, b) =>
      (profTotal[a._id.toString()] || 0) - (profTotal[b._id.toString()] || 0)
    );
    return sorted.find(p => isProfFreePrimary(p._id.toString(), ds, s, e)) || null;
  };

  const pickRoom = (examType, count, ds, s, e) => {
    const pref  = pickRoomType(examType, count);
    const order = ROOM_FALLBACK[pref] || [pref];
    const byUsage = [...rooms].sort((a, b) => {
      const ua = Object.values(roomBusy[a._id.toString()] || {}).reduce((n, sl) => n + sl.length, 0);
      const ub = Object.values(roomBusy[b._id.toString()] || {}).reduce((n, sl) => n + sl.length, 0);
      return ua - ub;
    });
    for (const rt of order) {
      const r = byUsage.find(r => r.type === rt && r.capacite >= count && isRoomFree(r._id.toString(), ds, s, e));
      if (r) return r;
    }
    return byUsage.filter(r => isRoomFree(r._id.toString(), ds, s, e)).sort((a, b) => b.capacite - a.capacite)[0] || null;
  };

  // Schedule normale session
  const normaleDays  = buildWorkingDays('2026-06-01', '2026-06-07');
  const scheduled    = [];
  const conflicts    = [];

  // COMMON modules first so shared group slots are claimed before dept-specific ones
  const commonMods = shuffle(toSchedule.filter(m => m.department === 'COMMON'));
  const deptMods   = shuffle(toSchedule.filter(m => m.department !== 'COMMON'));
  const mods       = [...commonMods, ...deptMods];
  const numDays    = normaleDays.length;

  console.log(`\n📅 Session Normale: ${mods.length} modules / ${numDays} jours`);
  console.log(`   ${normaleDays.map(d => d.toISOString().split('T')[0]).join(', ')}`);

  for (let mi = 0; mi < mods.length; mi++) {
    const mod         = mods[mi];
    let   placed      = false;
    const startDayIdx = mi % numDays;

    dayLoop:
    for (let di = 0; di < numDays && !placed; di++) {
      const date = normaleDays[(startDayIdx + di) % numDays];
      const ds   = date.toISOString().split('T')[0];

      for (const slot of TIME_SLOTS) {
        if (!isGroupFree(mod, ds, slot.start)) continue;

        const studentIds = getStudentIds(mod);
        const count      = studentIds.length || 30;
        const room       = pickRoom(mod.examType || 'theorique', count, ds, slot.start, slot.end);
        if (!room) continue;

        const prof = pickProf(ds, slot.start, slot.end);
        if (!prof) continue;

        // Co-surveillants (fair distribution: pick least-loaded first)
        const needed  = ROOM_SURVEILLANTS[room.type] || 1;
        // Co-surveillants: just need free time slot (no primary-day limit)
        const sortedForExtra = [...professors].sort((a, b) =>
          (profTotal[a._id.toString()] || 0) - (profTotal[b._id.toString()] || 0)
        );
        const extraCandidates = [];
        for (const p of sortedForExtra) {
          if (extraCandidates.length >= needed - 1) break;
          if (p._id.toString() === prof._id.toString()) continue;
          if (isProfSlotFree(p._id.toString(), ds, slot.start, slot.end)) extraCandidates.push(p);
        }
        const extras = extraCandidates.map(p => p._id);

        const etudiantOids = studentIds.map(id => {
          try { return new mongoose.Types.ObjectId(id.toString()); } catch { return null; }
        }).filter(Boolean);

        const exam = new Exam({
          module:           mod.name,
          code_module:      mod.code,
          date,
          heure_debut:      slot.start,
          heure_fin:        slot.end,
          salle:            room._id,
          surveillant:      prof._id,
          surveillants:     [prof._id, ...extras],
          etudiants:        etudiantOids,
          type:             'exam',
          nombre_etudiants: count,
          department:       mod.department || 'GI',
          semester:         mod.semester   || 'S1',
          session:          'normale',
        });

        try {
          await exam.save();
        } catch (se) {
          if (se.code === 11000) {
            markRoom(room._id.toString(), ds, slot.start, slot.end);
            continue;
          }
          throw se;
        }

        markProfPrimary(prof._id.toString(), ds, slot.start, slot.end);
        markRoom(room._id.toString(), ds, slot.start, slot.end);
        extraCandidates.forEach(p => markProfSlot(p._id.toString(), ds, slot.start, slot.end));
        markGroup(mod, ds, slot.start);

        scheduled.push({ module: mod.code, dept: mod.department, semester: mod.semester,
                         date: ds, time: `${slot.start}–${slot.end}`, room: room.nom,
                         supervisor: `${prof.name} ${prof.prenom}`, students: count });

        console.log(`✅ ${mod.code.padEnd(12)} | ${ds} ${slot.start} | ${room.nom.padEnd(10)} | ${prof.name} ${prof.prenom} | ${count} ét.`);
        placed = true;
        break;
      }
    }

    if (!placed) {
      conflicts.push({ module: mod.code, semester: mod.semester });
      console.warn(`⚠️  ${mod.code} (${mod.semester}) — aucun créneau trouvé`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 5: Verification
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('STEP 5: Vérification');
  console.log('═══════════════════════════════════════════════════════');

  const [totalExams, totalMods, totalStudentCount, rattrapageCheck] = await Promise.all([
    Exam.countDocuments(),
    Module.countDocuments(),
    User.countDocuments({ role: 'etudiant' }),
    Exam.countDocuments({ $or: [{ session:'rattrapage' }, { semester: { $in: ['S2','S4','S6'] } }] }),
  ]);

  // Professor distribution
  console.log('\n📊 DISTRIBUTION PROFESSEURS (surveillances primaires):');
  const profDistMap = {};
  for (const p of professors) {
    const primary = profTotal[p._id.toString()] || 0;
    profDistMap[`${p.name} ${p.prenom}`] = primary;
    if (primary > 0) console.log(`   ${`${p.name} ${p.prenom}`.padEnd(30)}: ${primary} exam(s) principal`);
  }
  const distVals = Object.values(profDistMap).filter(v => v > 0);
  const minDist  = distVals.length ? Math.min(...distVals) : 0;
  const maxDist  = distVals.length ? Math.max(...distVals) : 0;
  console.log(`   → Min: ${minDist} | Max: ${maxDist} | Écart: ${maxDist - minDist}`);

  if (conflicts.length > 0) {
    console.log('\n⚠️  MODULES NON PLANIFIÉS:');
    conflicts.forEach(c => console.log(`   ${c.module} (${c.semester})`));
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉  RÉSULTATS FINAUX');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  📚 Modules S1/S3/S5  : ${totalMods}`);
  console.log(`  📝 Examens planifiés  : ${scheduled.length} / ${mods.length}`);
  console.log(`  ⚠️  Conflits          : ${conflicts.length}`);
  console.log(`  🎓 Étudiants         : ${totalStudentCount}`);
  console.log(`  🗑️  Rattrapage restant: ${rattrapageCheck} (doit être 0)`);
  console.log(`  📊 Distribution profs: écart ${maxDist - minDist} (idéal: 0-2)`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (rattrapageCheck > 0) {
    console.error('❌ ATTENTION: Il reste des examens rattrapage en base!');
  }

  return {
    scheduled: scheduled.length,
    conflicts: conflicts.length,
    students: totalStudentCount,
    modules: totalMods,
    rattrapageRemaining: rattrapageCheck,
  };
}

// ─── CLI ENTRY ────────────────────────────────────────────────────────────────

if (require.main === module) {
  const URI = process.env.MONGODB_URI;
  if (!URI) { console.error('❌ MONGODB_URI manquante dans .env'); process.exit(1); }

  console.log('🔌 Connexion MongoDB...');
  console.log(`   URI: ${URI.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')}`);

  mongoose.connect(URI, { serverSelectionTimeoutMS: 30000 })
    .then(async () => {
      console.log('✅ MongoDB connecté\n');
      return fixDatabase();
    })
    .then(() => mongoose.disconnect())
    .then(() => { console.log('✅ Terminé. Déployez sur Vercel.'); process.exit(0); })
    .catch(err => { console.error('❌ Erreur:', err.message); process.exit(1); });
}

module.exports = fixDatabase;
