const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const root=path.join(__dirname,'..');
test('the built release contains verified self-hosted CC0 humanoids and skeleton',async()=>{
 const {CHARACTER_ART}=await import('../src/character-asset-catalog.js');
 for(const [id,item] of Object.entries(CHARACTER_ART)){
  const file=path.join(root,'dist/assets/kaykit-character-art',item.file);
  assert.ok(fs.existsSync(file),'missing built '+id);
  const buffer=fs.readFileSync(file);
  assert.equal(buffer.byteLength,item.size,id+' byte count');
  const h=crypto.createHash('sha1').update('blob '+buffer.length+'\0').update(buffer).digest('hex');
  assert.equal(h,item.blob,id+' pinned source blob hash');
 }
 for(const suffix of ['LICENSE-ADVENTURERS.txt','LICENSE-SKELETONS.txt','PROVENANCE.md'])
  assert.ok(fs.existsSync(path.join(root,'dist/assets/kaykit-character-art',suffix)));
 for(const suffix of ['loaders/GLTFLoader.js','utils/BufferGeometryUtils.js'])
  assert.ok(fs.existsSync(path.join(root,'dist/vendor/examples/jsm',suffix)));
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.ok(html.includes('"three/addons/": "./vendor/examples/jsm/"'));
 assert.ok(html.includes('id="character-art-toggle"'));
});
