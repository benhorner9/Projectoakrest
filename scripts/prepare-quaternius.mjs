/**
 * Pull curated CC0 sources to a self-hosted build. No runtime asset CDN.
 * GitHub commit, Git blob SHA-1 and exact byte length are all verified.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {copyFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';
import {QUATERNIUS_MODELS,VILLAGE_MODULE_FILES} from '../src/quaternius-catalog.js';
export const shaBlob=buffer=>createHash('sha1').update('blob '+buffer.length+'\0').update(buffer).digest('hex');
const root='assets/quaternius';
const inputs=[...QUATERNIUS_MODELS,...VILLAGE_MODULE_FILES];
function targetFor(item){return item.file.endsWith('.glb')?join(root,'models',item.file):join(root,'village',item.file);}
export async function prepareAssets(){
 for(const item of inputs){
  const target=targetFor(item);await mkdir(dirname(target),{recursive:true});
  let data;
  try{data=await readFile(target);}catch{}
  if(data?.length===item.size&&shaBlob(data)===item.blob)continue;
  const remote='https://raw.githubusercontent.com/'+item.repo+'/'+item.commit+'/'+item.path;
  let error;
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const res=await fetch(remote,{signal:AbortSignal.timeout(40000)});
    if(!res.ok)throw Error(res.status+' '+res.statusText);
    data=Buffer.from(await res.arrayBuffer());
    if(data.length!==item.size||shaBlob(data)!==item.blob)
     throw Error('Quaternius supply chain integrity mismatch: '+item.path);
    await writeFile(target,data);error=null;break;
   }catch(err){error=err;if(attempt!==3)await new Promise(r=>setTimeout(r,350*attempt));}
  }
  if(error)throw Error('Cannot fetch verified CC0 model '+item.id+': '+error.message);
  console.log('Quaternius verified',item.id,Math.round(item.size/1024)+' KiB');
 }
 // Keep source glTF geometry and node transforms, but omit GPU-expensive
 // normal/roughness textures. Base-colour maps remain authoritative.
 for(const item of VILLAGE_MODULE_FILES.filter(x=>x.file.endsWith('.gltf'))){
  const path=targetFor(item),obj=JSON.parse(await readFile(path,'utf8'));
  for(const m of obj.materials||[]){
   delete m.normalTexture;delete m.occlusionTexture;
   if(m.pbrMetallicRoughness)delete m.pbrMetallicRoughness.metallicRoughnessTexture;
  }
  // Original bytes were verified above before transformation.
  await writeFile(path,JSON.stringify(obj));
 }
 for(const [source,target] of [
  ['node_modules/three/examples/jsm/loaders/GLTFLoader.js','vendor/examples/jsm/loaders/GLTFLoader.js'],
  ['node_modules/three/examples/jsm/utils/BufferGeometryUtils.js','vendor/examples/jsm/utils/BufferGeometryUtils.js'],
  ['node_modules/three/examples/jsm/utils/SkeletonUtils.js','vendor/examples/jsm/utils/SkeletonUtils.js']
 ]){
  mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)await prepareAssets();
