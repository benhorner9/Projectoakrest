/** Build-time fetch from Quaternius's own public 2019 Ultimate RPG Pack folder.
 * This is the REAL pack, not an unrelated modular-weapons substitution.
 * Fail closed on errors; no online downloads occur in the player's browser.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {RPG_SOURCE} from '../src/quaternius-rpg-catalog.js';
const dir='assets/quaternius/rpg';
function valid(bytes,kind,expected){
 if(bytes.length!==expected)return false;
 if(kind==='png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const text=bytes.toString('utf8');
 if(kind==='obj')return text.includes('\nv ')&&(/(?:^|\n)f /.test(text)||/(?:^|\n)l /.test(text));
 return /newmtl |Kd |Ka /.test(text);
}
async function acquire(file,id,size,kind){
 let bytes;
 try{bytes=await readFile(dir+'/'+file);}catch{}
 if(bytes&&valid(bytes,kind,size))return bytes;
 const urls=[
  'https://drive.usercontent.google.com/download?id='+encodeURIComponent(id)+'&export=download&confirm=t',
  'https://drive.google.com/uc?export=download&id='+encodeURIComponent(id)
 ];
 let err;
 for(const url of urls){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(35000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   bytes=Buffer.from(await response.arrayBuffer());
   if(!valid(bytes,kind,size))throw Error('Model differs from officially listed bytes ('+bytes.length+'/'+size+')');
   await writeFile(dir+'/'+file,bytes);
   console.log('Verified original Ultimate RPG Pack',file,bytes.length,'bytes',
    createHash('sha256').update(bytes).digest('hex').slice(0,16));
   return bytes;
  }catch(e){err=e;}
 }
 throw Error('Cannot obtain official Quaternius Ultimate RPG '+file+': '+err?.message);
}
export async function prepareRpg(){
 await mkdir(dir,{recursive:true});
 for(const {name,obj,mtl,icon,bytes} of RPG_SOURCE){
  await acquire(name+'.obj',obj,bytes[0],'obj');
  await acquire(name+'.mtl',mtl,bytes[1],'mtl');
  await acquire(name+'.png',icon,bytes[2],'png');
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)await prepareRpg();
