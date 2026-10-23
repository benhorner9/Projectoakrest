const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
test('built static release contains exactly pinned local Quaternius model files and village pieces',async()=>{
 const {QUATERNIUS_MODELS,VILLAGE_MODULE_FILES}=await import('../src/quaternius-catalog.js');
 for(const item of QUATERNIUS_MODELS){
  const file=path.join(root,'dist/assets/quaternius/models',item.file);
  assert.ok(fs.existsSync(file),'missing model: '+item.id);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.byteLength,item.size,'incorrect size: '+item.id);
  const actual=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(actual,item.blob,'source hash mismatch: '+item.id);
 }
 for(const item of VILLAGE_MODULE_FILES){
  const file=path.join(root,'dist/assets/quaternius/village',item.file);
  assert.ok(fs.existsSync(file),'missing medieval module dependency '+item.file);
  if(!item.file.endsWith('.gltf')){
   const bytes=fs.readFileSync(file);
   assert.equal(bytes.length,item.size);
  }else{
   const doc=JSON.parse(fs.readFileSync(file,'utf8'));
   for(const material of doc.materials||[]){
    assert.ok(!material.normalTexture,'normal maps must be excluded for iPad');
    assert.ok(!material.pbrMetallicRoughness?.metallicRoughnessTexture,'ORM maps must be excluded');
   }
  }
 }
 const {RPG_SOURCE}=await import('../src/quaternius-rpg-catalog.js');
 for(const item of RPG_SOURCE)for(const [extension,size] of [['obj',item.bytes[0]],['mtl',item.bytes[1]],['png',item.bytes[2]]]){
  const file=path.join(root,'dist/assets/quaternius/rpg',item.name+'.'+extension);
  assert.ok(fs.existsSync(file),'missing original Quaternius Ultimate RPG '+file);
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.length,size);
  if(extension==='png')assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
 for(const file of ['loaders/GLTFLoader.js','utils/SkeletonUtils.js','utils/BufferGeometryUtils.js','loaders/OBJLoader.js','loaders/MTLLoader.js'])
  assert.ok(fs.existsSync(path.join(root,'dist/vendor/examples/jsm',file)));
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.ok(html.includes('quaternius-art-toggle'));
 assert.ok(html.includes('three/addons/'));
});
