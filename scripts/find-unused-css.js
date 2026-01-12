const fs = require('fs');
const path = require('path');

function walk(dir){
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file=>{
    const full = path.join(dir,file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) results = results.concat(walk(full));
    else results.push(full);
  });
  return results;
}

const projectRoot = path.resolve(__dirname, '..');
const cssPath = path.join(projectRoot, 'css', 'styles.css');
if (!fs.existsSync(cssPath)) { console.error('styles.css not found'); process.exit(1); }
const css = fs.readFileSync(cssPath,'utf8');
// simple regex to capture class selectors (start of selector or after comma)
const classSet = new Set();
const re = /\.(?:[A-Za-z0-9_-]+)(?=[\s\.,:{>\[])/g;
let m;
while((m=re.exec(css))!==null){
  const cls = m[0].slice(1);
  classSet.add(cls);
}
// fallback: also capture .className at line ends
const re2 = /\.([A-Za-z0-9_-]+)\b/g;
while((m=re2.exec(css))!==null){ classSet.add(m[1]); }

const classes = Array.from(classSet).sort();

// gather files to search (exclude node_modules, .git, css/styles.css itself)
const allFiles = walk(projectRoot).filter(f=>{
  const rel = path.relative(projectRoot,f);
  if (rel.startsWith('node_modules') || rel.startsWith('.git')) return false;
  if (path.resolve(f) === path.resolve(cssPath)) return false;
  const ext = path.extname(f).toLowerCase();
  return ['.html','.js','.ts','.jsx','.tsx','.json','.php','.md','.css'].includes(ext);
});

function fileContainsClass(file, cls){
  try{
    const txt = fs.readFileSync(file,'utf8');
    // look for class="... cls ..." or class='... cls ...' or .cls in JS/CSS or querySelector('.cls') or classList.add('cls')
    const patterns = [
      new RegExp('class\\s*=\\s*"[^\\"]*\\b'+cls+'\\b[^\\"]*"','i'),
      new RegExp("class\\s*=\\s*'[^']*\\b"+cls+"\\b[^']*'","i"),
      new RegExp('\\.'+cls+'\\b'),
      new RegExp("classList\\.add\\s*\\(\\s*['\"]"+cls+"['\"]\\s*\\)"),
      new RegExp("querySelector(All)?\\\(\\s*['\"]\\."+cls+"['\"]\\s*\\)")
    ];
    return patterns.some(r=>r.test(txt));
  }catch(e){ return false; }
}

const unused = [];
for(const cls of classes){
  let found = false;
  for(const f of allFiles){
    if (fileContainsClass(f, cls)) { found = true; break; }
  }
  if (!found) unused.push(cls);
}

console.log(JSON.stringify({ total_classes: classes.length, unused_count: unused.length, unused }, null, 2));
