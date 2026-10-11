import {Activity,AlertTriangle,ArrowRight,CalendarPlus,Download,ShieldCheck,Sparkles} from 'lucide-react';
import type {PlannerItem,Project} from './data';
import './rescue.css';

type Signal={score:number;label:string;detail:string;next:string;urgent:boolean};

function daysSince(value:string){const then=new Date(value).getTime();return Number.isFinite(then)?Math.floor((Date.now()-then)/86400000):0}
export function projectSignal(project:Project):Signal{
 const total=project.tasks.length;const complete=project.tasks.filter(task=>task.completed).length;
 let score=48;
 if(project.status==='Reviving')score+=18;
 if(project.status==='Planning Revival')score+=10;
 if(project.status==='Revived')score+=30;
 if(project.status==='Archived')score-=18;
 score+=Math.min(18,complete*6);
 if(total===0)score-=10;
 if(project.unfinishedFeatures.length>4)score-=7;
 const deadline=project.deadline?new Date(project.deadline).getTime():0;
 const overdue=deadline&&deadline<Date.now();
 if(overdue)score-=15;
 if(daysSince(project.lastWorkedOn)>120)score-=10;
 score=Math.max(8,Math.min(100,score));
 const label=score>=75?'Strong pulse':score>=52?'Recoverable':score>=30?'Needs a rescue':'Critical pause';
 const next=overdue?'Reset the deadline before adding more scope.':total===0?'Create one tiny proof-of-progress task.':complete===0?'Finish the smallest open task to restart momentum.':project.unfinishedFeatures[0]?`Make “${project.unfinishedFeatures[0]}” the next focused move.`:'Run a 15-minute review and choose the next outcome.';
 return {score,label,detail:overdue?'Its deadline has passed.':daysSince(project.lastWorkedOn)>120?'It has been quiet for more than four months.':`${complete} of ${total} tracked tasks are complete.`,next,urgent:Boolean(overdue||score<35)};
}
function percent(value:number,total:number){return total?Math.round(value/total*100):0}

export default function RescueStudio({projects,planner,onOpen,onBuildSprint}:{projects:Project[];planner:PlannerItem[];onOpen:(id:string)=>void;onBuildSprint:(id:string)=>void}){
 const signals=projects.filter(p=>p.status!=='Archived').map(project=>({project,signal:projectSignal(project)})).sort((a,b)=>a.signal.score-b.signal.score);
 const tasks=projects.flatMap(p=>p.tasks);const done=tasks.filter(t=>t.completed).length;const deadlines=planner.filter(item=>!item.done).length+projects.filter(p=>p.deadline).length;
 const rescued=projects.filter(p=>p.status==='Revived').length;
 const average=signals.length?Math.round(signals.reduce((sum,item)=>sum+item.signal.score,0)/signals.length):0;
 function exportBrief(){const text=['PROJECT GRAVEYARD — REVIVAL BRIEF',`Generated ${new Date().toLocaleDateString()}`,`Vault pulse: ${average}/100`, '',...signals.map(({project,signal})=>`${project.name} — ${signal.score}/100 (${signal.label})\nNext move: ${signal.next}`)].join('\n');const blob=new Blob([text],{type:'text/plain'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='project-graveyard-revival-brief.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <section className="rescue-studio"><div className="rescue-hero"><div><span className="eyebrow">RESCUE STUDIO</span><h2>Turn abandoned work into your next proof point.</h2><p>A transparent, rule-based scan reads your actual tasks, dates, project state, and dormant work — then gives each project one focused way back in.</p></div><button className="secondary rescue-export" onClick={exportBrief}><Download size={16}/> Download revival brief</button></div>
 <div className="rescue-pulse"><div className="pulse-score"><Activity size={20}/><div><small>VAULT MOMENTUM</small><strong>{average}<span>/100</span></strong></div></div><div><small>REAL TASK COMPLETION</small><strong>{percent(done,tasks.length)}%</strong><span>{done} of {tasks.length||0} tasks</span></div><div><small>DATES PROTECTED</small><strong>{deadlines}</strong><span>deadlines and plans</span></div><div><small>SECOND CHANCES</small><strong>{rescued}</strong><span>projects revived</span></div></div>
 {!signals.length?<div className="empty"><div className="empty-orb">✦</div><h3>Your first rescue starts with one idea.</h3><p>Add a project, then this studio will turn its current state into a practical comeback plan.</p></div>:<div className="rescue-list">{signals.map(({project,signal})=><article className="rescue-card" key={project.id}><div className="rescue-score" style={{'--score':`${signal.score}%`} as React.CSSProperties}><span>{signal.score}</span><small>/100</small></div><div className="rescue-copy"><div className="rescue-name"><span className={signal.urgent?'risk':'safe'}>{signal.urgent?<AlertTriangle size={14}/>:<ShieldCheck size={14}/>} {signal.label}</span><h3>{project.name}</h3></div><p>{signal.detail}</p><div className="rescue-next"><Sparkles size={15}/><span><b>Next move:</b> {signal.next}</span></div></div><div className="rescue-actions"><button className="secondary" onClick={()=>onOpen(project.id)}>Open project <ArrowRight size={14}/></button><button className="primary" onClick={()=>onBuildSprint(project.id)}><CalendarPlus size={15}/> Build 3-day sprint</button></div></article>)}</div>}
 <aside className="rescue-method"><strong>Why this is trustworthy</strong><p>No invented AI score: the pulse is calculated from your saved project state, tracked tasks, unfinished scope, recent activity, and deadlines. Every action it creates stays editable in your private Firebase workspace.</p></aside></section>
}
