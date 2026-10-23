/** Usage: node scripts/audit-skeletal-assets.mjs character.glb [sample.glb] */
import {readFileSync} from 'node:fs';
import {auditSkeletalRig,compareAnimationRig} from '../src/skeletal-rig-audit.js';
const files=process.argv.slice(2);
if(files.length<1||files.length>2){console.error('Usage: node scripts/audit-skeletal-assets.mjs character.glb [animation-sample.glb]');process.exitCode=2;}
else{
 try{
  const docs=files.map(p=>readFileSync(p));
  const result=files.length===2?compareAnimationRig(...docs):auditSkeletalRig(docs[0]);
  console.log(JSON.stringify(result,(key,value)=>key==='document'||key==='targets'?undefined:value,2));
  if(!result.character?.valid&&files.length===2||!result.valid&&files.length===1)process.exitCode=1;
 }catch(error){console.error('Skeletal asset audit failed:',error.message);process.exitCode=1;}
}
