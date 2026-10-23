/** Explicit development playtest only. Never persist candidate selection in saves. */
export function visualPreviewEnabled({hostname='',pathname='/',search=''}={}){
 if(/^\/oakrest(?:\/|$)/.test(pathname))return false;
 const development=['localhost','127.0.0.1'].includes(hostname)||/^\/oakrest-dev(?:\/|$)/.test(pathname);
 const query=new URLSearchParams(search);
 return development&&query.get('qa')==='1'&&query.get('visual-foundation')==='1';
}
