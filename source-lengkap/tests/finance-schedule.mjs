import assert from 'node:assert/strict';
import {buildPayoutSchedule,referenceDates,scheduledDate,makassarToday,savingsTotal} from '../worker/finance.js';

const dates=['2025-09-05','2025-10-05','2025-11-05','2025-12-05','2026-01-05','2026-02-05','2026-03-05','2026-04-05','2026-05-05','2026-06-05','2026-07-05','2026-08-05'];
assert.deepEqual(referenceDates('2026-09-05'),dates);
const rows=[],reconciliations=[];
function add(effective,amount=10000000,member='A',status='signed',end=null){
 const id='request-'+rows.length,d=new Date(effective+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+365);
 rows.push({id,owner:'test',kind:'capital',status,amount,proof_key:id,member_name:member,contract_number:id,contract_data:JSON.stringify({effectiveDate:effective,endDate:end||d.toISOString().slice(0,10),agreementDate:effective}),member_snapshot:JSON.stringify({id:member,memberNumber:'SKI-2026-'+member,data:{name:member,bankName:'Bank Contoh',bankAccount:member==='A'?'00123456':'00987654'}})});
 reconciliations.push({target_kind:'capital',target_id:id,proof_key:id,expected_amount:amount,status:'approved'});return rows.at(-1);
}
dates.forEach((x,i)=>add(x,10000000,i<6?'A':'B'));
add('2026-09-05');add('2025-08-05');add('2026-08-06');add('2026-08-05',10000000,'A','ready');
const unreconciled=add('2026-08-05');reconciliations.pop();
const expired=add('2026-08-05',10000000,'A','signed','2026-09-04');
const p=buildPayoutSchedule(rows,reconciliations,'2026-09-05');
assert.equal(p.contractCount,12);assert.equal(p.memberCount,2);assert.equal(p.transferCount,2);assert.equal(p.total,6000000);
assert.deepEqual(p.members.map(m=>m.amount),[3000000,3000000]);assert.deepEqual(p.items.map(x=>x.period).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10,11,12]);
assert(!p.items.some(x=>[unreconciled.id,expired.id].includes(x.id)));
assert.equal(scheduledDate('2026-01-30',1),'2026-02-28');assert.equal(scheduledDate('2027-01-30',13),'2028-02-29');
assert.equal(scheduledDate('2026-01-30',2),'2026-03-30');
rows.length=0;reconciliations.length=0;
add('2026-01-30',10050717);add('2026-01-29',10,'B','generated');
const feb=buildPayoutSchedule(rows,reconciliations,'2026-02-28');assert.equal(feb.contractCount,2);assert.equal(feb.total,502537);assert.equal(feb.items.find(x=>x.memberName==='B').amount,1);
rows[0].proof_key='changed';assert.equal(buildPayoutSchedule(rows,reconciliations,'2026-02-28').contractCount,1,'replaced proof invalidates reconciliation');
assert.equal(makassarToday(new Date('2026-09-04T15:59:59Z')),'2026-09-04');assert.equal(makassarToday(new Date('2026-09-04T16:00:00Z')),'2026-09-05');
assert.throws(()=>referenceDates('2026-02-30'));
assert.equal(savingsTotal({basic:100000,monthly:10000,paymentOption:'Tahunan',transactionSaving:50000,admin:30000,special:'Ya',specialAmount:100001,specialPayment:'Angsur',installments:3}),333334);
assert.equal(buildPayoutSchedule([],[],'2026-09-05').total,0);
console.log('PASS: exact 12-month example, 5% totals per member/account, first/last payment, expiry, missing reconciliation, integer rounding, short months and Makassar date boundary.');
