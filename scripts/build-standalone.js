const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const releaseDirectory = path.join(root, 'release');
const outputPath = path.join(releaseDirectory, 'Production-Line-Simulator-V1.html');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const simulation = fs.readFileSync(path.join(root, 'simulation.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

html = html.replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${styles}\n</style>`);
html = html.replace('<script src="simulation.js"></script>', `<script>\n${simulation}\n</script>`);
html = html.replace('<script src="app.js"></script>', `<script>\n${app}\n</script>`);

if (/<script\s+src=|<link\s+rel="stylesheet"/i.test(html)) {
  throw new Error('Standalone build still contains an external script or stylesheet reference.');
}

fs.mkdirSync(releaseDirectory, { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`Built ${outputPath}`);
