/** Local-only glTF 2.0 rig/animation inspection, independent of any paid assets.
 * This is not a retargeter or an animation controller. Never mark a clip
 * gameplay-compatible from bone-name matching alone.
 */
const MAGIC=0x46546c67,JSON_CHUNK=0x4e4f534a;
const decoder=new TextDecoder();
export function decodeRigDocument(input){
 if(input&&typeof input==='object'&&!ArrayBuffer.isView(input)&&!(input instanceof ArrayBuffer))return input;
 const data=input instanceof Uint8Array?input:new Uint8Array(input);
 if(data.byteLength<20)throw Error('Truncated GLB');
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
 if(view.getUint32(0,true)!==MAGIC)throw Error('Not a GLB binary');
 if(view.getUint32(4,true)!==2)throw Error('GLB version must be 2');
 if(view.getUint32(8,true)!==data.byteLength)throw Error('GLB length mismatch');
 let offset=12,json=null;
 while(offset<data.byteLength){
  if(offset+8>data.byteLength)throw Error('Truncated GLB chunk header');
  const size=view.getUint32(offset,true),type=view.getUint32(offset+4,true);
  offset+=8;
  if(size%4||offset+size>data.byteLength)throw Error('Invalid GLB chunk size');
  if(type===JSON_CHUNK){
   if(json!==null)throw Error('Multiple JSON chunks');
   json=JSON.parse(decoder.decode(data.subarray(offset,offset+size)).trimEnd());
  }
  offset+=size;
 }
 if(json===null)throw Error('GLB JSON chunk is missing');
 return json;
}
const clean=name=>String(name||'').toLowerCase().replace(/^(mixamorig|armature|bip001|bip01)[:_\s]*/,'').replace(/[^a-z0-9]/g,'');
export function auditSkeletalRig(input){
 const doc=decodeRigDocument(input),nodes=doc.nodes||[],skins=doc.skins||[],meshes=doc.meshes||[];
 const errors=[];
 if(doc.asset?.version!=='2.0')errors.push('Not glTF version 2.0');
 const meshNodes=nodes.map((n,i)=>({n,i})).filter(({n})=>n.skin!==undefined);
 if(!skins.length)errors.push('No glTF skins: this is not a skinned humanoid');
 if(!meshNodes.length)errors.push('No nodes reference a skin');
 let skinnedPrimitives=0;
 for(const {n,i} of meshNodes){
  const skin=skins[n.skin],mesh=meshes[n.mesh];
  if(!skin||!mesh){errors.push('Invalid skin or mesh reference at node '+i);continue;}
  for(const p of mesh.primitives||[]){
   if(p.attributes?.JOINTS_0===undefined||p.attributes?.WEIGHTS_0===undefined)errors.push('Mesh at node '+i+' lacks JOINTS_0/WEIGHTS_0');
   else skinnedPrimitives++;
  }
 }
 if(!skinnedPrimitives)errors.push('No confirmed weighted skinned primitives');
 const bones=new Set(),normalized=new Map();
 for(const skin of skins){
  if(!Array.isArray(skin.joints)||!skin.joints.length){errors.push('A skin has no joints');continue;}
  for(const id of skin.joints){
   if(!Number.isInteger(id)||!nodes[id]){errors.push('Invalid joint index '+id);continue;}
   const name=nodes[id].name||'joint-'+id;bones.add(name);
   if(!normalized.has(clean(name)))normalized.set(clean(name),name);
  }
 }
 const required={hips:/^(hips?|pelvis)$/,head:/^head$/,leftArm:/^(leftupperarm|upperarml|lupperarm|leftarm)$/,rightArm:/^(rightupperarm|upperarmr|rupperarm|rightarm)$/,leftLeg:/^(leftupleg|upperlegl|leftthigh|lthigh)$/,rightLeg:/^(rightupleg|upperlegr|rightthigh|rthigh)$/};
 const missingBodyParts=Object.entries(required).filter(([,pattern])=>![...normalized.keys()].some(k=>pattern.test(k))).map(([key])=>key);
 if(missingBodyParts.length)errors.push('Humanoid mapping needs review: '+missingBodyParts.join(', '));
 const clips=(doc.animations||[]).map((animation,i)=>{
  const targets=(animation.channels||[]).map(channel=>({
   node:channel.target?.node,
   bone:nodes[channel.target?.node]?.name||null,
   path:channel.target?.path||null
  }));
  return {name:animation.name||'clip-'+i,channels:targets.length,rotationTracks:targets.filter(t=>t.path==='rotation').length,targets};
 });
 return {valid:errors.length===0,errors,skinnedPrimitives,skinCount:skins.length,boneNames:[...bones],missingBodyParts,clips,document:doc};
}
export function compareAnimationRig(characterInput,animationInput){
 const character=auditSkeletalRig(characterInput),animation=auditSkeletalRig(animationInput);
 const destination=new Set(character.boneNames.map(clean)),source=new Set(animation.boneNames.map(clean));
 const matched=[...source].filter(n=>destination.has(n)),unmatched=[...source].filter(n=>!destination.has(n));
 const meaningfulSource=[...source].filter(Boolean);
 return {character,animation,exactNameMatch:meaningfulSource.length>0&&unmatched.length===0,
  matchedBoneCount:matched.length,sourceBoneCount:meaningfulSource.length,
  unmatchedSourceBones:unmatched,retargetingRequired:unmatched.length>0,
  readyForGameplay:false,
  note:'Structural inspection only: coordinate systems, bind poses, motion timing, weapon sockets and appearance require visual retarget evaluation.'};
}
