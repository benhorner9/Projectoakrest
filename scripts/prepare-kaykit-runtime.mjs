/** Make local copies of Three.js r180's glTF loader utilities and KayKit
 * FREE character files. The webpage never contacts a third-party asset host.
 */
import {mkdirSync,copyFileSync} from 'node:fs';
import {prepareCharacterArt} from './fetch-kaykit-character-assets.mjs';
for(const [source,destination] of [
 ['node_modules/three/examples/jsm/loaders/GLTFLoader.js','vendor/examples/jsm/loaders/GLTFLoader.js'],
 ['node_modules/three/examples/jsm/utils/BufferGeometryUtils.js','vendor/examples/jsm/utils/BufferGeometryUtils.js']
]){
 mkdirSync(destination.substring(0,destination.lastIndexOf('/')),{recursive:true});
 copyFileSync(source,destination);
}
await prepareCharacterArt();
