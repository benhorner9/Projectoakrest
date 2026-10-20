import {cpSync,mkdirSync,rmSync,readdirSync,statSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative} from 'node:path';

rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
for(const path of ['index.html','characters.html','src','vendor','.htaccess'])cpSync(path,'dist/'+path,{recursive:true});

// Shared-host static assets have stable filenames. Version module *imports*
// as well as the HTML entry point so iPad/Safari cannot combine a current
// index.html with stale cached JS when a new development build is deployed.
function walk(folder){
 return readdirSync(folder).flatMap(name=>{
  const target=join(folder,name);
  return statSync(target).isDirectory()?walk(target):[target];
 });
}
const sourceFiles=walk('src').filter(p=>/\.(?:js|css)$/.test(p)).sort();
const hash=createHash('sha256');
for(const p of sourceFiles){hash.update(relative('.',p));hash.update(readFileSync(p));}
const version=hash.digest('hex').slice(0,12);
for(const file of sourceFiles.filter(p=>p.endsWith('.js'))){
 const dest=join('dist',file);
 const original=readFileSync(dest,'utf8');
 // Import/export relative module specifiers only. Leave import-map 'three'
 // and other bare specifiers untouched.
 const updated=original.replace(/(\b(?:from|import)\s*['"])(\.{1,2}\/[^'"?\s]+\.js)(['"])/g,
  (all,start,path,end)=>start+path+'?v='+version+end);
 writeFileSync(dest,updated);
}
for(const html of ['dist/index.html','dist/characters.html']){
 let markup=readFileSync(html,'utf8');
 markup=markup.replace(/((?:src|href)=['"])(\.\/src\/[^'"?]+\.(?:js|css))(['"])/g,
  (all,start,path,end)=>start+path+'?v='+version+end);
 writeFileSync(html,markup);
}
writeFileSync('dist/asset-version.json',JSON.stringify({version},null,2)+'\n');
console.log('Static Oakrest build: dist/ (engine included, no runtime CDN). Asset version '+version+'.');
