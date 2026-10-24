/** Small, sprite-based and texture-cached Classic quest beacon (Safari friendly).
 * The marker is independent of camera yaw, inventory windows and NPC animation.
 */
import * as THREE from 'three';
import {questGiverStatus} from './classic-quest-indicators.js';

const textures=new Map();
function textureFor(status){
 if(textures.has(status))return textures.get(status);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const c=canvas.getContext('2d');
 const colour=status==='ready'?'#9beed5':'#ffe59c';
 const glow=c.createRadialGradient(64,64,6,64,64,62);
 glow.addColorStop(0,status==='ready'?'rgba(125,249,213,.85)':'rgba(255,221,125,.85)');
 glow.addColorStop(.27,status==='ready'?'rgba(67,214,178,.48)':'rgba(246,182,69,.48)');
 glow.addColorStop(1,'rgba(255,210,120,0)');
 c.fillStyle=glow;c.fillRect(0,0,128,128);
 c.fillStyle='#253c33';c.strokeStyle=colour;c.lineWidth=4;
 c.beginPath();c.arc(64,64,33,0,Math.PI*2);c.fill();c.stroke();
 c.font='bold 56px Georgia,serif';c.textAlign='center';c.textBaseline='middle';
 c.fillStyle=colour;c.shadowColor=colour;c.shadowBlur=12;
 c.fillText(status==='ready'?'✓':'!',64,62);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
 textures.set(status,texture);return texture;
}
export function createClassicQuestBeacon(scene,x,z,targetId){
 const material=new THREE.SpriteMaterial({transparent:true,depthWrite:false,depthTest:false,opacity:.94});
 const sprite=new THREE.Sprite(material);sprite.position.set(x,4.72,z);sprite.scale.set(2.05,2.05,1);
 sprite.renderOrder=9;sprite.visible=false;scene.add(sprite);
 let displayed=null;
 return {sprite,targetId,update(adventure,time=0){
  const status=questGiverStatus(adventure,targetId);
  sprite.visible=!!status;
  if(!status)return;
  if(status!==displayed){material.map=textureFor(status);material.needsUpdate=true;displayed=status;}
  const phase=time*2.35+x*.03+z*.02;
  sprite.position.y=4.72+.17*Math.sin(phase);
  sprite.scale.setScalar(1.03+.045*Math.sin(phase));
  sprite.scale.set(2.05*(1+.045*Math.sin(phase)),2.05*(1+.045*Math.sin(phase)),1);
  material.opacity=.89+.09*Math.sin(phase);
 }};
}
