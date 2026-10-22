const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join}=require('node:path');

test('release asset import version prevents stale iPad ES modules',()=>{
 assert.ok(existsSync('dist/asset-version.json'),'build output exists');
 const {version}=JSON.parse(readFileSync('dist/asset-version.json','utf8'));
 assert.match(version,/^[0-9a-f]{12}$/);
 const html=readFileSync('dist/index.html','utf8');
 for(const path of ['main.js','styles.css','character-creator.css']){
  const ref='./src/'+(path==='main.js'?'main.js':path);
  assert.ok(html.includes(ref+'?v='+version),'HTML must version '+ref);
 }
 const characters=readFileSync('dist/characters.html','utf8');
 assert.ok(characters.includes('./src/character-standalone.js?v='+version),'standalone char JS versioned');
 assert.ok(characters.includes('./src/character-standalone.css?v='+version),'standalone char CSS versioned');
 assert.ok(html.includes('href="./characters.html"'),'title has native Characters navigation');
 const main=readFileSync('dist/src/main.js','utf8');
 assert.ok(main.includes("from './character-creator.js?v="+version+"'"),'new character module is versioned');
 assert.ok(main.includes("from './characters.js?v="+version+"'"),'character storage module is versioned');
 assert.ok(main.includes("from './rules.js?v="+version+"'"),'game rules module is versioned');
 assert.ok(html.includes('"three": "./vendor/three.module.min.js"'),'three import map still works');
 // Fingerprints must not alter the checked-in source code.
 const bridge=readFileSync('dist/src/character-art-bridge.js','utf8');
 assert.ok(bridge.includes("import('./character-art.js?v="+version+"')"),'lazy asset import must also be versioned for Safari');
 const source=readFileSync('src/main.js','utf8');
 assert.ok(source.includes("from './character-creator.js'"));
});

test('self-hosted CC0 item meshes, icons and texture atlases survive build',()=>{
 for(const name of ['sword_1handed','dagger','staff','wand','crossbow_2handed','shield_square','axe_1handed','quiver']){
  assert.ok(existsSync('dist/assets/kaykit-adventurers/'+name+'.gltf'),name+' glTF');
  assert.ok(existsSync('dist/assets/kaykit-adventurers/'+name+'.bin'),name+' buffer');
  assert.ok(existsSync('dist/assets/kaykit-adventurers/icons/'+name+'.svg'),name+' inventory icon');
 }
 assert.ok(existsSync('dist/assets/kaykit-adventurers/LICENSE.txt'));
 assert.ok(existsSync('dist/assets/kaykit-adventurers/knight_texture.png'));
 assert.ok(existsSync('dist/assets/kaykit-adventurers/rogue_texture.png'));
});
