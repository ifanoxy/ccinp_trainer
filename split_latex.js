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

    const exerciseRegex = /\\section\*\{(?:EXERCICE|Exercice|exercice)\s+(\d+)(.*?)\}([\s\S]*?)(?=\\section\*\{(?:EXERCICE|Exercice|exercice)|\\end\{document\})/gi;

    let match;
    let count = 0;

    console.log("Début de la génération et de la compilation des flashcards...\n");

    while ((match = exerciseRegex.exec(content)) !== null) {
        const num = match[1];
        const rawCategory = match[2].replace(/[^a-zA-ZàâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ]/g, ' ').trim();
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
        }

        const baseName = `exercice_${num}`;
        const texFilePath = path.join(categoryDir, `${baseName}.tex`);

        const fileContent = `${preamble}\n\\begin{document}\n\\pagestyle{empty}\n\\vspace*{\\fill}\n\\begin{center}\n\\begin{adjustbox}{max totalheight=0.9\\textheight, max width=0.95\\textwidth}\n\\begin{minipage}{\\textwidth}\n{\\LARGE \\textbf{\\textsf{Exercice ${num} - ${categoryName}}}}\\\\\n\\rule{\\textwidth}{0.4pt}\n\\vspace{0.8cm}\n{\\large \n${exoContent}\n}\n\\end{minipage}\n\\end{adjustbox}\n\\end{center}\n\\vspace*{\\fill}\n\\end{document}`;

        fs.writeFileSync(texFilePath, fileContent);
        console.log(`Préparation : ${baseName}.tex dans ${categoryName}`);

        try {
            execSync(`pdflatex -interaction=nonstopmode "${baseName}.tex"`, {
                cwd: categoryDir,
                stdio: 'ignore'
            });
            console.log(`\t- ${baseName}.pdf généré avec succès`);
            count++;

            ['.log', '.aux', '.out'].forEach(ext => {
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