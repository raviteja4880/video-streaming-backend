const fs = require('fs');
const path = require('path');

function renderTemplate(name, data = {}) {
  const p = path.join(__dirname, '..', 'templates', `${name}.html`);
  let html = fs.readFileSync(p, 'utf-8');
  Object.entries(data).forEach(([k, v]) => {
    const re = new RegExp(`{{\s*${k}\s*}}`, 'g');
    html = html.replace(re, String(v));
  });
  return html;
}

module.exports = { renderTemplate };
