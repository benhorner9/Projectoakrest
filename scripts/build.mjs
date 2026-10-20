import {cpSync,mkdirSync,rmSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist');
for(const path of ['index.html','src','vendor'])cpSync(path,'dist/'+path,{recursive:true});
console.log('Static Oakrest build: dist/ (engine included, no runtime CDN).');
