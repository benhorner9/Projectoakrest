/** Prepare the exact free CC0 GLB character assets; never fetch during gameplay.
 * Verify original source size and Git blob SHA-1, not just HTTP status.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {CHARACTER_ART} from '../src/character-asset-catalog.js';

const root='assets/kaykit-character-art';
export function gitBlobHash(bytes){
 const h=createHash('sha1');
 h.update('blob '+bytes.length+'\0');h.update(bytes);
 return h.digest('hex');
}
export async function prepareCharacterArt(){
 await mkdir(root,{recursive:true});
 // Deliberately sequential: keep peak memory and GitHub CDN demand bounded.
 for(const [key,item] of Object.entries(CHARACTER_ART)){
  const target=join(root,item.file);
  let bytes;
  try{bytes=await readFile(target);}catch{}
  if(bytes?.length===item.size&&gitBlobHash(bytes)===item.blob)continue;
  const url='https://raw.githubusercontent.com/'+item.repo+'/'+item.commit+'/'+item.path;
  const res=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(!res.ok)throw new Error('KayKit '+key+' source HTTP '+res.status);
  const length=Number(res.headers.get('content-length')||0);
  if(length&&length!==item.size)throw new Error('KayKit '+key+' incorrect content length');
  bytes=Buffer.from(await res.arrayBuffer());
  if(bytes.length!==item.size||gitBlobHash(bytes)!==item.blob)
   throw new Error('KayKit '+key+' source integrity mismatch');
  await writeFile(target,bytes);
  console.log('Verified CC0 character '+key+' ('+Math.round(bytes.length/1024)+' KiB)');
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)
 await prepareCharacterArt();
