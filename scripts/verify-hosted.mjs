import {verifyDevelopmentRelease} from './development-release.mjs';
const result=await verifyDevelopmentRelease({commit:process.env.OAKREST_COMMIT});
console.log('Verified '+result.files+' hosted development files for '+result.commit+' / '+result.assetVersion);
