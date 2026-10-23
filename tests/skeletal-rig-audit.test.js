import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeRigDocument,auditSkeletalRig,compareAnimationRig} from '../src/skeletal-rig-audit.js';
const humanoidBones=['Hips','Spine','Head','LeftUpperArm','RightUpperArm','LeftUpLeg','RightUpLeg'];
function document(names=humanoidBones){
 return {asset:{version:'2.0'},nodes:[...names.map(name=>({name})),{mesh:0,skin:0,name:'Body'}],
  skins:[{joints:names.map((_,i)=>i)}],meshes:[{primitives:[{attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2}}]}],
  animations:[{name:'Idle',channels:[{target:{node:0,path:'rotation'}}]}]};
}
function binary(doc){
 const text=JSON.stringify(doc),raw=new TextEncoder().encode(text);
 const len=Math.ceil(raw.length/4)*4,bytes=new Uint8Array(20+len),view=new DataView(bytes.buffer);
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.length,true);
 view.setUint32(12,len,true);view.setUint32(16,0x4e4f534a,true);
 bytes.fill(32,20);bytes.set(raw,20);return bytes;
}
test('verifies a real glTF skin contract, joint names and animation targets',()=>{
 const inspected=auditSkeletalRig(binary(document()));
 assert.equal(inspected.valid,true);assert.equal(inspected.skinnedPrimitives,1);
 assert.equal(inspected.skinCount,1);assert.deepEqual(inspected.missingBodyParts,[]);
 assert.equal(inspected.clips[0].rotationTracks,1);
});
test('rejects non-skinned meshes and malformed GLB containers',()=>{
 const unrigged={asset:{version:'2.0'},nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}]};
 assert.equal(auditSkeletalRig(unrigged).valid,false);
 const bad=binary(document());bad[0]=0;
 assert.throws(()=>decodeRigDocument(bad),/Not a GLB/);
 assert.throws(()=>decodeRigDocument(new Uint8Array(2)),/Truncated/);
});
test('compares names without claiming clips are gameplay ready',()=>{
 const exact=compareAnimationRig(document(),document());
 assert.equal(exact.exactNameMatch,true);assert.equal(exact.readyForGameplay,false);
 const other=document(['Pelvis','Spine','Head','LeftUpperArm','RightUpperArm','LeftUpLeg','RightUpLeg']);
 const mismatch=compareAnimationRig(document(),other);
 assert.equal(mismatch.exactNameMatch,false);
 assert.equal(mismatch.retargetingRequired,true);
 assert.deepEqual(mismatch.unmatchedSourceBones,['pelvis']);
});
test('unweighted skin primitives fail safely',()=>{
 const faulty=document();delete faulty.meshes[0].primitives[0].attributes.WEIGHTS_0;
 assert.equal(auditSkeletalRig(faulty).valid,false);
});
