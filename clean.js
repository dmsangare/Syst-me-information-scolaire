const fs = require('fs');
const path = require('path');

function walk(dir, done) {
    let results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        let pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function(file) {
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                        results.push(file);
                    }
                    if (!--pending) done(null, results);
                }
            });
        });
    });
}

const root = 'C:/Users/dmsan/Documents/AppEcole/sis-mali-ui/apps';
let count = 0;

walk(root, (err, files) => {
    if (err) { console.error(err); return; }
    
    for (const file of files) {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;
        
        content = content.split('ÃƒÂ©').join('é')
                         .split('ÃƒÂ¨').join('è')
                         .split('ÃƒÂª').join('ê')
                         .split('ÃƒÂ§').join('ç')
                         .split('ÃƒÂ´').join('ô')
                         .split('Ã©').join('é')
                         .split('Ã¨').join('è')
                         .split('Ãª').join('ê')
                         .split('Ã¢').join('â')
                         .split('Ã®').join('î')
                         .split('Ã´').join('ô')
                         .split('Ã»').join('û')
                         .split('Ã§').join('ç')
                         .split('Ã‰').join('É')
                         .split('Ã€').join('À')
                         .split('Ã ').join('à')
                         .split('âÅ“').join('✅')
                         .split('ââ‚¬').join('—')
                         .split('â€”').join('—')
                         .split('â€™').join("'")
                         .split('â€œ').join('"')
                         .split('â€').join('"')
                         .split('Â·').join('·')
                         .split('NÂ°').join('N°');
                         
        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('OK: ' + path.basename(file));
            count++;
        }
    }
    console.log('\nTotal fichiers nettoyés : ' + count);
});