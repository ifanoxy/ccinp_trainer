const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputFile = __dirname + '/banque_orale.tex';
const baseOutputDir = path.join(__dirname, 'data', 'exercices');

function normalizeCategory(cat) {
    cat = cat.trim().toLowerCase();
    if (cat.includes('analys')) return 'Analyse';
    if (cat.includes('alg')) return 'Algebre';
    if (cat.includes('prob')) return 'Probabilites';
    return 'Autres';
}

try {
    const content = fs.readFileSync(inputFile, 'utf-8');

    const preambleMatch = content.match(/^([\s\S]*?)\\begin\{document\}/);
    if (!preambleMatch) {
        console.error("Impossible de trouver \\begin{document} dans le fichier source.");
        process.exit(1);
    }

    let preamble = preambleMatch[1];

    preamble = preamble.replace(/\\documentclass\[(.*?)\]\{article\}/, '\\documentclass[12pt, a4paper, landscape]{article}');

    if (preamble.includes('\\usepackage[')) {
        preamble = preamble.replace(/\\usepackage\[(.*?)\]\{geometry\}/, '\\usepackage[a4paper, landscape, margin=2cm]{geometry}');
    }

    if (!preamble.includes('{adjustbox}')) {
        preamble += '\n\\usepackage{adjustbox}\n';
    }

    const exerciseRegex = /\\section\*\{EXERCICE\s+(\d+)\s*(?:\:|\\:)?\s*([a-zA-ZàâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ]+)\s*\}([\s\S]*?)(?=\\section\*\{EXERCICE|\\end\{document\})/g;

    let match;
    let count = 0;

    console.log("Début de la génération et de la compilation des flashcards...\n");

    while ((match = exerciseRegex.exec(content)) !== null) {
        const num = match[1];
        const rawCategory = match[2];
        let exoContent = match[3];

        const beginCount = (exoContent.match(/\\begin\{flushleft\}/g) || []).length;
        const endCount = (exoContent.match(/\\end\{flushleft\}/g) || []).length;
        if (endCount > beginCount) {
            exoContent = exoContent.replace(/\\end\{flushleft\}/g, '');
        }

        const categoryName = normalizeCategory(rawCategory);
        const categoryDir = path.join(baseOutputDir, categoryName);

        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
            console.log(`📁 Sous-dossier créé : ${categoryDir}`);
        }

        const baseName = `exercice_${num}`;
        const texFilePath = path.join(categoryDir, `${baseName}.tex`);

        const fileContent = `${preamble}
\\begin{document}
\\pagestyle{empty}

\\vspace*{\\fill} 

\\begin{center}

\\begin{adjustbox}{max totalheight=0.9\\textheight, max width=0.95\\textwidth}
\\begin{minipage}{\\textwidth}
{\\LARGE \\textbf{\\textsf{Exercice ${num} - ${categoryName}}}}\\\\
\\rule{\\textwidth}{0.4pt}
\\vspace{0.8cm}

{\\large 
${exoContent}
}
\\end{minipage}
\\end{adjustbox}
\\end{center}

\\vspace*{\\fill}

\\end{document}`;

        fs.writeFileSync(texFilePath, fileContent);
        console.log(`Fichier ${baseName}.tex préparé dans ${categoryName}. Compilation en cours...`);

        try {
            execSync(`pdflatex -interaction=nonstopmode "${baseName}.tex"`, {
                cwd: categoryDir,
                stdio: 'ignore'
            });
            console.log(`\t- ${baseName}.pdf généré avec succès`);
            count++;

            const exts = ['.log', '.aux', '.out'];
            exts.forEach(ext => {
                const tempFile = path.join(categoryDir, `${baseName}${ext}`);
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            });

        } catch (error) {
            console.error(`Erreur lors de la compilation de ${baseName}.tex`);
        }
    }

    console.log(`\nTerminé ! ${count} pdf ont été créées`);

} catch (err) {
    console.error("Erreur :", err.message);
}