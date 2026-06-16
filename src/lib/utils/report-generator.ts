import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Alternative, Impact } from '../types';

export const generateComparativeReport = (
  project: Project,
  alternatives: Alternative[],
  impactsMap: Record<string, Impact[]>
) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(`Informe Comparativo de Impacto Ambiental: ${project.name}`, 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Promotor: ${project.description}`, 14, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 37);

  // Summary Table
  const tableData = alternatives.map(alt => [
    alt.name,
    (alt.valorTotal || 0).toFixed(3),
    alt.valorada ? 'Sí' : 'No'
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Alternativa', 'Valor Total', 'Valorada']],
    body: tableData,
    theme: 'grid',
  });

  // Detailed Analysis per alternative
  alternatives.forEach((alt, index) => {
    doc.addPage();
    doc.setFontSize(14);
    doc.text(`Detalle de Alternativa: ${alt.name}`, 14, 20);
    
    const altImpacts = impactsMap[alt.id] || [];
    const impactData = altImpacts.map(i => {
        let details = 'Importancia: ' + i.importance;
        
        if (i.importance === 'significativo' && i.qualitative) {
            const q = i.qualitative;
            details += `\nCualitativo: Signo:${q.signo}, Int:${q.intensidad}, Ext:${q.extension}, Pers:${q.persistencia}, Rev:${q.reversibilidad}, Rec:${q.recuperabilidad}, Per:${q.periodicidad}, Mom:${q.momento}, Ef:${q.efecto}`;
            
            if (i.quantitative) {
                const qn = i.quantitative;
                details += `\nCuantitativo: Func:${qn.functionType}, Magnitud:${qn.calculatedValue.toFixed(3)}`;
            }
        }

        return [
            i.actionName,
            i.factorName,
            details,
            i.normalizedWeight.toFixed(4)
        ];
    });

    autoTable(doc, {
        startY: 30,
        head: [['Acción', 'Factor', 'Detalle de Valoración', 'Peso']],
        body: impactData,
        theme: 'striped',
        columnStyles: { 2: { cellWidth: 80 } }
    });
  });

  doc.save(`Informe_EIA_${project.name.replace(/\s+/g, '_')}.pdf`);
};
