"use client";

import React, { useState, useEffect } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Shield, ShieldCheck, ShieldAlert, Building2, HeartPulse, ArrowRight, ArrowLeft,
  CheckCircle2, AlertTriangle, Lock, Activity, ScrollText, Sparkles,
  Loader2, Scale, Gauge, ChevronRight, Sun, Moon, RotateCcw, Fingerprint,
} from "lucide-react";

/* ============================================================================
   Northbridge — AI Governance Readiness Assessment
   Single-page assessment for US BFSI & Healthcare executives.

   Portfolio demonstration by Kartikeya Awasthi. Northbridge is a fictitious
   company — this project is a portfolio and educational demonstration only.

   Portable: all styling lives in the injected <style> block (CSS variables),
   so this component drops into any React/Next.js page unchanged.

   ---------------------------------------------------------------------------
   LEAD CAPTURE: the "Request my demo" form at the end of the report is the
   only thing that ever leaves the browser. It relays to LEAD_EMAIL below via
   FormSubmit (https://formsubmit.co) — no CRM, no silent tracking, no
   telemetry fired on quiz completion. See README.md for the one-time
   activation step FormSubmit requires.
   ========================================================================== */

/* Emailed directly to the portfolio owner. No server, no API key, no CRM. */
const LEAD_EMAIL = "awasthikartikeya92@gmail.com";
const LEAD_ENDPOINT = `https://formsubmit.co/ajax/${LEAD_EMAIL}`;

/* --------------------------------------------------------------------------
   Exposure model — every figure is a DIRECTIONAL ESTIMATE, clearly labelled.
   Breach basis: IBM "Cost of a Data Breach 2024" global average (US$4.88M).
   Regulatory + operational bases are scenario planning inputs, not quotes.
   -------------------------------------------------------------------------- */
const AVG_BREACH_USD = 4_880_000;
const EXPOSURE = {
  BFSI: {
    regBase: 5_000_000,   // SEC / FINRA / OCC penalty envelope (illustrative)
    opBase: 3_200_000,    // remediation, downtime, legal liability (illustrative)
    regLabel: "SEC / FINRA / OCC penalty exposure",
  },
  HEALTHCARE: {
    regBase: 2_130_000,   // HIPAA annual per-category cap tier (illustrative)
    opBase: 2_800_000,    // OCR remediation, care disruption, legal (illustrative)
    regLabel: "HIPAA / HHS OCR penalty exposure",
  },
};

/* Radar categories (shared across both tracks). */
const CATEGORIES = {
  regulatory: "Regulatory Penalty Risk",
  dataLeakage: "Data Leakage Exposure",
  agentDrift: "Agent Drift / Operational Risk",
  auditability: "Auditability Gap",
};

/* Answer weighting: High vulnerability = 3, Moderate = 2, Governed = 1. */
const OPT = (label, points, fix) => ({ label, points, fix });

/* --------------------------------------------------------------------------
   Scenario library — 5 US-contextualized questions per track.
   Each option carries a `fix`: the Northbridge capability that closes the gap,
   surfaced only when the executive's answer scores as a real exposure.
   -------------------------------------------------------------------------- */
const QUESTIONS = {
  BFSI: [
    {
      id: "b1", category: "regulatory", badge: "SR 11-7 · Model Risk",
      prompt: "When your AI agents take consequential actions — approving underwriting, executing trades, adjusting limits — what stands between the model and the outcome?",
      options: [
        OPT("Agents act autonomously; human review is exception-based or absent", 3, "Real-time execution boundaries with enforced human-in-the-loop checkpoints on consequential actions."),
        OPT("Some workflows require sign-off, but thresholds are informal", 2, "Codified approval thresholds and policy gates applied consistently across every agent."),
        OPT("Every consequential action passes a defined, documented approval gate", 1, null),
      ],
    },
    {
      id: "b2", category: "auditability", badge: "FINRA 2026 · Recordkeeping",
      prompt: "If FINRA requested a complete record of an AI agent's prompts, decisions and outputs for a single customer interaction, how fast could you produce it?",
      options: [
        OPT("We don't retain full prompt / response history in retrievable form", 3, "Immutable, timestamped audit trails capturing every prompt, decision and output, queryable on demand."),
        OPT("Logs exist but are fragmented across tools and assembled manually", 2, "Unified, queryable agent ledger that replaces manual log assembly."),
        OPT("Immutable, timestamped trails are captured and retrievable on demand", 1, null),
      ],
    },
    {
      id: "b3", category: "dataLeakage", badge: "GLBA · CCPA / CPRA",
      prompt: "How is non-public personal information handled when it flows into LLMs or third-party model APIs?",
      options: [
        OPT("NPI can reach external models; controls are trust-based or unclear", 3, "PII masking and tokenization enforced at the model gateway before any call leaves your boundary."),
        OPT("Redaction policies exist but aren't enforced at runtime", 2, "Runtime policy enforcement so data controls apply automatically, not by convention."),
        OPT("PII is masked / tokenized before model calls, enforced at the gateway", 1, null),
      ],
    },
    {
      id: "b4", category: "agentDrift", badge: "ECOA · FTC Fair Lending",
      prompt: "What prevents an AI-driven credit or underwriting decision from resting on a hallucinated or biased inference?",
      options: [
        OPT("We rely on model output; no systematic grounding or bias checks", 3, "Continuous grounding, hallucination guards and disparate-impact monitoring on every decision."),
        OPT("Periodic model reviews, but no validation on individual decisions", 2, "Per-decision validation layered on top of your existing model reviews."),
        OPT("Decisions are grounded, explainable and tested for disparate impact", 1, null),
      ],
    },
    {
      id: "b5", category: "agentDrift", badge: "Third-Party · Shadow AI",
      prompt: "How completely do you know every AI agent and third-party model touching regulated workflows today?",
      options: [
        OPT("Teams adopt AI tools independently; there is no central inventory", 3, "Central agent inventory with vendor risk governance across every model in your stack."),
        OPT("We have a partial inventory; vendor risk reviews are inconsistent", 2, "Complete agent registry with consistent, tracked vendor assessments."),
        OPT("All agents are inventoried, governed and vendor-assessed centrally", 1, null),
      ],
    },
  ],
  HEALTHCARE: [
    {
      id: "h1", category: "dataLeakage", badge: "HIPAA · HHS OCR",
      prompt: "When agentic workflows touch clinical data, what keeps PHI from crossing into ungoverned systems, prompts or logs?",
      options: [
        OPT("PHI can flow into agent prompts and logs with limited boundary controls", 3, "PHI de-identification and data-boundary enforcement at the platform layer, before it reaches a model."),
        OPT("Policies exist but enforcement depends on team discipline", 2, "Automated boundary enforcement that removes reliance on individual discipline."),
        OPT("PHI is de-identified / segmented and boundary-enforced at the platform", 1, null),
      ],
    },
    {
      id: "h2", category: "regulatory", badge: "FDA SaMD",
      prompt: "Do any AI agents generate clinical guidance or triage decisions without a licensed clinician in the loop?",
      options: [
        OPT("Agents surface clinical recommendations to patients or staff autonomously", 3, "Enforced clinician-in-the-loop gates with clear Software-as-a-Medical-Device boundaries."),
        OPT("Clinician oversight exists but isn't consistently enforced or logged", 2, "Consistent, logged clinician review on every clinical output."),
        OPT("Clinical outputs are gated by clinician review with clear SaMD limits", 1, null),
      ],
    },
    {
      id: "h3", category: "agentDrift", badge: "Model Drift · Claims",
      prompt: "How would you detect if a model's accuracy on claims or prior-authorization decisions degraded over time?",
      options: [
        OPT("We'd likely notice only through downstream complaints or denials", 3, "Continuous drift and accuracy monitoring with alerting before patients or claims are affected."),
        OPT("We monitor aggregate metrics but not per-decision drift", 2, "Per-decision drift detection layered onto your aggregate metrics."),
        OPT("Continuous drift and accuracy monitoring with alerting is in place", 1, null),
      ],
    },
    {
      id: "h4", category: "dataLeakage", badge: "BAA · No-Train",
      prompt: "For every third-party model in your stack, can you confirm patient data isn't used for training and a BAA is in force?",
      options: [
        OPT("We're not certain of training / opt-out terms across all vendors", 3, "Central vendor governance verifying BAA coverage and contractual no-training guarantees."),
        OPT("BAAs cover major vendors; coverage of all AI tools is incomplete", 2, "Complete vendor registry closing the gap on shadow AI tools."),
        OPT("All vendors are under BAA with contractual no-training guarantees", 1, null),
      ],
    },
    {
      id: "h5", category: "auditability", badge: "Explainability · CMS",
      prompt: "If asked to explain why an autonomous administrative workflow reached a decision, could you reconstruct it end to end?",
      options: [
        OPT("Decisions happen inside opaque agent chains we can't fully reconstruct", 3, "Complete decision trails so every autonomous step is logged and explainable."),
        OPT("We can reconstruct some steps, with effort", 2, "End-to-end trace capture that removes the manual reconstruction effort."),
        OPT("Every step is logged and explainable with a complete decision trail", 1, null),
      ],
    },
  ],
};

const CAT_ICONS = {
  regulatory: Scale,
  dataLeakage: Lock,
  agentDrift: Activity,
  auditability: ScrollText,
};

/* --------------------------------------------------------------------------
   Scoring + exposure engine (pure functions — easy to unit test / reuse).
   -------------------------------------------------------------------------- */
function computeResults(industry, answers) {
  const qs = QUESTIONS[industry];
  const maxPoints = qs.length * 3; // 15

  let total = 0;
  const catPoints = {}; const catMax = {};
  Object.keys(CATEGORIES).forEach((k) => { catPoints[k] = 0; catMax[k] = 0; });

  const answered = qs.map((q) => {
    const idx = answers[q.id];
    const opt = q.options[idx];
    total += opt.points;
    catPoints[q.category] += opt.points;
    catMax[q.category] += 3;
    return { q, opt, points: opt.points };
  });

  const factor = total / maxPoints;                 // 0.33 – 1.0
  const riskScore = Math.round(factor * 100);       // 33 – 100

  const cfg = EXPOSURE[industry];
  const regulatory = Math.round(cfg.regBase * factor);
  const dataBreach = Math.round(AVG_BREACH_USD * factor);
  const operational = Math.round(cfg.opBase * factor);
  const totalExposure = regulatory + dataBreach + operational;

  // Radar: each category normalized 0–100 against its own max.
  const radar = Object.keys(CATEGORIES).map((k) => ({
    key: k,
    category: CATEGORIES[k],
    value: catMax[k] ? Math.round((catPoints[k] / catMax[k]) * 100) : 0,
  }));

  // Top 3 gaps: highest-scoring answers that still carry a fix.
  const gaps = answered
    .filter((a) => a.opt.fix)
    .sort((a, b) => b.points - a.points || 0)
    .slice(0, 3)
    .map((a) => ({
      badge: a.q.badge,
      category: a.q.category,
      concern: a.opt.label,
      fix: a.opt.fix,
      severity: a.points === 3 ? "high" : "mid",
    }));

  let posture;
  if (riskScore >= 75) posture = { label: "High Regulatory Exposure", tone: "high" };
  else if (riskScore >= 55) posture = { label: "Elevated Exposure", tone: "mid" };
  else posture = { label: "Emerging Exposure", tone: "low" };

  return {
    riskScore, posture, factor,
    lineItems: [
      { label: cfg.regLabel, value: regulatory, icon: Scale },
      { label: "Data leakage / breach exposure", value: dataBreach, icon: Lock },
      { label: "Operational & legal liability", value: operational, icon: Activity },
    ],
    totalExposure, radar, gaps,
  };
}

const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");

/* --------------------------------------------------------------------------
   Turns raw answer indices into the actual record worth keeping: which
   question was asked, which option the person picked, and the resulting
   score — used by both the demo-form submission (A) and the silent
   submission log (B) so "what report was sent to them" is reconstructable
   later, not just a set of option indices.
   -------------------------------------------------------------------------- */
function serializeAnswers(industry, answers, results) {
  const qs = QUESTIONS[industry];
  const rows = qs.map((q) => {
    const idx = answers[q.id];
    const opt = q.options[idx];
    return {
      id: q.id,
      badge: q.badge,
      prompt: q.prompt,
      selectedAnswer: opt.label,
      points: opt.points,
    };
  });

  const json = JSON.stringify({
    industry,
    riskScore: results.riskScore,
    posture: results.posture.label,
    estimatedExposureUSD: results.totalExposure,
    answers: rows,
    topGaps: results.gaps,
  });

  const summaryLines = [
    `Industry: ${industry === "BFSI" ? "BFSI" : "Healthcare / Life Sciences"}`,
    `Risk score: ${results.riskScore}/100 (${results.posture.label})`,
    `Estimated annual exposure: ${usd(results.totalExposure)}`,
    "",
    ...rows.map((r, i) => `Q${i + 1} [${r.badge}]: ${r.prompt}\n  -> ${r.selectedAnswer}`),
  ];
  if (results.gaps.length) {
    summaryLines.push("", "Top gaps surfaced:");
    results.gaps.forEach((g) => summaryLines.push(`  - ${g.concern} -> ${g.fix}`));
  }

  return { json, summaryText: summaryLines.join("\n") };
}

/* Count-up hook, honoring reduced-motion. */
function useCountUp(target, run, ms = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setVal(target); return; }
    let raf; const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return val;
}

/* ==========================================================================
   App
   ========================================================================== */
export default function App() {
  const [theme, setTheme] = useState("light"); // light default (brand standard)
  const [stage, setStage] = useState("landing"); // landing | quiz | loading | report
  const [industry, setIndustry] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qid]: optionIndex }
  const [results, setResults] = useState(null);

  // Inject brand fonts once.
  useEffect(() => {
    const pre1 = document.createElement("link");
    pre1.rel = "preconnect"; pre1.href = "https://fonts.googleapis.com";
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect"; pre2.href = "https://fonts.gstatic.com"; pre2.crossOrigin = "";
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800&display=swap";
    document.head.append(pre1, pre2, font);
    return () => { [pre1, pre2, font].forEach((n) => n.remove()); };
  }, []);

  const qs = industry ? QUESTIONS[industry] : [];
  const current = qs[step];
  const answeredCurrent = current ? answers[current.id] != null : false;

  const startTrack = (ind) => {
    setIndustry(ind); setAnswers({}); setStep(0); setStage("quiz");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const choose = (qid, idx) => setAnswers((a) => ({ ...a, [qid]: idx }));

  const next = () => {
    if (step < qs.length - 1) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else generate();
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else { setStage("landing"); setIndustry(null); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generate = () => {
    const r = computeResults(industry, answers);
    setResults(r);
    setStage("loading");
    setTimeout(() => { setStage("report"); window.scrollTo({ top: 0, behavior: "smooth" }); }, 2000);
  };

  const restart = () => {
    setStage("landing"); setIndustry(null); setStep(0); setAnswers({}); setResults(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = qs.length ? ((step + (answeredCurrent ? 1 : 0)) / qs.length) * 100 : 0;

  return (
    <div className="sx-root" data-theme={theme}>
      <style>{CSS}</style>

      {/* Top bar */}
      <header className="sx-topbar">
        <div className="sx-brand">
          <span className="sx-logo"><Shield size={17} strokeWidth={2.4} /></span>
          <span className="sx-wordmark">NORTHBRIDGE</span>
        </div>
        <div className="sx-topbar-right">
          <span className="sx-topbar-tag">Governed Agentic Execution</span>
          <span className="sx-demo-pill">Portfolio demo</span>
          <button className="sx-theme" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            aria-label="Toggle theme">
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {stage === "landing" && (
        <Landing onStart={startTrack} />
      )}

      {stage === "quiz" && current && (
        <Quiz
          industry={industry} qs={qs} step={step} current={current}
          selected={answers[current.id]} onChoose={choose}
          onNext={next} onBack={back} progress={progress} answered={answeredCurrent}
        />
      )}

      {stage === "loading" && <Calculating />}

      {stage === "report" && results && (
        <Report industry={industry} r={results} answers={answers} onRestart={restart} />
      )}

      <footer className="sx-footer">
        <div>
          <strong>Methodology.</strong> Exposure figures are directional planning
          estimates, not legal or actuarial determinations. The breach input uses the
          US$4.88M global average from IBM's <em>Cost of a Data Breach 2024</em>;
          regulatory and operational bases are illustrative scenario inputs scaled by
          your assessed risk. Consult counsel and your compliance function before acting.
        </div>
        <div className="sx-footer-legal">
          <strong>Disclaimer.</strong> Northbridge is a fictitious company. This
          assessment is a portfolio and educational demonstration only — it does not
          represent a real product, service, organization, or regulatory advice. No
          scores, exposure figures, or recommendations here should be relied on for
          business, legal, or compliance decisions. Not affiliated with or endorsed by
          any real company.
        </div>
        <div className="sx-footer-brand">
          © {new Date().getFullYear()} Northbridge · Designed &amp; developed by{" "}
          <strong>Kartikeya Awasthi</strong> ·{" "}
          <a href="mailto:awasthikartikeya92@gmail.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}

/* ==========================================================================
   Landing
   ========================================================================== */
function Landing({ onStart }) {
  return (
    <>
      <section className="sx-hero">
        <div className="sx-hero-inner">
          <span className="sx-eyebrow"><Fingerprint size={13} /> US Regulatory Readiness · BFSI &amp; Healthcare</span>
          <h1 className="sx-h1">
            Is your enterprise AI deployment ready for
            <span className="sx-h1-accent"> SEC, FINRA &amp; HIPAA</span> scrutiny?
          </h1>
          <p className="sx-sub">
            A structured five-question diagnostic that scores your agentic AI governance
            posture against current US enforcement standards, and models the operational
            and financial exposure of ungoverned agents — before regulators find it first.
          </p>
          <div className="sx-hero-meta">
            <span><CheckCircle2 size={14} /> 5 questions · under 3 minutes</span>
            <span><CheckCircle2 size={14} /> Executive-ready exposure report</span>
            <span><CheckCircle2 size={14} /> No sign-up required to see your score</span>
          </div>
        </div>
      </section>

      <main className="sx-landing-body">
        <div className="sx-howitworks">
          <div className="sx-how-step">
            <span className="sx-how-num">01</span>
            <div>
              <h3>Select your regulatory track</h3>
              <p>BFSI or Healthcare / Life Sciences — each maps to a distinct set of US enforcement frameworks.</p>
            </div>
          </div>
          <div className="sx-how-step">
            <span className="sx-how-num">02</span>
            <div>
              <h3>Answer five scenario questions</h3>
              <p>Each maps to a specific regulatory citation and a governance control area — not generic best practice.</p>
            </div>
          </div>
          <div className="sx-how-step">
            <span className="sx-how-num">03</span>
            <div>
              <h3>Receive your exposure report</h3>
              <p>A risk rating, category breakdown, and directional financial exposure estimate, in an executive-summary format.</p>
            </div>
          </div>
        </div>

        <div className="sx-track-label">Select a track to begin</div>
        <div className="sx-tracks">
          <button className="sx-track" onClick={() => onStart("BFSI")}>
            <span className="sx-track-icon"><Building2 size={22} /></span>
            <span className="sx-track-body">
              <span className="sx-track-title">BFSI</span>
              <span className="sx-track-desc">Banking, financial services &amp; insurance</span>
              <span className="sx-track-tags">SR 11-7 · FINRA · GLBA · ECOA</span>
            </span>
            <ChevronRight className="sx-track-arrow" size={20} />
          </button>

          <button className="sx-track" onClick={() => onStart("HEALTHCARE")}>
            <span className="sx-track-icon sx-track-icon--teal"><HeartPulse size={22} /></span>
            <span className="sx-track-body">
              <span className="sx-track-title">Healthcare / Life Sciences</span>
              <span className="sx-track-desc">Hospitals, health systems &amp; HealthTech</span>
              <span className="sx-track-tags">HIPAA · FDA SaMD · CMS · BAA</span>
            </span>
            <ChevronRight className="sx-track-arrow" size={20} />
          </button>
        </div>
      </main>
    </>
  );
}

/* ==========================================================================
   Quiz wizard
   ========================================================================== */
function Quiz({ industry, qs, step, current, selected, onChoose, onNext, onBack, progress, answered }) {
  const Icon = CAT_ICONS[current.category];
  const trackName = industry === "BFSI" ? "BFSI" : "Healthcare / Life Sciences";
  return (
    <main className="sx-quiz">
      <div className="sx-quiz-head">
        <div className="sx-quiz-meta">
          <span className="sx-quiz-track"><Icon size={14} /> {CATEGORIES[current.category]}</span>
          <span className="sx-quiz-count">Question {step + 1} of {qs.length} · {trackName}</span>
        </div>
        <div className="sx-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="sx-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="sx-card sx-question" key={current.id}>
        <span className="sx-qbadge">{current.badge}</span>
        <h2 className="sx-qtext">{current.prompt}</h2>

        <div className="sx-options">
          {current.options.map((o, i) => {
            const active = selected === i;
            const tone = o.points === 3 ? "high" : o.points === 2 ? "mid" : "low";
            return (
              <button
                key={i}
                className={`sx-option ${active ? "is-active" : ""}`}
                data-tone={tone}
                onClick={() => onChoose(current.id, i)}
                aria-pressed={active}
              >
                <span className="sx-radio" aria-hidden>{active && <CheckCircle2 size={16} />}</span>
                <span className="sx-option-label">{o.label}</span>
                <span className="sx-option-tag">
                  {tone === "high" ? "High risk" : tone === "mid" ? "Moderate" : "Governed"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sx-nav">
        <button className="sx-btn sx-btn-ghost" onClick={onBack}>
          <ArrowLeft size={16} /> {step === 0 ? "Change track" : "Back"}
        </button>
        <button className="sx-btn sx-btn-primary" onClick={onNext} disabled={!answered}>
          {step === qs.length - 1 ? "Generate report" : "Next question"}
          {step === qs.length - 1 ? <Sparkles size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>
    </main>
  );
}

/* ==========================================================================
   Calculating
   ========================================================================== */
function Calculating() {
  return (
    <main className="sx-calc">
      <div className="sx-calc-ring"><Loader2 className="sx-spin" size={30} /></div>
      <h2 className="sx-calc-title">Compiling your exposure report…</h2>
      <p className="sx-calc-sub">Scoring your posture against US enforcement standards and modeling directional financial exposure.</p>
    </main>
  );
}

/* ==========================================================================
   Report
   ========================================================================== */
function Report({ industry, r, answers, onRestart }) {
  const [showReport] = useState(true);
  const exposure = useCountUp(r.totalExposure, showReport, 1600);
  const scoreVal = useCountUp(r.riskScore, showReport, 1100);
  const trackName = industry === "BFSI" ? "BFSI" : "Healthcare / Life Sciences";

  const [meta] = useState(() => {
    const d = new Date();
    const ref = `NB-GRC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const generated = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    return { ref, generated };
  });

  return (
    <main className="sx-report">
      <div className="sx-report-eyebrow">
        <span><Gauge size={13} /> Executive Summary · {trackName} Track</span>
        <button className="sx-restart" onClick={onRestart}><RotateCcw size={13} /> Restart</button>
      </div>
      <div className="sx-report-meta">Reference {meta.ref} · Generated {meta.generated}</div>

      {/* Score + exposure hero row */}
      <div className="sx-report-hero">
        <div className={`sx-card sx-score sx-tone-${r.posture.tone}`}>
          <div className="sx-score-top">
            {r.posture.tone === "high" ? <ShieldAlert size={18} /> : r.posture.tone === "mid" ? <Shield size={18} /> : <ShieldCheck size={18} />}
            <span>Overall Risk Rating: {r.posture.label}</span>
          </div>
          <div className="sx-score-num">{Math.round(scoreVal)}<span className="sx-score-den">/100</span></div>
          <div className="sx-score-bar"><div className="sx-score-bar-fill" style={{ width: `${r.riskScore}%` }} /></div>
          <p className="sx-score-note">Composite governance risk across five US regulatory scenarios. Higher means greater exposure.</p>
        </div>

        <div className="sx-card sx-exposure">
          <span className="sx-exposure-label">Estimated annual financial exposure</span>
          <div className="sx-exposure-num">{usd(exposure)}</div>
          <span className="sx-exposure-est">Directional estimate · USD / year</span>
          <div className="sx-lineitems">
            {r.lineItems.map((li, i) => {
              const LI = li.icon;
              return (
                <div className="sx-lineitem" key={i}>
                  <span className="sx-lineitem-l"><LI size={14} /> {li.label}</span>
                  <span className="sx-lineitem-v">{usd(li.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Radar breakdown */}
      <div className="sx-card sx-radar-card">
        <div className="sx-card-head">
          <h3>Risk breakdown by control area</h3>
          <span className="sx-card-sub">Normalized 0–100 · higher is more exposed</span>
        </div>
        <div className="sx-radar-wrap">
          <div className="sx-radar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={r.radar} outerRadius="72%">
                <PolarGrid stroke="var(--sx-border)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "var(--sx-muted)", fontSize: 11, fontFamily: "Inter" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="var(--sx-royal)" fill="var(--sx-royal)" fillOpacity={0.18} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "var(--sx-panel)", border: "1px solid var(--sx-border)", borderRadius: 10, fontFamily: "Inter", fontSize: 12, color: "var(--sx-ink)" }}
                  formatter={(v) => [`${v}/100`, "Exposure"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="sx-radar-legend">
            {r.radar.map((d) => {
              const LI = CAT_ICONS[d.key];
              const tone = d.value >= 67 ? "high" : d.value >= 40 ? "mid" : "low";
              return (
                <li key={d.key} data-tone={tone}>
                  <span className="sx-legend-l"><LI size={15} /> {d.category}</span>
                  <span className="sx-legend-v">{d.value}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Gaps -> Northbridge guardrails */}
      <div className="sx-gaps-head">
        <h3>Key findings &amp; recommended controls</h3>
        <p>The highest-priority findings from your answers, mapped to the specific controls that address them.</p>
      </div>
      <div className="sx-gaps">
        {r.gaps.length === 0 && (
          <div className="sx-card sx-gap sx-gap-clean">
            <ShieldCheck size={22} />
            <div>
              <h4>No high-priority findings</h4>
              <p>Your answers indicate mature controls across all five scenarios. Northbridge hardens and continuously proves that posture as your agent footprint scales.</p>
            </div>
          </div>
        )}
        {r.gaps.map((g, i) => {
          const GI = CAT_ICONS[g.category];
          return (
            <div className={`sx-card sx-gap sx-gap-${g.severity}`} key={i}>
              <div className="sx-gap-top">
                <span className="sx-gap-badge">{g.badge}</span>
                <span className={`sx-gap-sev sx-gap-sev-${g.severity}`}>
                  <AlertTriangle size={12} /> {g.severity === "high" ? "High priority" : "Moderate priority"}
                </span>
              </div>
              <div className="sx-gap-concern"><GI size={15} /> <span>{g.concern}</span></div>
              <div className="sx-gap-fix">
                <span className="sx-gap-fix-label"><ShieldCheck size={13} /> Recommended control</span>
                <p>{g.fix}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA + lead capture */}
      <LeadCapture industry={industry} riskScore={r.riskScore} exposure={r.totalExposure} answers={answers} results={r} />
    </main>
  );
}

/* ==========================================================================
   Lead capture — the "request a demo" form at the bottom of the report.
   Risk Score + Estimated Exposure are passed as hidden fields.
   ========================================================================== */
function LeadCapture({ industry, riskScore, exposure, answers, results }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", company: "", email: "", jobTitle: "",
  });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const emailOk = /.+@.+\..+/.test(form.email);
  const canSubmit = form.firstName && form.lastName && form.company && emailOk;

  const submit = async () => {
    if (!canSubmit) { setError("Add your name, company and a valid work email to continue."); return; }
    setError("");

    // Full field set incl. the risk score, exposure figure and complete Q&A
    // report, so the email shows exactly what this person answered and what
    // was shown to them — not just a name and score.
    const { summaryText } = serializeAnswers(industry, answers, results);
    const fields = {
      "First name": form.firstName,
      "Last name": form.lastName,
      "Company": form.company,
      "Work email": form.email,
      "Job title": form.jobTitle || "—",
      "Track": industry === "BFSI" ? "BFSI" : "Healthcare / Life Sciences",
      "Risk score": `${riskScore}/100`,
      "Estimated annual exposure": usd(exposure),
      "Full report": summaryText,
      "Submitted from": typeof window !== "undefined" ? window.location.href : "",
      "Submitted at": new Date().toLocaleString(),
    };

    // Relays to LEAD_EMAIL via FormSubmit (https://formsubmit.co) — a free,
    // no-account AJAX relay for static/JS sites. No CRM, no server, no API
    // key in source. See README.md for the one-time activation step.
    const payload = {
      _subject: `AI Governance Assessment — new demo request: ${form.firstName} ${form.lastName}`,
      _template: "table",
      _captcha: "false",
      ...fields,
    };

    try {
      await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });
      setSent(true);
    } catch (e) {
      // Relay unreachable — fall back to the visitor's own mail client so
      // the request still reaches the inbox instead of silently vanishing.
      console.warn("Lead relay failed, falling back to mailto:", e);
      const body = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n");
      const href = `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="sx-card sx-cta sx-cta-done">
        <ShieldCheck size={30} />
        <h3>Request received</h3>
        <p>In the real-world version, a Northbridge governance specialist would reach out to walk through your exposure report and a tailored guardrail plan. This is a portfolio demo — your details were emailed to Kartikeya and nowhere else.</p>
      </div>
    );
  }

  return (
    <div className="sx-card sx-cta">
      <div className="sx-cta-copy">
        <span className="sx-cta-eyebrow">Next steps</span>
        <h3>Discuss these findings with a Northbridge governance specialist</h3>
        <p>Walk through this report line by line and see how the guardrail layer enforces execution boundaries, captures immutable audit trails, and proves compliance across every agent.</p>
        <div className="sx-cta-chips">
          <span>Risk score <strong>{riskScore}/100</strong></span>
          <span>Est. exposure <strong>{usd(exposure)}</strong></span>
        </div>
      </div>

      <div className="sx-form" id="sx-lead-form">
        <div className="sx-form-row">
          <label>First name<input value={form.firstName} onChange={set("firstName")} placeholder="Jordan" /></label>
          <label>Last name<input value={form.lastName} onChange={set("lastName")} placeholder="Rivera" /></label>
        </div>
        <label>Company<input value={form.company} onChange={set("company")} placeholder="Company, Inc." /></label>
        <div className="sx-form-row">
          <label>Work email<input value={form.email} onChange={set("email")} placeholder="jordan@company.com" type="email" /></label>
          <label>Job title<input value={form.jobTitle} onChange={set("jobTitle")} placeholder="Chief AI Officer" /></label>
        </div>
        {error && <div className="sx-form-error"><AlertTriangle size={13} /> {error}</div>}
        <button className="sx-btn sx-btn-primary sx-btn-full" onClick={submit} disabled={!canSubmit}>
          Request a consultation <ArrowRight size={16} />
        </button>
        <p className="sx-form-fine">Your risk score and estimated exposure are attached automatically. Emailed straight to Kartikeya Awasthi — no CRM, no mailing list.</p>
      </div>
    </div>
  );
}

/* ==========================================================================
   Styles — brand tokens via CSS variables (light default, dark toggle).
   ========================================================================== */
const CSS = `
.sx-root{
  --sx-bg:#FFFFFF; --sx-bg-soft:#F7F9FC; --sx-panel:#FFFFFF; --sx-border:#DDE3ED;
  --sx-ink:#0A1628; --sx-muted:#5B6B85; --sx-royal:#2E5FA3; --sx-royal-deep:#1B3A6B;
  --sx-cyan:#3B7DD8; --sx-hero:#0A1628; --sx-hero-2:#1B3A6B;
  --sx-high:#DC2626; --sx-mid:#D97706; --sx-low:#059669;
  --sx-shadow:0 1px 3px rgba(10,22,40,.06),0 8px 24px rgba(10,22,40,.05);
  --sx-radius:12px;
  font-family:'Inter',system-ui,sans-serif; color:var(--sx-ink);
  background:var(--sx-bg-soft); min-height:100vh; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.sx-root[data-theme="dark"]{
  --sx-bg:#0A0F1D; --sx-bg-soft:#070B16; --sx-panel:#0F1626; --sx-border:#232D42;
  --sx-ink:#EDF1F9; --sx-muted:#8A96B3; --sx-royal:#5B8FD9; --sx-royal-deep:#3B7DD8;
  --sx-cyan:#5B8FD9; --sx-hero:#050810; --sx-hero-2:#0C1220;
  --sx-shadow:0 1px 2px rgba(0,0,0,.3),0 16px 40px rgba(0,0,0,.35);
}
.sx-root *{box-sizing:border-box;}
.sx-root h1,.sx-root h2,.sx-root h3,.sx-root h4{font-family:'Inter Tight',sans-serif;margin:0;letter-spacing:-.01em;}
.sx-root button{font-family:inherit;cursor:pointer;}
.sx-root :focus-visible{outline:2px solid var(--sx-royal);outline-offset:2px;border-radius:6px;}

/* Topbar */
.sx-topbar{display:flex;align-items:center;justify-content:space-between;
  padding:16px clamp(18px,5vw,56px);max-width:1180px;margin:0 auto;}
.sx-brand{display:flex;align-items:center;gap:10px;}
.sx-logo{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;
  background:linear-gradient(135deg,var(--sx-royal-deep),var(--sx-cyan));color:#fff;}
.sx-wordmark{font-family:'Inter Tight',sans-serif;font-weight:700;font-size:15.5px;letter-spacing:-.01em;color:var(--sx-ink);}
.sx-topbar-right{display:flex;align-items:center;gap:12px;}
.sx-topbar-tag{font-size:12px;color:var(--sx-muted);font-weight:500;}
.sx-demo-pill{font-size:10.5px;font-weight:600;letter-spacing:.03em;color:var(--sx-royal);
  background:color-mix(in srgb,var(--sx-royal) 10%,transparent);
  border:1px solid color-mix(in srgb,var(--sx-royal) 24%,transparent);
  padding:4px 10px;border-radius:100px;white-space:nowrap;}
.sx-theme{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;
  border:1px solid var(--sx-border);background:var(--sx-panel);color:var(--sx-ink);}
@media(max-width:680px){.sx-topbar-tag,.sx-demo-pill{display:none;}}

/* Hero */
.sx-hero{padding:0;}
.sx-hero-inner{
  background:linear-gradient(150deg,var(--sx-hero) 0%,var(--sx-hero-2) 60%,var(--sx-royal) 130%);
  padding:clamp(40px,7vw,72px) clamp(18px,5vw,56px) clamp(48px,6vw,64px);color:#EAF0FF;
  max-width:1180px;margin:0 auto;
}
.sx-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;color:#9FC3F0;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);
  padding:6px 12px;border-radius:100px;}
.sx-h1{font-size:clamp(28px,4.4vw,44px);line-height:1.14;margin:20px 0 0;max-width:19ch;font-weight:700;}
.sx-h1-accent{background:linear-gradient(100deg,#7FB0FF,#5EE7D6);-webkit-background-clip:text;background-clip:text;color:transparent;}
.sx-sub{margin:18px 0 0;max-width:62ch;color:#C4D0EA;font-size:clamp(15px,1.5vw,17px);}
.sx-hero-meta{display:flex;flex-wrap:wrap;gap:20px;margin-top:28px;}
.sx-hero-meta span{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:#AEBEDD;}
.sx-hero-meta svg{color:#5EE7D6;}

/* Landing body / how it works */
.sx-landing-body{max-width:1180px;margin:0 auto;padding:clamp(32px,5vw,52px) clamp(18px,5vw,56px) 56px;}
.sx-howitworks{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:44px;}
@media(max-width:780px){.sx-howitworks{grid-template-columns:1fr;}}
.sx-how-step{display:flex;gap:14px;padding:20px;background:var(--sx-panel);border:1px solid var(--sx-border);border-radius:var(--sx-radius);}
.sx-how-num{font-family:'Inter Tight',sans-serif;font-weight:700;font-size:13px;color:var(--sx-royal);
  background:color-mix(in srgb,var(--sx-royal) 10%,transparent);width:30px;height:30px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;flex:none;}
.sx-how-step h3{font-size:14.5px;font-weight:600;margin-bottom:5px;}
.sx-how-step p{font-size:13px;color:var(--sx-muted);line-height:1.5;margin:0;}

.sx-track-label{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sx-muted);margin-bottom:12px;}
.sx-tracks{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:680px){.sx-tracks{grid-template-columns:1fr;}}
.sx-track{display:flex;align-items:center;gap:16px;text-align:left;
  background:var(--sx-panel);border:1.5px solid var(--sx-border);
  border-radius:var(--sx-radius);padding:20px;color:var(--sx-ink);
  transition:border-color .16s ease,box-shadow .16s ease,transform .12s ease;}
.sx-track:hover{border-color:var(--sx-royal);box-shadow:var(--sx-shadow);transform:translateY(-2px);}
.sx-track-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;flex:none;
  background:linear-gradient(135deg,var(--sx-royal-deep),var(--sx-royal));color:#fff;}
.sx-track-icon--teal{background:linear-gradient(135deg,#0E7C6B,#3B7DD8);}
.sx-track-body{display:flex;flex-direction:column;gap:3px;flex:1;}
.sx-track-title{font-family:'Inter Tight';font-weight:700;font-size:17px;}
.sx-track-desc{font-size:13px;color:var(--sx-muted);}
.sx-track-tags{font-size:10.5px;font-weight:600;letter-spacing:.04em;color:var(--sx-royal);margin-top:4px;}
.sx-track-arrow{color:var(--sx-muted);flex:none;transition:transform .18s ease;}
.sx-track:hover .sx-track-arrow{transform:translateX(3px);color:var(--sx-royal);}

/* Shared card */
.sx-card{background:var(--sx-panel);border:1px solid var(--sx-border);border-radius:var(--sx-radius);box-shadow:var(--sx-shadow);}

/* Quiz */
.sx-quiz{max-width:760px;margin:0 auto;padding:clamp(24px,4vw,40px) clamp(18px,5vw,32px) 56px;}
.sx-quiz-head{margin-bottom:20px;}
.sx-quiz-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;}
.sx-quiz-track{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:var(--sx-royal);}
.sx-quiz-count{font-size:12px;color:var(--sx-muted);font-weight:500;}
.sx-progress{height:5px;background:var(--sx-border);border-radius:100px;overflow:hidden;}
.sx-progress-fill{height:100%;border-radius:100px;background:linear-gradient(90deg,var(--sx-royal-deep),var(--sx-royal));transition:width .4s cubic-bezier(.4,0,.2,1);}
.sx-question{padding:clamp(24px,4vw,34px);animation:sxRise .35s ease both;}
@keyframes sxRise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.sx-qbadge{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.04em;
  color:var(--sx-royal);background:color-mix(in srgb,var(--sx-royal) 10%,transparent);
  border:1px solid color-mix(in srgb,var(--sx-royal) 22%,transparent);padding:5px 10px;border-radius:100px;}
.sx-qtext{font-size:clamp(18px,2.2vw,22px);line-height:1.32;margin:16px 0 22px;font-weight:600;}
.sx-options{display:flex;flex-direction:column;gap:10px;}
.sx-option{display:flex;align-items:center;gap:13px;text-align:left;width:100%;
  background:var(--sx-bg-soft);border:1.5px solid var(--sx-border);border-radius:10px;
  padding:15px 16px;color:var(--sx-ink);transition:border-color .16s ease,background .16s ease;}
.sx-option:hover{border-color:var(--sx-royal);}
.sx-option.is-active{border-color:var(--sx-royal);background:color-mix(in srgb,var(--sx-royal) 6%,var(--sx-panel));}
.sx-radio{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;flex:none;
  border:2px solid var(--sx-border);color:var(--sx-royal);}
.sx-option.is-active .sx-radio{border-color:var(--sx-royal);background:color-mix(in srgb,var(--sx-royal) 12%,transparent);}
.sx-option-label{flex:1;font-size:14px;font-weight:500;}
.sx-option-tag{font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:100px;flex:none;letter-spacing:.02em;}
.sx-option[data-tone="high"] .sx-option-tag{color:var(--sx-high);background:color-mix(in srgb,var(--sx-high) 12%,transparent);}
.sx-option[data-tone="mid"] .sx-option-tag{color:var(--sx-mid);background:color-mix(in srgb,var(--sx-mid) 14%,transparent);}
.sx-option[data-tone="low"] .sx-option-tag{color:var(--sx-low);background:color-mix(in srgb,var(--sx-low) 12%,transparent);}
.sx-nav{display:flex;justify-content:space-between;margin-top:22px;gap:12px;}

/* Buttons */
.sx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:14.5px;
  padding:12px 20px;border-radius:8px;border:1px solid transparent;transition:transform .12s ease,box-shadow .16s ease,opacity .16s ease;}
.sx-btn:disabled{opacity:.4;cursor:not-allowed;}
.sx-btn-primary{background:linear-gradient(120deg,var(--sx-royal-deep),var(--sx-royal));color:#fff;box-shadow:0 8px 18px color-mix(in srgb,var(--sx-royal) 30%,transparent);}
.sx-btn-primary:not(:disabled):hover{opacity:.92;transform:translateY(-1px);}
.sx-btn-ghost{background:var(--sx-panel);border-color:var(--sx-border);color:var(--sx-ink);}
.sx-btn-ghost:hover{border-color:var(--sx-royal);color:var(--sx-royal);}
.sx-btn-full{width:100%;margin-top:6px;}

/* Calculating */
.sx-calc{max-width:520px;margin:0 auto;padding:80px 24px 120px;text-align:center;}
.sx-calc-ring{width:72px;height:72px;margin:0 auto 24px;border-radius:50%;display:grid;place-items:center;
  color:var(--sx-royal);background:conic-gradient(from 0deg,var(--sx-royal-deep),var(--sx-cyan),var(--sx-royal-deep));
  -webkit-mask:radial-gradient(circle 27px at center,transparent 96%,#000 97%);mask:radial-gradient(circle 27px at center,transparent 96%,#000 97%);animation:sxRot 1.4s linear infinite;}
@keyframes sxRot{to{transform:rotate(360deg);}}
.sx-spin{animation:sxRot 1s linear infinite;}
.sx-calc-title{font-size:21px;margin-bottom:10px;font-weight:700;}
.sx-calc-sub{color:var(--sx-muted);font-size:14.5px;}
@media(prefers-reduced-motion:reduce){.sx-calc-ring,.sx-spin{animation:none;}}

/* Report */
.sx-report{max-width:960px;margin:0 auto;padding:clamp(8px,3vw,20px) clamp(18px,5vw,32px) 64px;}
.sx-report-eyebrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.sx-report-eyebrow>span{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;
  letter-spacing:.04em;text-transform:uppercase;color:var(--sx-muted);}
.sx-restart{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--sx-royal);
  background:none;border:none;}
.sx-report-meta{font-size:12px;color:var(--sx-muted);margin-bottom:18px;}
.sx-report-hero{display:grid;grid-template-columns:1fr 1.3fr;gap:16px;margin-bottom:16px;}
@media(max-width:720px){.sx-report-hero{grid-template-columns:1fr;}}

.sx-score{padding:24px;display:flex;flex-direction:column;position:relative;overflow:hidden;}
.sx-score::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;}
.sx-tone-high::before{background:var(--sx-high);}
.sx-tone-mid::before{background:var(--sx-mid);}
.sx-tone-low::before{background:var(--sx-low);}
.sx-score-top{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px;}
.sx-tone-high .sx-score-top{color:var(--sx-high);}
.sx-tone-mid .sx-score-top{color:var(--sx-mid);}
.sx-tone-low .sx-score-top{color:var(--sx-low);}
.sx-score-num{font-family:'Inter Tight';font-weight:800;font-size:52px;line-height:1;margin:16px 0 4px;color:var(--sx-ink);
  font-variant-numeric:tabular-nums;}
.sx-score-den{font-size:20px;color:var(--sx-muted);font-weight:600;}
.sx-score-bar{height:7px;background:var(--sx-border);border-radius:100px;overflow:hidden;margin:8px 0 12px;}
.sx-score-bar-fill{height:100%;border-radius:100px;transition:width 1.1s cubic-bezier(.2,.7,.2,1);}
.sx-tone-high .sx-score-bar-fill{background:linear-gradient(90deg,var(--sx-mid),var(--sx-high));}
.sx-tone-mid .sx-score-bar-fill{background:linear-gradient(90deg,var(--sx-royal),var(--sx-mid));}
.sx-tone-low .sx-score-bar-fill{background:linear-gradient(90deg,var(--sx-cyan),var(--sx-low));}
.sx-score-note{font-size:12.5px;color:var(--sx-muted);margin:0;}

.sx-exposure{padding:24px;display:flex;flex-direction:column;}
.sx-exposure-label{font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sx-muted);}
.sx-exposure-num{font-family:'Inter Tight';font-weight:800;font-size:clamp(32px,5vw,46px);line-height:1.05;
  margin:10px 0 2px;color:var(--sx-royal-deep);font-variant-numeric:tabular-nums;}
.sx-exposure-est{font-size:12px;color:var(--sx-muted);}
.sx-lineitems{margin-top:16px;border-top:1px solid var(--sx-border);padding-top:12px;display:flex;flex-direction:column;gap:9px;}
.sx-lineitem{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13.5px;}
.sx-lineitem-l{display:inline-flex;align-items:center;gap:8px;color:var(--sx-muted);}
.sx-lineitem-l svg{color:var(--sx-royal);flex:none;}
.sx-lineitem-v{font-family:'Inter Tight';font-weight:700;font-size:13.5px;color:var(--sx-ink);font-variant-numeric:tabular-nums;}

/* Radar */
.sx-radar-card{padding:22px;margin-bottom:16px;}
.sx-card-head{margin-bottom:8px;}
.sx-card-head h3{font-size:17px;font-weight:700;}
.sx-card-sub{font-size:12.5px;color:var(--sx-muted);}
.sx-radar-wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;align-items:center;}
@media(max-width:680px){.sx-radar-wrap{grid-template-columns:1fr;}}
.sx-radar-chart{height:280px;width:100%;}
.sx-radar-legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;}
.sx-radar-legend li{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:11px 13px;border-radius:9px;background:var(--sx-bg-soft);border:1px solid var(--sx-border);}
.sx-legend-l{display:inline-flex;align-items:center;gap:9px;font-size:13px;font-weight:500;}
.sx-legend-v{font-family:'Inter Tight';font-weight:700;font-size:14.5px;font-variant-numeric:tabular-nums;}
.sx-radar-legend li[data-tone="high"] .sx-legend-v{color:var(--sx-high);}
.sx-radar-legend li[data-tone="high"] .sx-legend-l svg{color:var(--sx-high);}
.sx-radar-legend li[data-tone="mid"] .sx-legend-v{color:var(--sx-mid);}
.sx-radar-legend li[data-tone="mid"] .sx-legend-l svg{color:var(--sx-mid);}
.sx-radar-legend li[data-tone="low"] .sx-legend-v{color:var(--sx-low);}
.sx-radar-legend li[data-tone="low"] .sx-legend-l svg{color:var(--sx-low);}

/* Gaps */
.sx-gaps-head{margin:26px 0 14px;}
.sx-gaps-head h3{font-size:19px;font-weight:700;}
.sx-gaps-head p{color:var(--sx-muted);font-size:13.5px;margin:6px 0 0;max-width:62ch;}
.sx-gaps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media(max-width:780px){.sx-gaps{grid-template-columns:1fr;}}
.sx-gap{padding:18px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden;}
.sx-gap::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;}
.sx-gap-high::before{background:var(--sx-high);}
.sx-gap-mid::before{background:var(--sx-mid);}
.sx-gap-top{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.sx-gap-badge{font-size:10px;font-weight:600;letter-spacing:.03em;color:var(--sx-muted);}
.sx-gap-sev{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:100px;white-space:nowrap;}
.sx-gap-sev-high{color:var(--sx-high);background:color-mix(in srgb,var(--sx-high) 12%,transparent);}
.sx-gap-sev-mid{color:var(--sx-mid);background:color-mix(in srgb,var(--sx-mid) 14%,transparent);}
.sx-gap-concern{display:flex;gap:8px;font-size:13.5px;font-weight:600;line-height:1.4;}
.sx-gap-concern svg{color:var(--sx-muted);flex:none;margin-top:3px;}
.sx-gap-fix{background:var(--sx-bg-soft);border:1px solid var(--sx-border);border-radius:9px;padding:12px;}
.sx-gap-fix-label{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.03em;
  text-transform:uppercase;color:var(--sx-low);margin-bottom:6px;}
.sx-gap-fix p{margin:0;font-size:12.5px;color:var(--sx-ink);line-height:1.45;}
.sx-gap-clean{grid-column:1/-1;flex-direction:row;align-items:center;gap:16px;}
.sx-gap-clean svg{color:var(--sx-low);flex:none;}
.sx-gap-clean h4{font-size:15.5px;margin-bottom:4px;}
.sx-gap-clean p{margin:0;color:var(--sx-muted);font-size:13.5px;}

/* CTA + form */
.sx-cta{margin-top:26px;padding:clamp(22px,4vw,32px);display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:start;}
@media(max-width:760px){.sx-cta{grid-template-columns:1fr;}}
.sx-cta-eyebrow{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sx-royal);margin-bottom:8px;}
.sx-cta-copy h3{font-size:21px;font-weight:700;line-height:1.25;}
.sx-cta-copy p{color:var(--sx-muted);font-size:14px;margin:12px 0 0;}
.sx-cta-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
.sx-cta-chips span{font-size:12.5px;color:var(--sx-muted);background:var(--sx-bg-soft);border:1px solid var(--sx-border);
  padding:8px 12px;border-radius:8px;}
.sx-cta-chips strong{color:var(--sx-royal);font-family:'Inter Tight';font-size:13px;margin-left:4px;font-variant-numeric:tabular-nums;}
.sx-form{display:flex;flex-direction:column;gap:11px;}
.sx-form-row{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
@media(max-width:420px){.sx-form-row{grid-template-columns:1fr;}}
.sx-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--sx-muted);}
.sx-form input{font-family:inherit;font-size:14px;color:var(--sx-ink);background:var(--sx-bg);
  border:1.5px solid var(--sx-border);border-radius:8px;padding:11px 13px;transition:border-color .15s ease;}
.sx-form input:focus{outline:none;border-color:var(--sx-royal);}
.sx-form input::placeholder{color:color-mix(in srgb,var(--sx-muted) 70%,transparent);}
.sx-form-error{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--sx-high);font-weight:600;}
.sx-form-fine{font-size:11.5px;color:var(--sx-muted);margin:2px 0 0;}
.sx-cta-done{grid-template-columns:1fr;text-align:center;justify-items:center;padding:44px 24px;}
.sx-cta-done svg{color:var(--sx-low);}
.sx-cta-done h3{font-size:20px;margin:14px 0 8px;}
.sx-cta-done p{color:var(--sx-muted);max-width:46ch;margin:0;}

/* Footer */
.sx-footer{max-width:960px;margin:0 auto;padding:22px clamp(18px,5vw,32px) 48px;
  display:flex;flex-direction:column;gap:12px;}
.sx-footer>div:first-child{font-size:11.5px;color:var(--sx-muted);line-height:1.55;
  border-top:1px solid var(--sx-border);padding-top:18px;max-width:80ch;}
.sx-footer-legal{font-size:11px;color:var(--sx-muted);line-height:1.6;
  border-top:1px solid var(--sx-border);padding-top:14px;max-width:80ch;}
.sx-footer-brand{font-size:12px;color:var(--sx-muted);font-weight:600;}
.sx-footer-brand a{color:var(--sx-royal);text-decoration:none;}
.sx-footer-brand a:hover{text-decoration:underline;}
`;
