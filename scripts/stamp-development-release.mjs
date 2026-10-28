import {execFileSync} from 'node:child_process';
import {stampDevelopmentRelease} from './development-release.mjs';
const meta=stampDevelopmentRelease({commit:process.env.OAKREST_COMMIT,
 actualCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()});
console.log('Stamped Classic development release '+meta.commit+' / '+meta.assetVersion);
