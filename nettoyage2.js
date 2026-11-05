const fs = require('fs');
const files = [
  'apps/api/src/assessments/assessments.service.ts',
  'apps/api/src/grades/grades.service.ts',
  'packages/shared/src/schemas.ts'
];
const replacements = [
  ['\u00e2\u00c5\u201c', '\u2705'],       // ??? -> ?
  ['\u00c3\u00a0 recalculer', '\u00e0 recalculer'], // ? recalculer -> ? recalculer
  ['\u00e2\u00e2\u20ac\u201d', '\u2014'], // ????" -> ?
  ['\u00c3\u0192\u00c2', '\u00e0'],       // ??? -> ? (au cas ou)
  ['\u00c3 ', '\u00e0']                   // ?  -> ?
];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log('Nettoye 2 : ' + file);
}
