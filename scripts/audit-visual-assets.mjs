import {readFileSync,statSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {ITEM_CATALOG,itemIconUrl} from '../src/items.js';
import {listAnimationSpecs} from '../src/ability-animation.js';
import {MODEL_NAMES} from '../src/item-model-registry.js';
import {createActor,equipActor} from '../src/actors.js';
import {WEAPON_PROFILES,validateHumanoidRig} from '../src/rig-contract.js';
const root=resolve('.'),errors=[],manifest=[];
function record(file){const bytes=readFileSync(file);manifest.push({path:relative(root,file).split(sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});if(bytes.length>2*1024*1024)errors.push(`${file}: individual asset exceeds 2 MiB review budget`);}
function walk(dir){for(const name of readdirSync(dir)){const p=resolve(dir,name);if(statSync(p).isDirectory())walk(p);else record(p);}}
walk(resolve('assets'));
function localReference(base,uri){if(typeof uri!=='string'||!uri||/^(?:[a-z]+:|\/)/i.test(uri))throw Error('non-local asset reference');const p=resolve(base,uri);if(!p.startsWith(base+sep))throw Error('asset path escapes bundle');if(!existsSync(p))throw Error('missing '+uri);return p;}
for(const name of MODEL_NAMES){try{
 const dir=resolve('assets/kaykit-adventurers'),doc=JSON.parse(readFileSync(resolve(dir,name+'.gltf'),'utf8'));
 if(doc.asset.version!=='2.0')throw Error('unsupported glTF version');
 if(doc.extensionsRequired?.length)throw Error('required extensions unsupported by accessory loader');
 if(doc.skins?.length||doc.animations?.length)throw Error('skinned/animated glTF requires full loader and retarget validation');
 for(const buffer of doc.buffers||[]){const p=localReference(dir,buffer.uri);if(statSync(p).size!==buffer.byteLength)throw Error('buffer length mismatch '+buffer.uri);}
 for(const image of doc.images||[]){const p=localReference(dir,image.uri);if(!p.endsWith('.png'))throw Error('unsupported texture format');}
 for(const a of doc.accessors||[]){if(a.sparse)throw Error('sparse accessor unsupported');if(!doc.bufferViews[a.bufferView])throw Error('missing buffer view');if(doc.bufferViews[a.bufferView].byteStride)throw Error('interleaved accessor unsupported');}
 for(const mesh of doc.meshes||[])for(const p of mesh.primitives||[]){if(p.mode!==undefined&&p.mode!==4)throw Error('non-triangle primitive unsupported');if(p.material!==undefined&&!doc.materials?.[p.material])throw Error('invalid material reference');if(!doc.accessors[p.attributes?.POSITION])throw Error('missing positions');}
 }catch(e){errors.push(name+': '+e.message);}}
for(const item of ITEM_CATALOG){try{if(!itemIconUrl(item.id))errors.push(item.id+': missing icon');}catch(e){errors.push(item.id+': '+e.message);}}
for(const [family,profile] of Object.entries(WEAPON_PROFILES)){const actor=createActor(false,{foundation:true});equipActor(actor,profile.style,family,'none');errors.push(...validateHumanoidRig(actor).map(e=>family+': '+e));}
const specs=listAnimationSpecs();
for(const spec of specs){if(!spec){errors.push('missing ability spec');continue;}for(const key of ['id','weaponFamily','startingPose','anticipation','tell','release','event','eventAt','hitOrigin','followThrough','recovery','interruption','vfx','audio','fallback'])if(!spec[key])errors.push(spec.id+': missing '+key);}
const report={scope:'Repository inventory and technical contract; not art approval or physical-device testing',assets:manifest,abilitySpecs:specs,errors};
mkdirSync('qa/visual-foundation',{recursive:true});writeFileSync('qa/visual-foundation/asset-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(`${manifest.length} asset files; ${MODEL_NAMES.length} glTF models; ${ITEM_CATALOG.length} item icons; ${specs.length} animation specifications; ${errors.length} errors.`);
for(const error of errors)console.error(error);if(errors.length)process.exitCode=1;
