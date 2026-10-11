import {ArrowRight,CheckCircle2,Compass,GitBranch,Info,ShieldAlert,Sparkles} from 'lucide-react';
import type {Project} from './data';
import './resurrection-engine.css';

type Path='Resurrect'|'Continue'|'Repurpose'|'Archive';
type Evidence={label:string;value:string;source:'Verified project fact'|'Community-submitted information'|'Derived indicator'|'Unknown'};
const pathCopy:Record<Path,{title:string;body:string;next:string;icon:string}>={
 Resurrect:{title:'Restart the original mission',body:'The goal still has a pulse and a focused restart can create a visible proof quickly.',next:'Choose one smallest proof of progress.',icon:'↺'},
 Continue:{title:'Finish what is already underway',body:'Existing work and unfinished features suggest a completion pass may be more useful than a reset.',next:'Turn the remaining work into milestones.',icon:'→'},
 Repurpose:{title:'Give the useful parts a new job',body:'Keep the reusable ideas, reduce the scope, and aim them at a clearer audience or outcome.',next:'Write a one-sentence new promise.',icon:'◇'},
 Archive:{title:'Preserve the story',body:'Sometimes the best outcome is a clean record that helps future you—or another builder—learn from it.',next:'Document the context and keep the source safe.',icon:'□'}
};
function daysSince(value:string){const t=new Date(value).getTime();return Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/86400000)):null}
function evidenceFor(p:Project):Evidence[]{
 const quiet=daysSince(p.lastWorkedOn);
 return [
  {label:'Project state',value:p.status,source:'Verified project fact'},
  {label:'Recorded completion',value:`${p.completionPercentage}%`,source:'Verified project fact'},
  {label:'Remaining scope',value:p.unfinishedFeatures.length?`${p.unfinishedFeatures.length} unfinished feature${p.unfinishedFeatures.length===1?'':'s'}`:'No unfinished features recorded',source:'Verified project fact'},
  {label:'Why it paused',value:p.abandonmentReason||'Not recorded',source:p.abandonmentReason?'Community-submitted information':'Unknown'},
  {label:'Last activity',value:quiet===null?'Not recorded':quiet===0?'Today':`${quiet} day${quiet===1?'':'s'} ago`,source:quiet===null?'Unknown':'Derived indicator'},
  {label:'Repository signal',value:p.repositoryUrl?'Repository link available; inspect it before acting.':'No repository link recorded',source:p.repositoryUrl?'Verified project fact':'Unknown'}
 ];
}
function recommendation(p:Project):{path:Path;confidence:string;reason:string}{
 const quiet=daysSince(p.lastWorkedOn); const remaining=p.unfinishedFeatures.length; const complete=p.completionPercentage;
 if(p.status==='Archived')return {path:'Archive',confidence:'Clear signal',reason:'This project is already marked Archived; preserve it unless new evidence changes the decision.'};
 if(complete>=75||remaining<=1)return {path:'Continue',confidence:'Strong signal',reason:'The recorded work is close to a usable outcome, so finishing the smallest remaining slice is likely the shortest path.'};
 if(quiet!==null&&quiet>180&&complete<35)return {path:'Repurpose',confidence:'Directional signal',reason:'The project has been quiet for a long time and may benefit from a smaller, clearer promise.'};
 return {path:'Resurrect',confidence:'Directional signal',reason:'The project still has recorded scope and a meaningful goal; a focused restart is worth testing.'};
}
export default function ResurrectionEngine({project,onChoose}:{project:Project;onChoose:(path:Path)=>void}){
 const evidence=evidenceFor(project);const rec=recommendation(project);
 return <section className="resurrection-engine panel" aria-labelledby="engine-title"><div className="engine-head"><div><span className="eyebrow">PROJECT RESURRECTION ENGINE</span><h2 id="engine-title">Make the next life intentional.</h2><p>Evidence from this saved project is separated from interpretation, so you can choose the outcome—not an opaque score.</p></div><div className="engine-recommendation"><Sparkles size={17}/><span><small>RECOMMENDED PATH</small><strong>{rec.path} · {rec.confidence}</strong></span></div></div><div className="engine-reason"><Info size={15}/><span>{rec.reason}</span></div><div className="engine-evidence"><div className="engine-section-title"><GitBranch size={15}/><strong>Available evidence</strong><span>Nothing here claims why a project was abandoned.</span></div><div className="evidence-grid">{evidence.map(item=><div className="evidence-item" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small className={item.source==='Unknown'?'unknown':''}>{item.source}</small></div>)}</div></div><div className="engine-section-title path-title"><Compass size={15}/><strong>Choose a project outcome</strong><span>Your decision is saved to the project and remains editable.</span></div><div className="engine-paths">{(Object.keys(pathCopy) as Path[]).map(path=>{const copy=pathCopy[path];const selected=rec.path===path;return <article className={'engine-path '+(selected?'recommended':'')} key={path}><div className="path-icon">{copy.icon}</div><div><div className="path-label"><h3>{path}</h3>{selected&&<span>Recommended</span>}</div><p>{copy.title}</p><small>{copy.body}</small><div className="path-next"><CheckCircle2 size={13}/> {copy.next}</div></div><button className={selected?'primary':'secondary'} onClick={()=>onChoose(path)}>{path==='Archive'?'Preserve':`Choose ${path}`} <ArrowRight size={14}/></button></article>})}</div><div className="engine-foot"><ShieldAlert size={14}/><span>Limits: this assessment uses only recorded project data. GitHub facts appear only after a real repository import; missing evidence stays unknown.</span></div></section>
}
