const test=require("node:test"),assert=require("node:assert/strict"),http=require("node:http"),{spawn}=require("node:child_process"),path=require("node:path");
const J=require("../job-sources");

test("resume profile, normalization, matching, and expiry filtering",()=>{
  const resume=["EDUCATION","B.Tech Computer Science, 2nd year","SKILLS","Python, React, SQL","PROJECTS","Built an inventory dashboard"].join("\n");
  const p=J.candidateProfile(resume);assert.match(p.education,/B.Tech/);assert.ok(p.technologies.includes("Python"));assert.ok(p.projects.includes("inventory"));assert.equal(p.level,"Student / internship candidate");
  const job=J.normalize({id:9,title:"Software Engineering Intern",company_name:"Example",location:"Remote, India",remote:true,url:"https://jobs.example/apply/9",created_at:Math.floor(Date.now()/1000),job_types:["Internship"],description:"Python React AWS internship"},"Fixture");
  assert.equal(job.jobType,"Internship");assert.ok(Number.isFinite(Date.parse(job.postedAt)));assert.match(job.applicationUrl,/^https:\/\//);const m=J.matchJob(job,p);assert.deepEqual(m.matchedSkills,["Python","React"]);assert.deepEqual(m.missingSkills,["AWS"]);assert.equal(m.score,72);
  assert.equal(J.validJobs([job,{...job,id:"old",postedAt:"2020-01-01"}]).length,1);
  assert.equal(J.normalize({title:"No URL",company:"Example"},"Fixture"),null);
});

test("job profile, listing, search, analytics, and health endpoints",async t=>{
  const upstream=http.createServer((req,res)=>{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({data:[
    {id:1,title:"Software Engineering Intern",company_name:"Example Labs",location:"Remote, India",remote:true,url:"https://careers.example/apply/1",created_at:new Date().toISOString(),description:"Python React AWS internship"},
    {id:2,title:"Junior Python Developer",company_name:"Example Labs",location:"Bengaluru, India",url:"https://careers.example/apply/2",created_at:new Date().toISOString(),description:"Python SQL full-time fresher"}
  ]}))});await new Promise(r=>upstream.listen(0,"127.0.0.1",r));
  const port=upstream.address().port,appPort=5417,p=spawn(process.execPath,[path.join(__dirname,"..","server.js")],{env:{...process.env,PORT:String(appPort),ANTHROPIC_API_KEY:"",ARBEITNOW_API_URL:`http://127.0.0.1:${port}/jobs`}});t.after(()=>{p.kill();upstream.close()});
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(`http://127.0.0.1:${appPort}/api/health`)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}assert.ok(ready,"server starts");
  const root=`http://127.0.0.1:${appPort}`,resume=["EDUCATION","B.Tech Computer Science, 2nd year","SKILLS","Python, React","PROJECTS","Built an app"].join("\n");
  const post=(url,body)=>fetch(root+url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const prof=await post("/api/jobs/profile",{resume});assert.equal(prof.status,200);assert.ok((await prof.json()).profile.technologies.includes("Python"));
  const response=await post("/api/jobs/search",{resume});assert.equal(response.status,200);const result=await response.json();assert.equal(result.jobs.length,2);assert.equal(result.jobs[0].source,"Arbeitnow");assert.ok(result.jobs[0].score>0);assert.ok(result.jobs[0].scoreBreakdown.formula);assert.ok(result.jobs.every(j=>j.applicationUrl.startsWith("https://")));assert.equal(result.analytics.total,2);assert.ok("skillDemandTrends" in result.analytics);
  const filtered=await post("/api/jobs/search",{resume,filters:{jobType:"Internship"}});assert.equal((await filtered.json()).jobs.length,1);
  const all=await fetch(root+"/api/jobs");assert.equal(all.status,200);assert.ok((await all.json()).jobs.length===2);
  const analytics=await fetch(root+"/api/jobs/analytics");assert.equal(analytics.status,200);assert.equal((await analytics.json()).analytics.companies,1);
  assert.equal((await fetch(root+"/api/health")).status,200);
  assert.equal((await post("/api/jobs/profile",{})).status,400);
});
