import {Problem,stmt} from './membership.js';
import {requireStaffRole,makassarToday,calendarDate,syncDuePayoutTasks} from './finance.js';
import {activityState,summarize} from './activity.js';

export function reportWindow(from,to,now=new Date()){
 const latest=makassarToday(now),d=calendarDate(latest);d.setUTCDate(d.getUTCDate()-7);const earliest=d.toISOString().slice(0,10);
 from=from||latest;to=to||latest;calendarDate(from);calendarDate(to);
 if(from<earliest||to>latest||from>to)throw new Problem(400,'Pilih rentang antara hari ini dan tujuh hari sebelumnya.');
 return {from,to,earliest,latest};
}
export function inReportWindow(task,range){
 const dates=[task.receivedAt,task.startedAt,task.completedAt,task.closedAt].filter(Boolean).map(t=>makassarToday(new Date(t)));
 if(dates.some(d=>d>=range.from&&d<=range.to))return true;
 // Include work that was already running during the selected dates.
 const end=task.completedAt||task.closedAt;
 return !!task.startedAt&&makassarToday(new Date(task.startedAt))<=range.to&&(!end||makassarToday(new Date(end))>=range.from);
}
export function reportSummary(tasks,range){
 const inside=value=>value&&makassarToday(new Date(value))>=range.from&&makassarToday(new Date(value))<=range.to;
 const scoped=tasks.map(t=>({...t,completedAt:inside(t.completedAt)?t.completedAt:null,responseSeconds:inside(t.startedAt)?t.responseSeconds:null,processingSeconds:inside(t.completedAt)?t.processingSeconds:null}));
 const summary=summarize(scoped),current=summarize(tasks);
 return {...summary,queued:current.queued,working:current.working};
}
export async function managerActivity(env,owner,params){
 await requireStaffRole(env,owner,'manager');
 const range=reportWindow(params.get('from'),params.get('to'));
 const owners=(await stmt(env,'SELECT owner FROM member_profiles').all()).results;
 for(const row of owners)await syncDuePayoutTasks(env,row.owner);
 const all=await activityState(env,null),tasks=all.tasks.filter(t=>inReportWindow(t,range));
 return {tasks,range,summary:reportSummary(tasks,range),serverTime:new Date().toISOString(),timeZone:'Asia/Makassar',concept:false};
}
