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
 const main=readFileSync('dist/src/main.js','utf8');
 assert.ok(main.includes("from './character-creator.js?v="+version+"'"),'new character module is versioned');
 assert.ok(main.includes("from './characters.js?v="+version+"'"),'character storage module is versioned');
 assert.ok(main.includes("from './rules.js?v="+version+"'"),'game rules module is versioned');
 assert.ok(html.includes('"three": "./vendor/three.module.min.js"'),'three import map still works');
 // Fingerprints must not alter the checked-in source code.
 const source=readFileSync('src/main.js','utf8');
 assert.ok(source.includes("from './character-creator.js'"));
});
