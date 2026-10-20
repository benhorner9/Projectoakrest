import {readFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='https://playcellbound.com/oakrest-dev/';
function walk(dir){return readdirSync(dir).flatMap(n=>statSync(dir+'/'+n).isDirectory()?walk(dir+'/'+n):[dir+'/'+n]);}
const files=walk('dist').filter(f=>!f.split('/').some(p=>p.startsWith('.')));
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
for(let i=0;i<files.length;i+=5)await Promise.all(files.slice(i,i+5).map(async file=>{
 const res=await fetch(base+file.slice(5)+'?verify='+Date.now(),{signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error(file+': HTTP '+res.status);
 const actual=Buffer.from(await res.arrayBuffer());
 if(sha(actual)!==sha(readFileSync(file)))throw Error(file+': hosted bytes differ from tested build');
 if(file.endsWith('.js')&&!/javascript/.test(res.headers.get('content-type')||''))throw Error(file+': invalid module MIME type');
}));
console.log('Verified '+files.length+' hosted development files against the tested build.');
