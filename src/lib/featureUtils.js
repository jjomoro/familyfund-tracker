import { calculateFundBalance, getMemberMonthlyPaid, getContributionStatus, getMemberById, monthNames } from './fundUtils';

export function getCurrentPeriod() { const d = new Date(); return { month:d.getMonth()+1, year:d.getFullYear() }; }
export function getFundBreakdown(contributions, withdrawals) {
  const totalContributions = contributions.reduce((s,x)=>s+Number(x.amount||0),0);
  const approvedWithdrawals = withdrawals.filter(x=>x.status==='approved').reduce((s,x)=>s+Number(x.amount||0),0);
  const pendingWithdrawals = withdrawals.filter(x=>x.status==='pending').reduce((s,x)=>s+Number(x.amount||0),0);
  return { totalContributions, approvedWithdrawals, pendingWithdrawals, balance: totalContributions-approvedWithdrawals };
}
export function getMonthlyHealth(members, contributions, period=getCurrentPeriod()) {
  const active = members.filter(m=>m.role==='member');
  const expected = active.reduce((s,m)=>s+Number(m.monthly_target||0),0);
  const rows = active.map(member=>{const paid=getMemberMonthlyPaid(contributions,member.id,period.month,period.year);return {member,paid,target:Number(member.monthly_target||0),owed:Math.max(Number(member.monthly_target||0)-paid,0),status:getContributionStatus(member.monthly_target,paid)}});
  const collected=rows.reduce((s,r)=>s+r.paid,0);
  return {expected,collected,outstanding:Math.max(expected-collected,0),percent:expected?Math.min(100,(collected/expected)*100):100,rows};
}
export function getAttentionItems(members, contributions, withdrawals) {
  const health=getMonthlyHealth(members,contributions);
  const pending=withdrawals.filter(w=>w.status==='pending');
  const items=[];
  if(health.outstanding>0) items.push({key:'dues',type:'warning',title:`${health.rows.filter(r=>r.owed>0).length} member${health.rows.filter(r=>r.owed>0).length===1?'':'s'} with outstanding dues`,detail:`${health.outstanding.toLocaleString()} still due this month`});
  if(pending.length) items.push({key:'withdrawals',type:'danger',title:`${pending.length} withdrawal request${pending.length===1?'':'s'} awaiting approval`,detail:`${pending.reduce((s,w)=>s+Number(w.amount||0),0).toLocaleString()} pending`});
  if(!items.length) items.push({key:'clear',type:'success',title:'Nothing needs attention',detail:'Current contributions and withdrawal requests are up to date.'});
  return items;
}
export function memberStreak(member, contributions) {
  let streak=0; const d=new Date();
  while(streak<60){const month=d.getMonth()+1,year=d.getFullYear();const paid=getMemberMonthlyPaid(contributions,member.id,month,year);if(getContributionStatus(member.monthly_target,paid)!=='paid')break;streak++;d.setMonth(d.getMonth()-1);}
  return streak;
}
export function contributionRecord(members,contributions) {
 return members.filter(m=>m.role==='member').map(member=>{let paidMonths=0,totalMonths=0; const start=new Date();start.setMonth(start.getMonth()-11); for(let i=0;i<12;i++){const d=new Date(start.getFullYear(),start.getMonth()+i,1);totalMonths++;const paid=getMemberMonthlyPaid(contributions,member.id,d.getMonth()+1,d.getFullYear());if(getContributionStatus(member.monthly_target,paid)==='paid')paidMonths++;}return {...member,paidMonths,totalMonths};});
}
export function reminderText(member, currency, outstanding) { return `Hi ${member.name}, this is a reminder for the family emergency fund. The current outstanding contribution is ${currency} ${Number(outstanding||0).toLocaleString()}. Please send it when convenient. Thank you.`; }
export function monthlyLabel(month,year){return `${monthNames[month-1]} ${year}`;}
export function filterRows(rows,query){const q=query.trim().toLowerCase(); if(!q)return rows;return rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(q));}
export function getMonthOptions(startDate){const start=new Date(`${startDate}T00:00:00`);const now=new Date();const out=[];const d=new Date(start.getFullYear(),start.getMonth(),1);while(d<=now){out.push({month:d.getMonth()+1,year:d.getFullYear(),label:monthlyLabel(d.getMonth()+1,d.getFullYear())});d.setMonth(d.getMonth()+1);}return out.reverse();}
