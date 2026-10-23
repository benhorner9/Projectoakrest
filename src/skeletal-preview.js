/** Independent, nonpersistent skeletal-migration test flag.
 * /oakrest/ is never eligible, even with forged qa query parameters.
 */
export function skeletalPreviewEnabled({hostname='',pathname='/',search=''}={}){
 if(/^\/oakrest(?:\/|$)/.test(pathname))return false;
 const dev=['localhost','127.0.0.1'].includes(hostname)||/^\/oakrest-dev(?:\/|$)/.test(pathname);
 const flags=new URLSearchParams(search);
 return dev&&flags.get('qa')==='1'&&flags.get('skeletal')==='1';
}
