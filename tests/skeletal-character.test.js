import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSkinnedOakrestHero,buildOakrestClips,makeRigWeapon} from '../src/skeletal-character.js';
test('skinned humanoid has a single weighted mesh and a full connected humanoid skeleton',()=>{
 const hero=createSkinnedOakrestHero();
 assert.equal(hero.mesh.isSkinnedMesh,true);
 assert.ok(hero.skeleton.bones.length>=26);
 for(const part of ['Hips','Spine','Chest','Neck','Head','LeftUpperArm','RightUpperArm','LeftLowerArm','RightLowerArm','LeftHand','RightHand','LeftUpperLeg','RightUpperLeg','LeftLowerLeg','RightLowerLeg','LeftFoot','RightFoot'])
  assert.ok(hero.bones.get(part)?.isBone,part);
 assert.equal(hero.mesh.geometry.getAttribute('skinIndex').count,hero.mesh.geometry.getAttribute('position').count);
 const w=hero.mesh.geometry.getAttribute('skinWeight'),i=hero.mesh.geometry.getAttribute('skinIndex');
 for(let n=0;n<w.count;n++){const total=w.getX(n)+w.getY(n)+w.getZ(n)+w.getW(n);
  assert.ok(Math.abs(total-1)<.00001,'every vertex weight normalizes');
  assert.ok(i.getX(n)<hero.skeleton.bones.length&&i.getY(n)<hero.skeleton.bones.length);
 }
 hero.dispose();
});
test('the rig uses real THREE.AnimationClip tracks and changes actual bone quaternions',()=>{
 const hero=createSkinnedOakrestHero();const arm=hero.bones.get('RightUpperArm');
 const rootPosition=hero.root.position.clone();hero.play('SwordSlash',0);hero.update(.27);
 assert.ok(arm.quaternion.angleTo(new THREE.Quaternion())>.1);
 assert.deepEqual(hero.root.position.toArray(),rootPosition.toArray(),'clips never move gameplay root');
 for(const name of ['Idle','Walk','Run','StrafeLeft','StrafeRight','Backstep','SwordSlash','GreatswordStrike','DaggerCombo','BowDraw','CrossbowFire','StaffCast','WandCast','Guard','Hit','Dodge','Death','Woodcut'])
  assert.ok(hero.clips.some(c=>c.name===name),name);
 assert.ok(hero.clips.every(c=>c.tracks.every(t=>t.name.endsWith('.quaternion'))),'authored clips animate bones');
 hero.dispose();
});
test('held weapons attach to the right anatomical hand, including bow and offhand dagger',()=>{
 const hero=createSkinnedOakrestHero(),right=hero.bones.get('RightHand'),left=hero.bones.get('LeftHand');
 assert.equal(hero.equipment.parent,right);assert.equal(hero.offhand.parent,left);
 for(const weapon of ['sword','greatsword','dagger','axe','bow','crossbow','staff','wand','none']){
  hero.equip(weapon);assert.equal(hero.equipment.parent,right);assert.equal(hero.offhand.parent,left);
  assert.equal(hero.equipped,weapon);
  assert.equal(hero.equipment.children.length,weapon==='bow'||weapon==='none'?0:1);
  assert.equal(hero.offhand.children.length,['dagger','bow'].includes(weapon)?1:0);
 }
 hero.equip('dagger');hero.update(.1);
 const held=hero.offhand.children[0],start=held.getWorldPosition(new THREE.Vector3());
 hero.bones.get('LeftUpperArm').rotation.x=.6;hero.root.updateMatrixWorld(true);
 const moved=held.getWorldPosition(new THREE.Vector3());
 assert.ok(moved.distanceTo(start)>.01,'offhand blade follows skeletal arm, not a detached visual prop');
 assert.throws(()=>hero.equip('bazooka'),/Unknown equipment/);
 hero.dispose();
});
test('clips are in place, finite and can be crossfaded without NaN values',()=>{
 const hero=createSkinnedOakrestHero();const clips=buildOakrestClips();
 assert.ok(clips.length>=18);
 for(const c of clips){assert.ok(c.duration>0&&Number.isFinite(c.duration),c.name);
  for(const track of c.tracks)for(const n of track.values)assert.ok(Number.isFinite(n),c.name);
 }
 hero.play('Walk');hero.update(.34);hero.play('BowDraw');hero.update(.15);
 hero.root.updateMatrixWorld(true);
 for(const b of hero.skeleton.bones)assert.ok(b.matrixWorld.elements.every(Number.isFinite),b.name);
 hero.dispose();
});
