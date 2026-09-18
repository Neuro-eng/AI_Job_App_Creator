"use client";

import { useState } from "react";
import { buildCvDocument, buildCoverLetterDocument, downloadAsDocx } from "./lib/docx-export";

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

export default function Home() {
  const [cv, setCv] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleGenerate() {
    setError("");
    setResult(null);

    if (!cv.trim() || !jobDescription.trim()) {
      setError("Please paste both your CV and the job description.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, jobDescription }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong. Please try again.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="hero">
        <h1>AI Job Application Generator</h1>
        <p>Paste your CV and a job description. Get a tailored ATS CV, cover letter, skills gap analysis, and likely interview questions.</p>
      </header>

      <div className="card">
        <label htmlFor="cv">Your current CV (paste as plain text)</label>
        <textarea
          id="cv"
          placeholder="Paste your CV content here..."
          value={cv}
          onChange={(e) => setCv(e.target.value)}
        />
      </div>

      <div className="card">
        <label htmlFor="jd">Job description</label>
        <textarea
          id="jd"
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn" onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate my application kit"}
      </button>

      {result && (
        <div style={{ marginTop: 32 }}>
          <ResultBlock
            title="ATS-Optimized CV"
            content={result.ats_cv}
            filename="ATS_CV.docx"
            docBuilder={buildCvDocument}
          />
          <ResultBlock
            title="Cover Letter"
            content={result.cover_letter}
            filename="Cover_Letter.docx"
            docBuilder={buildCoverLetterDocument}
          />
          <div className="card result-section">
            <h2>Skills Gap Analysis</h2>
            <ul className="gap-list">
              {(result.skills_gap || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="card result-section">
            <h2>Likely Interview Questions</h2>
            <ul className="gap-list">
              {(result.interview_questions || []).map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <footer>Built with Next.js + Gemini API</footer>
    </div>
  );
}

function ResultBlock({ title, content, filename, docBuilder }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadAsDocx(docBuilder, content, filename);
    } catch (err) {
      console.error("Docx generation failed:", err);
      alert("Could not generate the Word file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="card result-section">
      <h2>
        {title}
        <span style={{ display: "flex", gap: 8 }}>
          <button className="copy-btn" onClick={() => copyToClipboard(content)}>
            Copy
          </button>
          <button className="copy-btn" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Preparing..." : "Download Word"}
          </button>
        </span>
      </h2>
      <pre>{content}</pre>
    </div>
  );
}
