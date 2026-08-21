
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const paths = {
  Cloud: [
    { id:"az900", title:"Azure Fundamentals", code:"AZ-900", description:"Start with Azure cloud concepts, services, security, and pricing.", link:"https://learn.microsoft.com/credentials/certifications/azure-fundamentals/", prereqs:[] },
    { id:"az104", title:"Azure Administrator Associate", code:"AZ-104", description:"Manage Azure identities, storage, networking, and compute.", link:"https://learn.microsoft.com/credentials/certifications/azure-administrator/", prereqs:["az900"] },
    { id:"az305", title:"Azure Solutions Architect Expert", code:"AZ-305", description:"Design reliable, secure, scalable cloud solutions.", link:"https://learn.microsoft.com/credentials/certifications/azure-solutions-architect/", prereqs:["az104"] }
  ],
  "AI / Data": [
    { id:"ai900", title:"Azure AI Fundamentals", code:"AI-900", description:"Learn core AI concepts and Azure AI services.", link:"https://learn.microsoft.com/credentials/certifications/azure-ai-fundamentals/", prereqs:[] },
    { id:"dp900", title:"Azure Data Fundamentals", code:"DP-900", description:"Understand relational and non-relational data on Azure.", link:"https://learn.microsoft.com/credentials/certifications/azure-data-fundamentals/", prereqs:["ai900"] },
    { id:"ai102", title:"Azure AI Engineer Associate", code:"AI-102", description:"Build AI solutions using Azure AI services.", link:"https://learn.microsoft.com/credentials/certifications/azure-ai-engineer/", prereqs:["ai900","dp900"] }
  ],
  Security: [
    { id:"sc900", title:"Security, Compliance, and Identity Fundamentals", code:"SC-900", description:"Learn Microsoft security, compliance and identity basics.", link:"https://learn.microsoft.com/credentials/certifications/security-compliance-and-identity-fundamentals/", prereqs:[] },
    { id:"az500", title:"Azure Security Engineer Associate", code:"AZ-500", description:"Implement and manage security controls for Azure workloads.", link:"https://learn.microsoft.com/credentials/certifications/azure-security-engineer/", prereqs:["sc900"] },
    { id:"sc100", title:"Cybersecurity Architect Expert", code:"SC-100", description:"Design cybersecurity strategies and Zero Trust architecture.", link:"https://learn.microsoft.com/credentials/certifications/cybersecurity-architect-expert/", prereqs:["az500"] }
  ]
};

const statusOf = (cert, completed) =>
  completed.includes(cert.id) ? "completed" :
  cert.prereqs.every(p => completed.includes(p)) ? "available" : "locked";

const fallback = (cert, domain) =>
  `${cert.code} is next because its prerequisites are complete. It builds on what you already finished in the ${domain} path and prepares you for the next level.`;

async function getAIExplanation(cert, completed, domain) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    await new Promise(r => setTimeout(r, 650));
    return fallback(cert, domain);
  }
  const prompt = `You are a concise Microsoft Learn mentor. Domain: ${domain}. The app already chose the next certification using prerequisite logic. Next: ${cert.title} (${cert.code}). Completed: ${completed.join(", ") || "none"}. In 1-2 encouraging sentences explain why this is the next step. Do not choose another certification.`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || fallback(cert, domain);
  } catch {
    return fallback(cert, domain);
  }
}

function App() {
  const [domain, setDomain] = useState("Cloud");
  const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem("mic-progress") || "{}"));
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const certs = paths[domain];
  const completed = progress[domain] || [];
  const nextCert = useMemo(() => certs.find(c => statusOf(c, completed) === "available"), [domain, completed.join("|")]);

  useEffect(() => localStorage.setItem("mic-progress", JSON.stringify(progress)), [progress]);

  useEffect(() => {
    let dead = false;
    async function run() {
      if (!nextCert) { setExplanation("🎉 You completed this learning path. Try another domain!"); return; }
      setLoading(true); setExplanation("");
      const text = await getAIExplanation(nextCert, completed, domain);
      if (!dead) { setExplanation(text); setLoading(false); }
    }
    run();
    return () => { dead = true; };
  }, [domain, nextCert?.id, completed.join("|")]);

  function complete(cert) {
    if (statusOf(cert, completed) !== "available") return;
    setProgress(p => ({...p, [domain]: [...(p[domain] || []), cert.id]}));
  }

  const percent = Math.round(completed.length / certs.length * 100);

  return <main className="app">
    <section className="hero">
      <div>
        <p className="eyebrow">MIC DEVELOPMENT RECRUITMENT TASK</p>
        <h1>Microsoft Learning<br/>Path Tracker</h1>
        <p className="subtitle">Pick your career direction, complete prerequisites in order, and get a smart explanation for your next step.</p>
      </div>
      <div className="progress-card">
        <span>Current progress</span><strong>{percent}%</strong>
        <div className="bar"><div style={{width:`${percent}%`}}/></div>
        <small>{completed.length} of {certs.length} steps completed</small>
      </div>
    </section>

    <section>
      <div className="section-title"><h2>Choose a domain</h2>
        <button className="reset" onClick={() => setProgress(p => ({...p,[domain]:[]}))}>Reset this path</button>
      </div>
      <div className="domain-grid">
        {Object.keys(paths).map(name => <button key={name} onClick={() => setDomain(name)} className={`domain-btn ${domain===name?"selected":""}`}>
          <span>{name==="Cloud"?"☁️":name==="AI / Data"?"🧠":"🛡️"}</span>{name}
        </button>)}
      </div>
    </section>

    <section className="ai-box">
      <div className="ai-icon">✦</div><div>
        <p className="eyebrow">WHY THIS STEP?</p>
        {loading ? <div className="loading"><span/> Generating explanation...</div> : <p>{explanation}</p>}
      </div>
    </section>

    <section>
      <div className="section-title"><div><h2>{domain} roadmap</h2><p>Prerequisites are checked by the app's own code, not AI.</p></div></div>
      <div className="timeline">
        {certs.map((cert,i) => {
          const status = statusOf(cert, completed);
          return <article key={cert.id} className={`step ${status}`}>
            <div className="step-number">{status==="completed"?"✓":i+1}</div>
            <div className="step-content">
              <div className="step-top"><span className="code">{cert.code}</span><span className={`status ${status}`}>{status}</span></div>
              <h3>{cert.title}</h3><p>{cert.description}</p>
              {cert.prereqs.length>0 && <p className="prereq">Requires: {cert.prereqs.map(id => certs.find(c=>c.id===id)?.code).join(", ")}</p>}
              <div className="actions">
                <a href={cert.link} target="_blank">Open Microsoft Learn ↗</a>
                {status==="available" && <button onClick={() => complete(cert)}>Mark as completed</button>}
                {status==="locked" && <button disabled>Complete prerequisites first 🔒</button>}
                {status==="completed" && <button disabled>Completed ✓</button>}
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>
    <footer>Built for the MIC Development recruitment task · Progress is stored locally</footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App/>);
