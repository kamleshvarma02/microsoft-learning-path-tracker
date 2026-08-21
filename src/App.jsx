import { useEffect, useState } from "react";
import "./App.css";

// ======================================================
// DATA
// ======================================================

const DOMAINS = [
  {
    id: "cloud",
    name: "☁️ Cloud",
    description: "Learn Azure cloud and infrastructure.",
    certifications: [
      {
        id: "az900",
        name: "AZ-900",
        title: "Azure Fundamentals",
        description: "Learn basic cloud concepts and Azure services.",
        prerequisites: [],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
      },
      {
        id: "az104",
        name: "AZ-104",
        title: "Azure Administrator Associate",
        description: "Learn how to manage Azure resources and services.",
        prerequisites: ["az900"],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/",
      },
      {
        id: "az305",
        name: "AZ-305",
        title: "Azure Solutions Architect Expert",
        description: "Learn how to design advanced Azure solutions.",
        prerequisites: ["az104"],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/azure-solutions-architect/",
      },
    ],
  },

  {
    id: "ai-data",
    name: "🤖 AI / Data",
    description: "Explore Artificial Intelligence and Data on Azure.",
    certifications: [
      {
        id: "ai900",
        name: "AI-900",
        title: "Azure AI Fundamentals",
        description: "Learn the basics of Artificial Intelligence.",
        prerequisites: [],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/",
      },
      {
        id: "dp900",
        name: "DP-900",
        title: "Azure Data Fundamentals",
        description: "Learn basic data concepts and Azure data services.",
        prerequisites: [],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/azure-data-fundamentals/",
      },
      {
        id: "ai102",
        name: "AI-102",
        title: "Azure AI Engineer Associate",
        description: "Build and deploy AI solutions using Azure.",
        prerequisites: ["ai900"],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-engineer/",
      },
      {
        id: "dp100",
        name: "DP-100",
        title: "Azure Data Scientist Associate",
        description: "Learn how to build and manage machine learning solutions.",
        prerequisites: ["ai900", "dp900"],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/azure-data-scientist/",
      },
    ],
  },

  {
    id: "security",
    name: "🔐 Security",
    description: "Learn cybersecurity and Microsoft security tools.",
    certifications: [
      {
        id: "sc900",
        name: "SC-900",
        title: "Security, Compliance and Identity Fundamentals",
        description: "Learn the basics of security and identity.",
        prerequisites: [],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/security-compliance-and-identity-fundamentals/",
      },
      {
        id: "sc200",
        name: "SC-200",
        title: "Security Operations Analyst",
        description: "Learn threat detection and security monitoring.",
        prerequisites: ["sc900"],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/security-operations-analyst/",
      },
      {
        id: "sc300",
        name: "SC-300",
        title: "Identity and Access Administrator",
        description: "Learn identity and access management.",
        prerequisites: ["sc900"],
        link: "https://learn.microsoft.com/en-us/credentials/certifications/identity-and-access-administrator/",
      },
    ],
  },
];

// ======================================================
// AI FUNCTION
// AI ONLY EXPLAINS THE STEP.
// IT DOES NOT DECIDE THE LEARNING PATH.
// ======================================================

async function getAIExplanation(domainName, certification, completed) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API key not found");
  }

  const prompt = `
A student is following the ${domainName} Microsoft certification path.

The application has already decided that the next certification is:

${certification.name} - ${certification.title}

Completed certifications:
${completed.length ? completed.join(", ") : "None"}

Explain in 1 or 2 simple sentences why this certification is a good next step.

Do not recommend another certification.
Keep the answer short and beginner friendly.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  const data = await response.json();

  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// ======================================================
// MAIN APP
// ======================================================

function App() {
  // Selected domain
  const [selectedDomain, setSelectedDomain] = useState("cloud");

  // Completed certifications
  const [progress, setProgress] = useState(() => {
    const savedProgress = localStorage.getItem("mic-progress");

    return savedProgress ? JSON.parse(savedProgress) : {};
  });

  // AI states
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const domain = DOMAINS.find(
    (item) => item.id === selectedDomain
  );

  const completedIds = progress[selectedDomain] || [];

  // ======================================================
  // SAVE PROGRESS
  // ======================================================

  useEffect(() => {
    localStorage.setItem(
      "mic-progress",
      JSON.stringify(progress)
    );
  }, [progress]);

  // ======================================================
  // CHECK CERTIFICATION STATUS
  // ======================================================

  function getStatus(certification) {
    // Already completed
    if (completedIds.includes(certification.id)) {
      return "completed";
    }

    // Check whether ALL prerequisites are completed
    const prerequisitesCompleted =
      certification.prerequisites.every((prerequisite) =>
        completedIds.includes(prerequisite)
      );

    if (prerequisitesCompleted) {
      return "available";
    }

    return "locked";
  }

  // ======================================================
  // MARK AS COMPLETED
  // ======================================================

  function markCompleted(certificationId) {
    const currentProgress = progress[selectedDomain] || [];

    // Prevent duplicate completion
    if (currentProgress.includes(certificationId)) {
      return;
    }

    setProgress({
      ...progress,
      [selectedDomain]: [
        ...currentProgress,
        certificationId,
      ],
    });
  }

  // ======================================================
  // FIND NEXT AVAILABLE CERTIFICATION
  // ======================================================

  const nextCertification = domain.certifications.find(
    (certification) =>
      getStatus(certification) === "available"
  );

  // ======================================================
  // GET AI EXPLANATION
  // ======================================================

  async function explainNextStep() {
    if (!nextCertification) return;

    setAiLoading(true);
    setAiText("");

    try {
      const completedNames = domain.certifications
        .filter((certification) =>
          completedIds.includes(certification.id)
        )
        .map((certification) => certification.name);

      const explanation = await getAIExplanation(
        domain.name,
        nextCertification,
        completedNames
      );

      setAiText(explanation);
    } catch (error) {
      // Fallback message
      setAiText(
        `${nextCertification.name} is the next step because you have completed the required prerequisites. It builds on the knowledge you have already gained.`
      );
    }

    setAiLoading(false);
  }

  // ======================================================
  // RESET PROGRESS
  // ======================================================

  function resetProgress() {
    const confirmReset = window.confirm(
      "Are you sure you want to reset your progress?"
    );

    if (!confirmReset) return;

    setProgress({
      ...progress,
      [selectedDomain]: [],
    });

    setAiText("");
  }

  // ======================================================
  // PROGRESS CALCULATION
  // ======================================================

  const completedCount = completedIds.length;

  const totalCount = domain.certifications.length;

  const percentage = Math.round(
    (completedCount / totalCount) * 100
  );

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header>
        <h1>Microsoft Learning Path Tracker</h1>

        <p>
          Choose a learning domain and complete
          certifications step by step.
        </p>
      </header>

      {/* ================= DOMAIN SELECTOR ================= */}

      <div className="domain-container">

        {DOMAINS.map((item) => (
          <button
            key={item.id}
            className={
              selectedDomain === item.id
                ? "domain-card active"
                : "domain-card"
            }
            onClick={() => {
              setSelectedDomain(item.id);
              setAiText("");
            }}
          >
            <h3>{item.name}</h3>

            <p>{item.description}</p>

            <small>
              {(progress[item.id] || []).length}/
              {item.certifications.length} completed
            </small>
          </button>
        ))}

      </div>

      {/* ================= PROGRESS ================= */}

      <section className="progress-section">

        <div className="progress-info">

          <div>
            <h2>{domain.name} Learning Path</h2>

            <p>
              {completedCount} of {totalCount} certifications completed
            </p>
          </div>

          <div className="percentage">
            {percentage}%
          </div>

        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>

      </section>

      {/* ================= NEXT STEP ================= */}

      {nextCertification && (

        <section className="next-step">

          <div>
            <span>YOUR NEXT STEP</span>

            <h2>
              {nextCertification.name}
            </h2>

            <p>
              {nextCertification.title}
            </p>
          </div>

          <button
            onClick={explainNextStep}
            disabled={aiLoading}
          >
            {aiLoading
              ? "AI is thinking..."
              : "✨ Why this step?"}
          </button>

          {aiText && (
            <div className="ai-response">
              <strong>AI Explanation</strong>

              <p>{aiText}</p>
            </div>
          )}

        </section>

      )}

      {/* ================= CERTIFICATIONS ================= */}

      <section className="certification-list">

        {domain.certifications.map(
          (certification, index) => {

            const status =
              getStatus(certification);

            return (

              <div
                key={certification.id}
                className={`certification-card ${status}`}
              >

                {/* Step number */}

                <div className="step-number">

                  {status === "completed"
                    ? "✓"
                    : index + 1}

                </div>

                {/* Certification info */}

                <div className="certification-info">

                  <div className="certification-header">

                    <div>
                      <h2>
                        {certification.name}
                      </h2>

                      <h3>
                        {certification.title}
                      </h3>
                    </div>

                    <span
                      className={`status ${status}`}
                    >
                      {status}
                    </span>

                  </div>

                  <p>
                    {certification.description}
                  </p>

                  {/* Prerequisites */}

                  {certification.prerequisites.length > 0 && (

                    <div className="prerequisites">

                      <strong>
                        Prerequisites:
                      </strong>

                      {" "}

                      {certification.prerequisites
                        .map((id) => {

                          const prerequisite =
                            domain.certifications.find(
                              (cert) =>
                                cert.id === id
                            );

                          return prerequisite?.name;

                        })
                        .join(", ")}

                    </div>

                  )}

                  {/* Buttons */}

                  <div className="card-actions">

                    {status === "available" && (

                      <button
                        className="complete-button"
                        onClick={() =>
                          markCompleted(
                            certification.id
                          )
                        }
                      >
                        Mark as Completed
                      </button>

                    )}

                    {status !== "locked" && (

                      <a
                        href={certification.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Microsoft Learn ↗
                      </a>

                    )}

                    {status === "locked" && (

                      <span className="locked-text">
                        🔒 Complete prerequisites to unlock
                      </span>

                    )}

                  </div>

                </div>

              </div>

            );
          }
        )}

      </section>

      {/* ================= PATH COMPLETE ================= */}

      {completedCount === totalCount && (

        <div className="path-complete">

          <h2>🎉 Learning Path Complete!</h2>

          <p>
            You have completed all certifications
            in the {domain.name} path.
          </p>

        </div>

      )}

      {/* ================= RESET ================= */}

      {completedCount > 0 && (

        <div className="reset-container">

          <button
            className="reset-button"
            onClick={resetProgress}
          >
            Reset Progress
          </button>

        </div>

      )}

    </div>
  );
}

export default App;