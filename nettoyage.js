const fs = require('fs');
const files = [
  'apps/api/src/assessments/assessments.service.ts',
  'apps/api/src/grades/grades.service.ts',
  'apps/api/src/assessments/utils/assessment-export.util.ts',
  'packages/shared/src/schemas.ts'
];
const replacements = [
  ['\u00c3\u0192\u00c2 ', '\u00e0 '],
  ['\u00c3\u0192\u00c2\u00a9', '\u00e9'],
  ['\u00c3\u0192\u00c2\u00a8', '\u00e8'],
  ['\u00c3\u0192\u00c2\u00a7', '\u00e7'],
  ['\u00c3\u0192\u00c2\u00b4', '\u00f4'],
  ['\u00c3\u0192\u00c2\u00b0', '\u00b0'],
  ['\u00c3\u0192\u00c2', '\u00e0'],
  ['\u00c3\u00a9', '\u00e9'],
  ['\u00c3\u00a8', '\u00e8'],
  ['\u00c3\u00a7', '\u00e7'],
  ['\u00c3 ', '\u00e0'],
  ['\u00c2\u00b7', '\u00b7'],
  ['N\u00c2\u00b0', 'N\u00b0'],
  ['\u00e2\u0153\u201c', '\u2705'],
  ['\u00e2\u20ac\u201d', '\u2014'],
  ['\u00e2\u20ac\u0153', '\u201c'],
  ['\u00e2\u20ac\u2122', '\u2019'],
  ['\u00e2\u20ac', '\u2014']
];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log('Nettoye : ' + file);
}
