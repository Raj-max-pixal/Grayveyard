type VercelRequest={method?:string;query:Record<string,string|string[]|undefined>};
type VercelResponse={status:(code:number)=>VercelResponse;json:(body:unknown)=>void;setHeader:(name:string,value:string)=>void};
const repoUrl=/^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/;
const cache=new Map<string,{expires:number;body:unknown}>();
const cacheMs=Math.max(60_000,Number(process.env.GITHUB_CACHE_TTL_MS||900_000));
function fail(res:VercelResponse,status:number,message:string){res.status(status).json({error:message})}
export default async function handler(req:VercelRequest,res:VercelResponse){
 if(req.method!=='GET')return fail(res,405,'Method not allowed');
 const raw=Array.isArray(req.query.url)?req.query.url[0]:req.query.url;
 if(!raw||raw.length>240)return fail(res,400,'A valid public GitHub repository URL is required.');
 const match=repoUrl.exec(raw.trim());
 if(!match)return fail(res,400,'Only canonical public GitHub repository URLs are supported.');
 const owner=match[1],repository=match[2].replace(/\.git$/,'');const key=`${owner}/${repository}`.toLowerCase();
 const hit=cache.get(key);if(hit&&hit.expires>Date.now()){res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');return res.status(200).json({...hit.body,cached:true})}
 const headers:Record<string,string>={'Accept':'application/vnd.github+json','User-Agent':'project-graveyard-metadata'};
 if(process.env.GITHUB_TOKEN)headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
 try{const response=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,{headers,signal:AbortSignal.timeout(7000)});if(response.status===404)return fail(res,404,'Repository not found or not publicly accessible.');if(response.status===403||response.status===429)return fail(res,429,'GitHub metadata is temporarily rate limited. Please retry later.');if(!response.ok)return fail(res,502,'GitHub metadata is unavailable right now.');const repo=await response.json() as Record<string,unknown>;const body={metadata:{name:repo.name,description:repo.description,owner:typeof repo.owner==='object'&&repo.owner?((repo.owner as Record<string,unknown>).login??null):null,primaryLanguage:repo.language??null,topics:Array.isArray(repo.topics)?repo.topics:[],stars:repo.stargazers_count??null,forks:repo.forks_count??null,openIssues:repo.open_issues_count??null,license:typeof repo.license==='object'&&repo.license?((repo.license as Record<string,unknown>).spdx_id??null):null,archived:repo.archived===true,createdAt:repo.created_at??null,lastPushAt:repo.pushed_at??null,defaultBranch:repo.default_branch??null,url:repo.html_url??`https://github.com/${owner}/${repository}`},checkedAt:new Date().toISOString(),cached:false};cache.set(key,{expires:Date.now()+cacheMs,body});res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');return res.status(200).json(body)}catch{return fail(res,504,'GitHub metadata request timed out. Please retry later.')}
}
