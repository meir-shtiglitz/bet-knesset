const {calculateWinnerScore}=require('../admin');
const day=date=>new Date(date).toISOString().slice(0,10);
function complete(predictions,parties) {
    const ids=new Set(parties.map(p=>String(p._id)));
    return ids.size>0 && predictions.length===ids.size && new Set(predictions.map(p=>String(p.partyId))).size===ids.size &&
        predictions.every(p=>ids.has(String(p.partyId))&&Number.isInteger(p.predictedSeats)&&p.predictedSeats>=0&&p.predictedSeats<=120)&&
        predictions.reduce((sum,p)=>sum+p.predictedSeats,0)===120;
}
function competition(polls,parties,result,date='latest') {
    const sorted=polls.filter(p=>complete(p.predictions,parties)).sort((a,b)=>new Date(b.pollDate)-new Date(a.pollDate)||String(b._id).localeCompare(String(a._id)));
    const dates=[...new Set(sorted.map(p=>day(p.pollDate)))];
    const seen=new Set();
    const selected=sorted.filter(p=>{
        if(date!=='latest')return day(p.pollDate)===date;
        const key=p.pollsterName.trim().toLocaleLowerCase('he');
        if(seen.has(key))return false;seen.add(key);return true;
    });
    const averages=parties.map(p=>({partyId:p._id,avg:selected.length?selected.reduce((sum,poll)=>sum+(poll.predictions.find(r=>String(r.partyId)===String(p._id))?.predictedSeats||0),0)/selected.length:0}));
    const actual=result?.results?.map(r=>({partyId:r.partyId,predictedSeats:r.actualSeats}));
    const hasResults=!!actual&&complete(actual,parties)&&!!result.publishedAt&&Number.isFinite(new Date(result.publishedAt).getTime());
    const ranking=hasResults?selected.map(p=>({pollId:p._id,pollsterName:p.pollsterName,pollDate:p.pollDate,color:p.color,
        score:calculateWinnerScore(p.predictions,result.results,p.pollDate,result.publishedAt)})).sort((a,b)=>b.score-a.score||String(a.pollId).localeCompare(String(b.pollId))):[];
    return {dates,polls:selected,averages,result:hasResults?{results:result.results,publishedAt:result.publishedAt}:null,ranking};
}
module.exports={complete,competition};
