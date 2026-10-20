import {readdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';
for(const name of readdirSync('src').filter(n=>n.endsWith('.js')))execFileSync(process.execPath,['--check','src/'+name],{stdio:'inherit'});
console.log('All source modules parse.');
