import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Alternative, Impact } from '../types';

export const generateComparativeReport = (
  project: Project,
  alternatives: Alternative[],
  impactsMap: Record<string, Impact[]>
) => {
  const doc = new jsPDF();
  let y = 20;

  const addText = (text: string, size: number = 12, bold: boolean = false) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 14, y);
    y += lines.length * (size / 2) + 5;
  };

  // Header
  addText(`Informe Comparativo de Impacto Ambiental: ${project.name}`, 18, true);
  addText(`Promotor: ${project.description}`, 12);
  addText(`Fecha: ${new Date().toLocaleDateString()}`, 12);
  y += 10;

  // Actions/Factors Table
  addText("Definición de Acciones y Factores", 14, true);
  autoTable(doc, {
    startY: y,
    head: [['Elemento', 'Tipo/Peso']],
    body: [
        ['Acciones', 'Framework estándar'],
        ['Factores', 'Ponderación jerárquica']
    ],
    theme: 'striped',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Details
  alternatives.forEach((alt) => {
    addText(`Detalle de Alternativa: ${alt.name}`, 16, true);
    
    const altImpacts = impactsMap[alt.id] || [];
    altImpacts.forEach((i) => {
      addText(`Acción: ${i.actionName}`, 12, true);
      addText(`Factor: ${i.factorName}`, 12);
      addText(`Descripción: ${i.description || 'Sin descripción'}`, 12);
      
      if (i.importance === 'significativo' && i.qualitative) {
        addText(`Valoración Cualitativa:`, 12, true);
        const q = i.qualitative;
        autoTable(doc, {
            startY: y,
            head: [['Parámetro', 'Valor']],
            body: [
                ['Signo', q.signo],
                ['Intensidad', q.intensidad],
                ['Extensión', q.extension],
                ['Persistencia', q.persistencia],
                ['Reversibilidad', q.reversibilidad],
                ['Recuperabilidad', q.recuperabilidad],
                ['Periodicidad', q.periodicidad],
                ['Momento', q.momento],
                ['Efecto', q.efecto]
            ],
            theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 5;
        
        if (i.quantitative) {
            addText(`Valoración Cuantitativa (Magnitud: ${i.quantitative.calculatedValue.toFixed(3)})`, 12, true);
        }
      } else {
        addText(`Valoración: ${i.importance}`, 11);
      }
      y += 5;
    });
    y += 10;
  });

  doc.save(`Informe_EIA_${project.name.replace(/\s+/g, '_')}.pdf`);
};
