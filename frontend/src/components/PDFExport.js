// FIX #4 – PDFExport.js
// La bonne façon d'utiliser jspdf-autotable v3+ avec jsPDF v2+ :
//   import autoTable from 'jspdf-autotable'   ← fonction standalone
//   autoTable(doc, options)                   ← NE PAS utiliser doc.autoTable()

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─────────────────────────────────────────────
// Fonction générique d'export
// ─────────────────────────────────────────────
export const exportToPDF = (data, title, columns) => {
  console.log('exportToPDF appelé:', { lignes: data?.length, titre: title });

  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter');
    return false;
  }

  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // En-tête
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `École Supérieure de Technologie Fquih Ben Salah  –  Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      14,
      30
    );

    // Préparer les données
    const headers = columns.map((c) => c.label);
    const body = data.map((item) =>
      columns.map((col) => {
        const val = item[col.key];
        if (col.key === 'date' && val) return new Date(val).toLocaleDateString('fr-FR');
        if (typeof val === 'object' && val !== null) {
          if (val.nom)  return val.nom;
          if (val.name) return `${val.name} ${val.prenom || ''}`.trim();
          return '-';
        }
        return val ?? '-';
      })
    );

    // FIX #4 – appel correct : autoTable(doc, options)
    autoTable(doc, {
      startY: 38,
      head: [headers],
      body,
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      margin: { left: 14, right: 14 },
      didDrawPage: (hookData) => {
        // Numérotation des pages
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Page ${hookData.pageNumber} / ${pageCount}`,
          doc.internal.pageSize.getWidth() - 30,
          doc.internal.pageSize.getHeight() - 8
        );
      },
    });

    const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    console.log('PDF sauvegardé :', fileName);
    return true;

  } catch (error) {
    console.error('Erreur génération PDF:', error);
    alert('Erreur lors de la génération du PDF : ' + error.message);
    return false;
  }
};

// ─────────────────────────────────────────────
// Export étudiant
// ─────────────────────────────────────────────
export const generateStudentPDF = (user, exams) => {
  if (!exams?.length) {
    alert('Aucun examen trouvé pour cet étudiant');
    return;
  }

  const columns = [
    { label: 'Module',      key: 'module' },
    { label: 'Code',        key: 'code_module' },
    { label: 'Session',     key: 'session' },
    { label: 'Date',        key: 'date' },
    { label: 'Heure',       key: 'time' },
    { label: 'Salle',       key: 'room' },
    { label: 'Surveillant', key: 'supervisor' },
  ];

  const rows = exams.map((e) => ({
    module:     e.module || 'N/A',
    code_module: e.code_module || 'N/A',
    session:    e.session || 'normale',
    date:       e.date,
    time:       `${e.heure_debut || '?'} – ${e.heure_fin || '?'}`,
    room:       e.salle?.nom || e.salle || 'Non assignée',
    supervisor: e.surveillant?.name
      ? `${e.surveillant.name} ${e.surveillant.prenom || ''}`.trim()
      : (e.surveillant || 'Non assigné'),
  }));

  exportToPDF(rows, `Planning_${user.prenom}_${user.name}`, columns);
};

// ─────────────────────────────────────────────
// Export professeur
// ─────────────────────────────────────────────
export const generateProfessorPDF = (user, exams) => {
  if (!exams?.length) {
    alert('Aucun examen trouvé pour ce professeur');
    return;
  }

  const columns = [
    { label: 'Module',     key: 'module' },
    { label: 'Code',       key: 'code_module' },
    { label: 'Session',    key: 'session' },
    { label: 'Date',       key: 'date' },
    { label: 'Heure',      key: 'time' },
    { label: 'Salle',      key: 'room' },
    { label: 'Étudiants',  key: 'studentCount' },
  ];

  const rows = exams.map((e) => ({
    module:       e.module || 'N/A',
    code_module:  e.code_module || 'N/A',
    session:      e.session || 'normale',
    date:         e.date,
    time:         `${e.heure_debut || '?'} – ${e.heure_fin || '?'}`,
    room:         e.salle?.nom || e.salle || 'Non assignée',
    studentCount: e.etudiants?.length ?? e.nombre_etudiants ?? 0,
  }));

  exportToPDF(rows, `Surveillance_${user.prenom}_${user.name}`, columns);
};

// ─────────────────────────────────────────────
// Export admin (liste complète)
// ─────────────────────────────────────────────
export const generateAdminPDF = (exams) => {
  if (!exams?.length) {
    alert('Aucun examen à exporter');
    return;
  }

  const columns = [
    { label: 'Module',      key: 'module' },
    { label: 'Code',        key: 'code_module' },
    { label: 'Session',     key: 'session' },
    { label: 'Dept',        key: 'department' },
    { label: 'Date',        key: 'date' },
    { label: 'Heure',       key: 'time' },
    { label: 'Salle',       key: 'room' },
    { label: 'Surveillant', key: 'supervisor' },
    { label: 'Étudiants',   key: 'studentCount' },
  ];

  const rows = exams.map((e) => ({
    module:       e.module || 'N/A',
    code_module:  e.code_module || 'N/A',
    session:      e.session || 'normale',
    department:   e.department || '-',
    date:         e.date,
    time:         `${e.heure_debut || '?'} – ${e.heure_fin || '?'}`,
    room:         e.salle?.nom || e.salle || 'Non assignée',
    supervisor:   e.surveillant?.name
      ? `${e.surveillant.name} ${e.surveillant.prenom || ''}`.trim()
      : (e.surveillant || 'Non assigné'),
    studentCount: e.etudiants?.length ?? e.nombre_etudiants ?? 0,
  }));

  exportToPDF(rows, 'Planning_Complet_Examens', columns);
};

// Alias pour compatibilité
export const exportStudentExamPDF = generateStudentPDF;