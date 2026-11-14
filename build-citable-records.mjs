import { mkdir, writeFile } from "node:fs/promises";
const investigations = [
  { id:"Z9-ISB-T2M-001", title:"Long-term air temperature trend — Islamabad", place:"Islamabad, Pakistan", variable:"T2M", latitude:33.6844, longitude:73.0479, start:"2000", end:"2025", unit:"°C", label:"Temperature at 2 Meters" },
  { id:"Z9-LHE-PR-002", title:"Corrected precipitation trend — Lahore", place:"Lahore, Pakistan", variable:"PRECTOTCORR", latitude:31.5204, longitude:74.3587, start:"2000", end:"2025", unit:"mm/day", label:"Precipitation Corrected" },
  { id:"Z9-KHI-TMAX-003", title:"Daily maximum temperature trend — Karachi", place:"Karachi, Pakistan", variable:"T2M_MAX", latitude:24.8607, longitude:67.0011, start:"1990", end:"2025", unit:"°C", label:"Maximum Temperature at 2 Meters" },
  { id:"Z9-MTH-PR-004", title:"Precipitation trend near Mithi — Tharparkar", place:"Mithi, Sindh, Pakistan", variable:"PRECTOTCORR", latitude:24.7372, longitude:69.7971, start:"1990", end:"2025", unit:"mm/day", label:"Precipitation Corrected" },
];
function median(a){const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function erf(x){const sign=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return sign*y}
function seasonalMK(series){
 let S=0,variance=0;const slopes=[];
 for(let month=1;month<=12;month++){
  const v=series.filter(p=>p.month===month).sort((a,b)=>a.year-b.year),n=v.length,counts=new Map();
  for(const p of v)counts.set(p.value,(counts.get(p.value)||0)+1);
  let ties=0;for(const c of counts.values())ties+=c*(c-1)*(2*c+5);
  variance+=(n*(n-1)*(2*n+5)-ties)/18;
  for(let i=0;i<n-1;i++)for(let j=i+1;j<n;j++){S+=Math.sign(v[j].value-v[i].value);slopes.push((v[j].value-v[i].value)/(v[j].year-v[i].year))}
 }
 const z=variance===0?0:S>0?(S-1)/Math.sqrt(variance):S<0?(S+1)/Math.sqrt(variance):0;
 return {S,variance,z,p:Math.max(0,Math.min(1,1-erf(Math.abs(z)/Math.SQRT2))),senSlopePerYear:median(slopes),senSlopePerDecade:median(slopes)*10,pairwiseSlopes:slopes.length};
}
const results=[];
for(const item of investigations){
 const endpoint=new URL("https://power.larc.nasa.gov/api/temporal/monthly/point");
 endpoint.search=new URLSearchParams({parameters:item.variable,community:"RE",longitude:String(item.longitude),latitude:String(item.latitude),start:item.start,end:item.end,format:"JSON"}).toString();
 const response=await fetch(endpoint,{headers:{"User-Agent":"Z9-EarthScope/1.0 research-archive"}});
 if(!response.ok)throw new Error("NASA POWER request failed for "+item.id+": HTTP "+response.status);
 const payload=await response.json(),raw=payload?.properties?.parameter?.[item.variable];
 if(!raw)throw new Error("NASA POWER returned no "+item.variable+" for "+item.id);
 const series=Object.entries(raw).filter(([k,v])=>/^\d{6}$/.test(k)&&!k.endsWith("13")&&Number.isFinite(v)&&v!==-999).map(([k,v])=>({year:Number(k.slice(0,4)),month:Number(k.slice(4,6)),value:Number(v)})).sort((a,b)=>a.year-b.year||a.month-b.month);
 const years=[...new Set(series.map(p=>p.year))],counts=new Map();for(const p of series)counts.set(p.year,(counts.get(p.year)||0)+1);
 const stats=seasonalMK(series),expected=(Number(item.end)-Number(item.start)+1)*12;
 const annualMeans=years.map(year=>{const v=series.filter(p=>p.year===year).map(p=>p.value);return {year,mean:v.reduce((a,b)=>a+b,0)/v.length,months:v.length}});
 const verdict=stats.p<.05?(stats.S>0?"increasing":stats.S<0?"decreasing":"no monotonic trend"):"not statistically significant";
 results.push({...item,startDate:item.start+"-01-01",endDate:item.end+"-12-31",resolution:"Monthly",method:"Seasonal Mann–Kendall (12 calendar-month strata) + seasonal Sen slope",alpha:.05,seriesCount:series.length,expectedMonths:expected,missingMonths:expected-series.length,yearsCovered:years.length,completeYears:years.filter(y=>counts.get(y)===12).length,actualFirstMonth:series.length?series[0].year+"-"+String(series[0].month).padStart(2,"0"):null,actualLastMonth:series.length?series.at(-1).year+"-"+String(series.at(-1).month).padStart(2,"0"):null,statistics:{...stats,verdict,significant:stats.p<.05,senSlopeUnitPerYear:item.unit==="°C"?"°C/year":"mm/day/year",senSlopeUnitPerDecade:item.unit==="°C"?"°C/decade":"mm/day/decade"},annualMeans,observations:series,source:{provider:"NASA Langley Research Center POWER Project",api:"POWER Monthly and Annual API v2.10.0",endpoint:endpoint.toString(),sourceDataset:payload?.header?.sources??[],elevationMeters:payload?.geometry?.coordinates?.[2]??null,parameterMetadata:payload?.parameters?.[item.variable]??null,timeStandard:payload?.header?.time_standard??"LST",retrievedAt:new Date().toISOString(),dataNote:"Monthly point values; YYYY13 annual aggregate excluded. Seasonal test compares like calendar months across years."}});
}
const serialized=JSON.stringify(results,null,2)+"\n";
await mkdir(new URL("./src/data/",import.meta.url),{recursive:true});
await mkdir(new URL("./public/data/",import.meta.url),{recursive:true});
await writeFile(new URL("./src/data/citable-records.json",import.meta.url),serialized);
await writeFile(new URL("./public/data/citable-records.json",import.meta.url),serialized);
console.log(JSON.stringify(results.map(r=>({id:r.id,n:r.seriesCount,missing:r.missingMonths,first:r.actualFirstMonth,last:r.actualLastMonth,S:r.statistics.S,Z:+r.statistics.z.toFixed(4),p:+r.statistics.p.toFixed(6),slopePerDecade:+r.statistics.senSlopePerDecade.toFixed(5),verdict:r.statistics.verdict,dataset:r.source.sourceDataset})),null,2));
