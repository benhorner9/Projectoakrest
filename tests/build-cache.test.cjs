const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');

test('Classic is the only built entry and modules are cache fingerprinted',()=>{
 assert.ok(existsSync('dist/asset-version.json'),'build output exists');
 const {version}=JSON.parse(readFileSync('dist/asset-version.json','utf8'));
 assert.match(version,/^[0-9a-f]{12}$/);
 const entry=readFileSync('dist/index.html','utf8');
 assert.ok(entry.includes("location.replace('./classic.html' + location.search + location.hash)"),'root preserves search and hash on Classic handoff');
 assert.ok(!entry.includes('src/main.js'),'old third-person entry is gone');
 assert.equal(existsSync('dist/src/main.js'),false,'obsolete 3D runtime is not shipped');
 assert.equal(existsSync('dist/visual-reference.html'),false,'old 3D reference viewer is not shipped');
 const html=readFileSync('dist/classic.html','utf8');
 for(const path of ['classic.css','classic-hud.css','classic-character.css']){
   assert.ok(html.includes('./src/'+path+'?v='+version),'Classic CSS is fingerprinted: '+path);
 }
 assert.ok(html.includes('src/classic-prototype.js?v='+version),'Classic runtime is fingerprinted');
 assert.ok(html.includes('"three":"./vendor/three.module.min.js"'),'Classic retains its necessary Three.js renderer');
 const classic=readFileSync('dist/src/classic-prototype.js','utf8');
 assert.match(classic,/from '\.\/rules\.js\?v=[a-f0-9]{12}'/,'Classic rules module versioned');
 assert.ok(readFileSync('src/classic-prototype.js','utf8').includes("from './rules.js'"),'checked-in source unmodified');
});
test('self-hosted shared item assets remain available to Classic',()=>{
 for(const name of ['sword_1handed','dagger','staff','wand','crossbow_2handed','shield_square','axe_1handed','quiver']){
  assert.ok(existsSync('dist/assets/kaykit-adventurers/'+name+'.gltf'),name+' glTF');
  assert.ok(existsSync('dist/assets/kaykit-adventurers/'+name+'.bin'),name+' buffer');
  assert.ok(existsSync('dist/assets/kaykit-adventurers/icons/'+name+'.svg'),name+' icon');
 }
 assert.ok(existsSync('dist/assets/kaykit-adventurers/LICENSE.txt'));
});
