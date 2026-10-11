import {useEffect} from 'react';
import {getEntries} from './Planner';
import type {PlannerItem,Project} from './data';

export default function Reminders({userId,projects,items,onDue}:{userId:string;projects:Project[];items:PlannerItem[];onDue:(message:string)=>void}){
 useEffect(()=>{function check(){const now=Date.now();for(const entry of getEntries(projects,items)){if(entry.done||!entry.reminderAt)continue;const alarm=new Date(entry.reminderAt).getTime(),end=new Date(entry.startsAt).getTime();if(!Number.isFinite(alarm)||alarm>now||end<now-3600000)continue;const id=`pg-alert:${userId}:${entry.id}:${entry.reminderAt}`;if(localStorage.getItem(id))continue;localStorage.setItem(id,'1');const message=`${entry.kind==='exam'?'Exam':entry.kind==='project'?'Project deadline':'Reminder'}: ${entry.title}`;onDue(message);if('Notification' in window&&Notification.permission==='granted'){try{new Notification('Project Graveyard',{body:message,tag:id})}catch{/* The in-app reminder still appears. */}}}}
 check();const interval=window.setInterval(check,30000);window.addEventListener('focus',check);return()=>{window.clearInterval(interval);window.removeEventListener('focus',check)}},[userId,projects,items,onDue]);return null
}
