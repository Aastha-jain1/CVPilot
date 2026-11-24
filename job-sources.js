// Independent public job source adapters and shared normalization/matching.
const SKILLS = ["JavaScript","TypeScript","Python","Java","C++","C","Go","Ruby","PHP","Swift","Kotlin","Rust","Bash","React","Angular","Vue","Node.js","Express.js","HTML","CSS","SQL","PostgreSQL","MySQL","MongoDB","Redis","Git","GitHub","Docker","Kubernetes","Terraform","Linux","AWS","Azure","GCP","Spring","Django","Flask","FastAPI","Machine Learning","Data Science","Data Structures","Algorithms","Cybersecurity","NLP","TensorFlow","PyTorch","Pandas","Power BI","Tableau","Figma","Excel","Communication"];
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function skillsIn(text="") { return SKILLS.filter(s => new RegExp(`(^|[^\\w+#])${escapeRe(s).replace(/\\ /g,"\\s+")}($|[^\\w+#])`, "i").test(text)); }
function candidateProfile(resume="") {
  const text=String(resume), lower=text.toLowerCase(), found=skillsIn(text);
  const sections={education:"",experience:"",projects:"",technologies:found};
  const lines=text.split(/\r?\n/); let section="";
  for(const line of lines){const h=line.trim().replace(/[:\s]+$/,""), k=/^(education|academics?|academic background)$/i.test(h)?"education":/^(?:(?:professional|work) )?(?:experience|internships?)$/i.test(h)?"experience":/^(academic |personal )?projects?$/i.test(h)?"projects":"";if(k){section=k;continue}if(/^(?:technical )?skills?(?: summary)?|certifications?(?: & courses)?|summary|profile|objective|achievements?|awards?|honou?rs$/i.test(h)){section="";continue}if(section)sections[section]+=(sections[section]?"\n":"")+line.trim()}
  const degree=(text.match(/\b(B\.?Tech|B\.?E\.?|B\.?Sc|BCA|M\.?Tech|M\.?Sc|MCA|bachelor'?s|master'?s|Ph\.?D)\b[^\n,;]*/i)||[])[0]||"";
  const year=text.match(/\b(?:first|second|third|final|\d(?:st|nd|rd|th))\s*year\b/i);
  const exp=/\b(\d+(?:\.\d+)?)\s*\+?\s*years?\b/i.exec(sections.experience||text);
  const roles=[...new Set((text.match(/\b(?:software|web|frontend|front-end|backend|back-end|full[- ]stack|data|machine learning|AI|cybersecurity|QA|product)\s+(?:developer|engineer|analyst|intern|designer)\b/ig)||[]))];
  const level=exp?`${exp[1]}+ years experience`:year?"Student / internship candidate":"Fresher / entry-level candidate";
  const titles=[...roles]; if(found.some(x=>["Python","Java","JavaScript","C++"].includes(x)))titles.push("Software Engineer Intern","Software Developer Intern");if(found.includes("React")||found.includes("HTML"))titles.push("Frontend Developer Intern");if(found.some(x=>["Machine Learning","Data Science","Python"].includes(x)))titles.push("Data Analyst Intern");if(found.includes("Cybersecurity"))titles.push("Cybersecurity Intern");
  return {education:degree||sections.education.trim().slice(0,500),experience:sections.experience.trim().slice(0,1200),projects:sections.projects.trim().slice(0,1200),skills:found,technologies:found,level,experienceYears:exp?Number(exp[1]):0,roles:titles.length?[...new Set(titles)]:["Entry Level Associate"],hasInternshipSignals:!!year||!exp};
}
function normalize(raw, source) {
  const title=raw.title||raw.text||raw.position||""; const company=raw.company_name||raw.company||raw.organization||raw.companyName||"Unknown company";
  const url=raw.url||raw.apply_url||raw.hostedUrl||raw.hostedUrl||raw.absolute_url||raw.applyUrl||"";
  if(!title||!url||!/^https:\/\//i.test(url))return null;
  const description=String(raw.description||raw.content||raw.descriptionPlain||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").slice(0,12000);
  const location=raw.location?.name||raw.location||raw.candidate_required_location||raw.locationName||"Location not specified";
  const tags=[...(raw.tags||[]),...(raw.job_types||[]),...(raw.categories||[]).map(x=>typeof x==="string"?x:x.name||"")].filter(Boolean);
  const joined=[title,description,...tags].join(" ");
  const typeText=[raw.job_type,raw.jobType,raw.commitment,joined].filter(Boolean).join(" ").replace(/_/g," ");
  const type=/intern(ship)?/i.test(typeText)?"Internship":/contract|freelance/i.test(typeText)?"Contract":/part[- ]time/i.test(typeText)?"Part-time":"Full-time";
  const remote=raw.remote===true||/remote|work from home|anywhere/i.test(String(location)+" "+joined);
  const workplace=raw.workplaceType||raw.workplace_type||(/hybrid/i.test(String(location)+" "+joined)?"Hybrid":remote?"Remote":"On-site");
  const skills=skillsIn(joined);
  let posted=raw.created_at||raw.createdAt||raw.publication_date||raw.date||null;if(typeof posted==="number")posted=new Date(posted<1e12?posted*1000:posted).toISOString();
  const salary=raw.salary||raw.salary_range||raw.salaryRange||raw.salary_min&&`${raw.salary_currency||""} ${raw.salary_min}–${raw.salary_max||""}`||null;
  const experienceRequirement=(joined.match(/\b(?:\d+\s*[-–+]?\s*\d*\s*years?\s+(?:of\s+)?experience|no experience required|entry[- ]level|early career|new grad)\b/i)||[])[0]||(/fresher|graduate|intern/i.test(joined)?"Fresher / entry level":"Not specified");
  const adzunaDomain={in:"https://www.adzuna.in/",gb:"https://www.adzuna.co.uk/",us:"https://www.adzuna.com/",au:"https://www.adzuna.com.au/"}[process.env.ADZUNA_COUNTRY||"in"]||"https://www.adzuna.com/";
  return {id:`${source}:${raw.id||raw.shortcode||raw.requisition_id||url}`,title,company,companyLogo:raw.company_logo||raw.companyLogo||null,location:String(location),remote,workplace,jobType:type,experienceRequirement,salary:salary?String(salary).trim():null,salaryMin:Number.isFinite(+raw.salary_min)?+raw.salary_min:null,salaryMax:Number.isFinite(+raw.salary_max)?+raw.salary_max:null,postedAt:posted,source,sourceLabel:source,sourceUrl:source==="Adzuna"?adzunaDomain:source==="Arbeitnow"?"https://www.arbeitnow.com/":null,description,skills,applicationUrl:url,expiresAt:raw.validThrough||raw.expires_at||null};
}
function matchJob(job, profile) {
  const have=new Set(profile?.technologies||[]), required=job.skills||[], matched=required.filter(s=>have.has(s)), missing=required.filter(s=>!have.has(s));
  const roleFit=(profile?.roles||[]).some(r=>job.title.toLowerCase().includes(r.toLowerCase().split(" ")[0]))?100:0;
  const skillScore=required.length?matched.length/required.length*85:0; const titleScore=roleFit?15:0;
  return {score:Math.round(Math.min(100,skillScore+titleScore)),matchedSkills:matched,missingSkills:missing,scoreBreakdown:{skillCoverage:required.length?Math.round(matched.length/required.length*100):null,skillsMatched:matched.length,skillsRequired:required.length,titleSignal:!!roleFit,formula:required.length?"85% × matched recognized skills / skills mentioned in the posting + 15% role-title signal":"Role-title signal only; the posting has no recognized skills"}};
}
const adapters={
  arbeitnow:async()=>{const j=await get(process.env.ARBEITNOW_API_URL||"https://www.arbeitnow.com/api/job-board-api");return(j.data||[]).map(x=>normalize(x,"Arbeitnow")).filter(Boolean)},
  adzuna:async()=>{const id=process.env.ADZUNA_APP_ID,key=process.env.ADZUNA_APP_KEY;if(!id||!key)return[];const country=process.env.ADZUNA_COUNTRY||"in",currency=country==="in"?"₹ ":country==="gb"?"£ ":country==="us"?"$ ":"";const j=await get(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/1?app_id=${encodeURIComponent(id)}&app_key=${encodeURIComponent(key)}&results_per_page=50&what=intern%20fresher%20entry%20level`);return(j.results||[]).map(x=>normalize({id:x.id,title:x.title,company:x.company?.display_name,location:x.location?.display_name,url:x.redirect_url?.replace(/^http:/i,"https:"),description:x.description,created_at:x.created,salary:x.salary_min?`${currency}${x.salary_min}–${x.salary_max||""}`:null,salary_min:x.salary_min,salary_max:x.salary_max,job_type:x.contract_time||x.contract_type},"Adzuna")).filter(Boolean)},
  greenhouse:async()=>Promise.all((process.env.GREENHOUSE_BOARDS||"").split(",").map(x=>x.trim()).filter(Boolean).map(async slug=>{const j=await get(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`);return(j.jobs||[]).map(x=>normalize({...x,company:slug},"Greenhouse"))})).then(a=>a.flat().filter(Boolean)),
  lever:async()=>Promise.all((process.env.LEVER_SITES||"").split(",").map(x=>x.trim()).filter(Boolean).map(async slug=>{const j=await get(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`);return(j||[]).map(x=>normalize({...x,title:x.text,company:slug,url:x.hostedUrl,location:x.categories?.location,description:x.descriptionPlain||x.description,createdAt:x.createdAt,tags:x.categories?[x.categories.team,x.categories.commitment]:[]},"Lever"))})).then(a=>a.flat().filter(Boolean))
};
async function get(url){const r=await fetch(url,{headers:{"User-Agent":"Resumate Job Discovery/1.0"},signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error(`source_http_${r.status}`);return r.json()}
function dedupe(jobs){const map=new Map();for(const j of jobs){const key=(j.title+"|"+j.company+"|"+j.location).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();if(!map.has(key))map.set(key,j)}return [...map.values()]}
function validJobs(jobs, now=Date.now()){return dedupe(jobs).filter(j=>{const exp=Date.parse(j.expiresAt||"");const post=Date.parse(j.postedAt||"");return(!exp||exp>now)&&(!post||now-post<120*86400000)})}
module.exports={SKILLS,skillsIn,candidateProfile,normalize,matchJob,adapters,validJobs};
