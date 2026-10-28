import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative} from 'node:path';

export const DEVELOPMENT_URL='https://playcellbound.com/oakrest-dev/';
export function requireCommit(commit){
 assert.match(commit||'',/^[0-9a-f]{40}$/,'release requires an exact full commit SHA');
 return commit;
}
export function developmentBase(value=DEVELOPMENT_URL){
 const url=new URL(value);
 const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 assert.ok((local&&url.protocol==='http:')||url.origin==='https://playcellbound.com','unsupported release host');
 assert.equal(url.pathname,'/oakrest-dev/','verification must target /oakrest-dev/ only');
 assert.ok(!url.search&&!url.hash&&!url.username&&!url.password,'plain release base required');
 return url.href;
}
export function stampDevelopmentRelease({directory='dist',commit,actualCommit}){
 requireCommit(commit);
 assert.equal(actualCommit,commit,'checked-out source must match the pinned release');
 assert.ok(!statExists(join(directory,'src/main.js')),'standalone 3D must not ship');
 const html=readFileSync(join(directory,'index.html'),'utf8');
 assert.ok(html.includes('classic.html'),'normal entry must launch Classic');
 for(const file of ['classic.html','src/classic-prototype.js','src/classic-combat.js','vendor/three.module.min.js'])
  assert.ok(statExists(join(directory,file)),file+' must ship');
 const {version}=JSON.parse(readFileSync(join(directory,'asset-version.json'),'utf8'));
 const meta={project:'oakrest',environment:'development',branch:'dev',commit,assetVersion:version,deployedAt:new Date().toISOString()};
 writeFileSync(join(directory,'build-meta.json'),JSON.stringify(meta,null,2)+'\n');
 return meta;
}
function statExists(file){try{return statSync(file).isFile();}catch{return false;}}
function walk(dir){return readdirSync(dir).filter(n=>!n.startsWith('.')).flatMap(n=>{
 const file=join(dir,n);return statSync(file).isDirectory()?walk(file):[file];
});}
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
export async function verifyDevelopmentRelease({directory='dist',commit,base=DEVELOPMENT_URL,fetchImpl=fetch}){
 requireCommit(commit);base=developmentBase(base);
 const expected=JSON.parse(readFileSync(join(directory,'build-meta.json'),'utf8'));
 assert.equal(expected.commit,commit,'local metadata must match the requested release');
 assert.equal(expected.environment,'development');
 assert.equal(expected.branch,'dev');
 const get=async path=>{
  const res=await fetchImpl(base+path+'?verify='+Date.now(),{redirect:'error',cache:'no-store',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
  assert.ok(res.ok,path+': HTTP '+res.status);
  return res;
 };
 const meta=await (await get('build-meta.json')).json();
 assert.equal(meta.commit,commit,'hosted commit must match the pinned release');
 assert.equal(meta.environment,'development');
 assert.equal(meta.branch,'dev');
 assert.equal(meta.assetVersion,expected.assetVersion,'hosted asset fingerprint must match');
 const files=walk(directory);
 for(let i=0;i<files.length;i+=5)await Promise.all(files.slice(i,i+5).map(async file=>{
  const path=relative(directory,file).split('\\').join('/');
  const res=await get(path),actual=Buffer.from(await res.arrayBuffer());
  assert.equal(sha(actual),sha(readFileSync(file)),path+': hosted bytes differ from tested build');
  if(file.endsWith('.js'))assert.match(res.headers.get('content-type')||'',/javascript/,path+': invalid module MIME type');
 }));
 return {commit,files:files.length,assetVersion:meta.assetVersion};
}
