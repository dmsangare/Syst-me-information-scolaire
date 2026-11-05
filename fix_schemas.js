const fs = require('fs');
const file = 'packages/shared/src/schemas.ts';
let content = fs.readFileSync(file, 'utf8');
// On remplace tout ce qui ressemble a un tiret cadratin corrompu par un vrai tiret
content = content.replace(/SIS-MALI [^ ]+ Schemas/g, 'SIS-MALI - Schemas');
content = content.replace(/SIS-MALI [^ ]+ Sch/g, 'SIS-MALI - Sch');
content = content.replace(/BACKUP [^ ]+ Configuration/g, 'BACKUP - Configuration');
fs.writeFileSync(file, content, 'utf8');
console.log('Lignes 2 et 750 corrigees.');
