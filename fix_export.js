const fs = require('fs');
const file = 'apps/api/src/assessments/utils/assessment-export.util.ts';
let content = fs.readFileSync(file, 'utf8');
// Remplacements avec codes Unicode uniquement
content = content.split('\u00c2\u00b7').join('\u00b7');      // ?? -> ?
content = content.split('N\u00c2\u00b0').join('N\u00b0');     // N?? -> N?
content = content.split('\u00e2\u20ac\u201d').join('\u2014'); // ??" -> ?
content = content.split('\u00e2\u20ac\u0153').join('\u201c'); // ??? -> "
content = content.split('\u00e2\u20ac\u009d').join('\u201d'); // ?? -> "
content = content.split('\u00e2\u20ac\u2122').join('\u2019'); // ??? -> '
fs.writeFileSync(file, content, 'utf8');
console.log('Fichier assessment-export.util.ts nettoye.');
