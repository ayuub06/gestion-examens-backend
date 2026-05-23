// export-all.js
const fs = require('fs');
const path = require('path');

const directoriesToScan = [
    'src',
    'components',
    'pages',
    'services',
    'context',
    'utils',
    'styles'
];

const filesToInclude = [
    'package.json',
    'package-lock.json',
    'README.md',
    'tailwind.config.js',
    'craco.config.js'
];

let output = '========================================\n';
output += 'PROJECT: Gestion Examens Universitaires\n';
output += '========================================\n\n';

function readDirectory(dirPath, basePath = '') {
    const fullPath = path.join(__dirname, dirPath);
    if (!fs.existsSync(fullPath)) return;
    
    const files = fs.readdirSync(fullPath);
    
    for (const file of files) {
        const filePath = path.join(fullPath, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.join(basePath, file);
        
        if (stat.isDirectory()) {
            readDirectory(path.join(dirPath, file), relativePath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.json')) {
            const content = fs.readFileSync(filePath, 'utf8');
            output += `\n\n========================================\n`;
            output += `FILE: ${relativePath}\n`;
            output += `========================================\n\n`;
            output += content;
            output += `\n\n`;
        }
    }
}

// Lire les dossiers sources
for (const dir of directoriesToScan) {
    if (fs.existsSync(dir)) {
        readDirectory(dir);
    }
}

// Lire les fichiers de configuration
for (const file of filesToInclude) {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        output += `\n\n========================================\n`;
        output += `FILE: ${file}\n`;
        output += `========================================\n\n`;
        output += content;
        output += `\n\n`;
    }
}

// Sauvegarder
fs.writeFileSync('project-export.txt', output);
console.log('✅ Export terminé ! Fichier: project-export.txt');