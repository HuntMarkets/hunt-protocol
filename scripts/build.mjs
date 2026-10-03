import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'dist');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'main.js', 'styles.css', 'tokens.css']) cpSync(join(src, f), join(out, f));
cpSync(join(src, 'lib'), join(out, 'lib'), { recursive: true });

// favicon colours come from the tokens file, never typed here
const tokens = readFileSync(join(src, 'tokens.css'), 'utf8');
const tok = (n) => tokens.match(new RegExp('--' + n + ':\s*([^;]+);'))[1].trim();
writeFileSync(
  join(out, 'favicon.svg'),
  readFileSync(join(src, 'favicon.tpl.svg'), 'utf8').replace('{{bg}}', tok('c-accent')).replace(/\{\{fg\}\}/g, tok('c-inv')),
);
console.log('built dist/');
