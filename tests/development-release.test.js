import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {developmentBase,requireCommit,stampDevelopmentRelease,verifyDevelopmentRelease} from '../scripts/development-release.mjs';
const commit='a'.repeat(40);

test('release targets reject production, credentials, alternate hosts and partial commits',()=>{
 assert.equal(developmentBase(),'https://playcellbound.com/oakrest-dev/');
 for(const url of ['https://playcellbound.com/oakrest/','https://example.com/oakrest-dev/',
  'https://user:pass@playcellbound.com/oakrest-dev/','https://playcellbound.com/oakrest-dev/?qa=1'])
  assert.throws(()=>developmentBase(url));
 for(const sha of [undefined,'dev','aaaaaaa','a'.repeat(39)])assert.throws(()=>requireCommit(sha));
});

test('release verification detects stale commits, altered assets, wrong MIME, missing files and redirects',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'oakrest-release-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const [file,body] of Object.entries({
  'index.html':'<script>location.replace("classic.html")</script>',
  'classic.html':'<main id="classic-game"></main>',
  'src/classic-prototype.js':'export const classic=true;',
  'src/classic-combat.js':'export const combat=true;',
  'vendor/three.module.min.js':'export const three=true;',
  'asset-version.json':'{"version":"test-assets"}'
 })){
  mkdirSync(join(directory,file,'..'),{recursive:true});writeFileSync(join(directory,file),body);
 }
 assert.throws(()=>stampDevelopmentRelease({directory,commit,actualCommit:'b'.repeat(40)}),/checked-out/);
 stampDevelopmentRelease({directory,commit,actualCommit:commit});
 let fault=null;
 const server=createServer((req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.replace('/oakrest-dev/','');
  if(file==='src/classic-combat.js'&&fault==='redirect'){
   res.writeHead(302,{Location:'/oakrest/src/classic-combat.js'});return res.end();
  }
  if(file==='src/classic-combat.js'&&fault==='missing'){res.writeHead(404);return res.end();}
  let bytes=readFileSync(join(directory,file));
  if(file==='build-meta.json'&&fault==='commit'){
   const meta=JSON.parse(bytes);meta.commit='b'.repeat(40);bytes=JSON.stringify(meta);
  }
  if(file==='src/classic-combat.js'&&fault==='bytes')bytes='stale code';
  res.setHeader('Content-Type',file.endsWith('.js')&&fault!=='mime'?'text/javascript':'text/plain');
  res.end(bytes);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{server.closeAllConnections();server.close();});
 const base=`http://127.0.0.1:${server.address().port}/oakrest-dev/`;
 const options={directory,commit,base};
 assert.deepEqual(await verifyDevelopmentRelease(options),{commit,files:7,assetVersion:'test-assets'});
 for(const [kind,pattern] of [['commit',/hosted commit/],['bytes',/hosted bytes/],
  ['mime',/MIME/],['missing',/HTTP 404/],['redirect',/fetch failed/]]){
  fault=kind;await assert.rejects(verifyDevelopmentRelease(options),pattern);
 }
 writeFileSync(join(directory,'src/main.js'),'legacy');
 assert.throws(()=>stampDevelopmentRelease({directory,commit,actualCommit:commit}),/standalone 3D/);
});
