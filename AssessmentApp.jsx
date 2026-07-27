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
   Synthetix — AI Governance Readiness Assessment
   Single-page assessment for US BFSI & Healthcare executives.

   Deployable to Vercel at go.synthetixlabs.ai/governance-assessment/
   Portable: all styling lives in the injected <style> block (CSS variables),
   so this component drops into any React/Next.js page unchanged.

   ---------------------------------------------------------------------------
   INTEGRATION POINTS (search for these tags):
     [WEBHOOK]  -> set WEBHOOK_URL to your Zapier/HubSpot/REST endpoint.
     [HUBSPOT]  -> paste your HubSpot embed code where marked, or keep the
                   native form which posts the same fields incl. hidden
                   Risk Score + Estimated Exposure.
   ========================================================================== */

/* --------------------------------------------------------------------------
   [WEBHOOK] Background telemetry endpoint — fires for EVERY completed
   assessment, independent of whether the visitor submits the demo form.
   Leave "" to no-op safely (logs to console instead). In production, point
   this at a Zapier catch-hook or an internal REST route.
   Payload shape: { industry, answers, riskScore, calculatedExposureUSD, timestamp }
   -------------------------------------------------------------------------- */
const WEBHOOK_URL = "";

/* [HUBSPOT] Portal + form confirmed live in your connected HubSpot account. */
const HUBSPOT = { portalId: "40221584", formId: "157c5b06-decf-408e-bf78-e44bcb1d1bb0" };

/* [HUBSPOT-LOG] Option B — a silent submission log capturing EVERY completed
   assessment, identified or not, before the demo CTA is ever shown.
   Create a second HubSpot form (e.g. "AI Governance Assessment — Submission Log")
   with these hidden fields, then paste its GUID below:
     industry            (single-line text)
     answers_json         (multi-line text)   — full Q&A as JSON
     report_summary        (multi-line text)   — human-readable Q&A + score
     risk_score            (number)
     estimated_exposure_usd (number)
   Leave "" to skip — this is fully independent of WEBHOOK_URL and HUBSPOT.formId. */
const HUBSPOT_LOG_FORM_ID = "41fc2ff6-cce4-4728-aab6-8139d1acdc39";

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
   Each option carries a `fix`: the Synthetix capability that closes the gap,
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
    font.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Urbanist:wght@400;500;600;700;800&family=Orbitron:wght@600;700;800&display=swap";
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

    // [WEBHOOK] Fire background telemetry for EVERY completed assessment
    // (not just demo requests). Safe no-op when WEBHOOK_URL is "" — falls back
    // to a console log so nothing is silently lost during setup.
    const payload = {
      industry,
      answers,
      riskScore: r.riskScore,
      calculatedExposureUSD: r.totalExposure,
      timestamp: new Date().toISOString(),
    };
    if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn("Assessment webhook failed:", e));
    } else {
      console.log("[assessment payload]", payload);
    }

    // [HUBSPOT-LOG] Option B — silent submission log, independent of the demo
    // form. Fires for every completed assessment, before the CTA is even shown.
    if (HUBSPOT_LOG_FORM_ID) {
      const { json, summaryText } = serializeAnswers(industry, answers, r);
      const logUrl = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT.portalId}/${HUBSPOT_LOG_FORM_ID}`;
      const logBody = {
        fields: [
          { name: "industry", value: industry === "BFSI" ? "BFSI" : "Healthcare / Life Sciences" },
          { name: "answers_jason", value: json }, // NOTE: real HubSpot property is "answers_jason" (typo, kept to match)
          { name: "report_summary", value: summaryText },
          { name: "risk_score", value: String(r.riskScore) },
          { name: "estimated_exposure_usd", value: String(r.totalExposure) },
        ],
        context: { pageName: "AI Governance Readiness Assessment — Submission Log" },
      };
      fetch(logUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(logBody) })
        .catch((e) => console.warn("HubSpot submission log failed:", e));
    }

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
          <span className="sx-wordmark">SYNTHETIX<span className="sx-labs"> LABS</span></span>
        </div>
        <div className="sx-topbar-right">
          <span className="sx-topbar-tag">Governed Agentic Execution</span>
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
        <div className="sx-footer-brand">© {new Date().getFullYear()} Synthetix Labs · The guardrail layer for agentic AI</div>
      </footer>
    </div>
  );
}

/* ==========================================================================
   Landing
   ========================================================================== */
function Landing({ onStart }) {
  return (
    <main className="sx-hero">
      <div className="sx-hero-inner">
        <span className="sx-eyebrow"><Fingerprint size={13} /> US Regulatory Readiness · BFSI &amp; Healthcare</span>
        <h1 className="sx-h1">
          Is your enterprise AI deployment-ready for
          <span className="sx-h1-accent"> SEC, FINRA &amp; HIPAA</span> scrutiny?
        </h1>
        <p className="sx-sub">
          Measure your agentic AI governance posture against US enforcement standards.
          Surface the operational and financial liabilities of ungoverned agents —
          before regulators do.
        </p>

        <div className="sx-track-label">Choose your track to begin</div>
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

        <div className="sx-hero-meta">
          <span><CheckCircle2 size={14} /> 5 scenarios · under 3 minutes</span>
          <span><CheckCircle2 size={14} /> Executive exposure report</span>
          <span><CheckCircle2 size={14} /> No sign-up to see your score</span>
        </div>
      </div>
    </main>
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
          <span className="sx-quiz-track"><Icon size={14} /> {trackName}</span>
          <span className="sx-quiz-count">Scenario {step + 1} of {qs.length}</span>
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
          {step === qs.length - 1 ? "Generate assessment" : "Next"}
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
      <h2 className="sx-calc-title">Calculating regulatory &amp; financial exposure…</h2>
      <p className="sx-calc-sub">Scoring your posture against US enforcement standards and modeling estimated annual exposure.</p>
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

  return (
    <main className="sx-report">
      <div className="sx-report-eyebrow">
        <span><Gauge size={13} /> Executive assessment · {trackName}</span>
        <button className="sx-restart" onClick={onRestart}><RotateCcw size={13} /> Restart</button>
      </div>

      {/* Score + exposure hero row */}
      <div className="sx-report-hero">
        <div className={`sx-card sx-score sx-tone-${r.posture.tone}`}>
          <div className="sx-score-top">
            {r.posture.tone === "high" ? <ShieldAlert size={18} /> : r.posture.tone === "mid" ? <Shield size={18} /> : <ShieldCheck size={18} />}
            <span>{r.posture.label}</span>
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
          <h3>Risk breakdown by exposure category</h3>
          <span className="sx-card-sub">Normalized 0–100 · higher is more exposed</span>
        </div>
        <div className="sx-radar-wrap">
          <div className="sx-radar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={r.radar} outerRadius="72%">
                <PolarGrid stroke="var(--sx-border)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "var(--sx-muted)", fontSize: 11, fontFamily: "Urbanist" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="var(--sx-royal)" fill="var(--sx-royal)" fillOpacity={0.24} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "var(--sx-panel)", border: "1px solid var(--sx-border)", borderRadius: 10, fontFamily: "Urbanist", fontSize: 12, color: "var(--sx-ink)" }}
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

      {/* Gaps -> Synthetix guardrails */}
      <div className="sx-gaps-head">
        <h3>Where Synthetix closes your governance gaps</h3>
        <p>The three highest-exposure findings from your answers, mapped to the guardrails that address them.</p>
      </div>
      <div className="sx-gaps">
        {r.gaps.length === 0 && (
          <div className="sx-card sx-gap sx-gap-clean">
            <ShieldCheck size={22} />
            <div>
              <h4>Strong baseline posture</h4>
              <p>Your answers indicate mature controls. Synthetix hardens and continuously proves that posture as your agent footprint scales.</p>
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
                  <AlertTriangle size={12} /> {g.severity === "high" ? "High" : "Moderate"}
                </span>
              </div>
              <div className="sx-gap-concern"><GI size={15} /> <span>{g.concern}</span></div>
              <div className="sx-gap-fix">
                <span className="sx-gap-fix-label"><ShieldCheck size={13} /> Synthetix guardrail</span>
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
   Lead capture — native form that mirrors the HubSpot fields.
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

    // Full field set incl. hidden risk parameters from React state.
    // [OPTION A] answers_json / report_summary tie the complete Q&A and the
    // exact report shown to this person to their contact record — not just
    // the final score, so "what did they answer / what did we tell them"
    // is fully reconstructable later.
    //
    // IMPORTANT: field names below must exactly match the internal property
    // names on your HubSpot form. firstname/lastname/email/company/jobtitle
    // are HubSpot's standard defaults. assessment_industry, risk_score,
    // estimated_exposure_usd, answers_json and report_summary are custom —
    // if you named any of them differently when creating the form/properties,
    // update the keys below to match.
    const { json: answersJson, summaryText } = serializeAnswers(industry, answers, results);
    const fields = {
      firstname: form.firstName,
      lastname: form.lastName,
      company: form.company,
      email: form.email,
      jobtitle: form.jobTitle,
      assessment_industry: industry === "BFSI" ? "BFSI" : "Healthcare / Life Sciences",
      risk_score: riskScore,                      // hidden
      estimated_exposure_usd: exposure,           // hidden
      answers_jason: answersJson,                 // hidden — full Q&A as JSON. NOTE: HubSpot property is "answers_jason" (typo, kept to match)
      report_summary: summaryText,                // hidden — human-readable report sent, needs adding to the form
    };

    /* [HUBSPOT] Option A — official embed:
       Replace this native form with HubSpot's embed script and map
       risk_score / estimated_exposure_usd to hidden form fields, e.g.:
         hbspt.forms.create({
           portalId: HUBSPOT.portalId, formId: HUBSPOT.formId, target: "#sx-hs-form",
           onFormReady($form){ $form.querySelector('[name=risk_score]').value = riskScore;
                               $form.querySelector('[name=estimated_exposure_usd]').value = exposure; }
         });

       [HUBSPOT] Option B — Forms API POST (used below):
       https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formId}
    */
    try {
      const url = `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT.portalId}/${HUBSPOT.formId}`;
      const body = {
        fields: Object.entries(fields).map(([name, value]) => ({ name, value: String(value) })),
        context: { pageName: "AI Governance Readiness Assessment" },
      };
      if (HUBSPOT.portalId && HUBSPOT.formId) {
        await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        console.log("[demo request]", fields); // preview mode — no live portal/form configured
      }
      setSent(true);
    } catch (e) {
      console.warn("HubSpot submit failed:", e);
      setSent(true); // optimistic; telemetry already logged upstream
    }
  };

  if (sent) {
    return (
      <div className="sx-card sx-cta sx-cta-done">
        <ShieldCheck size={30} />
        <h3>Request received</h3>
        <p>A Synthetix governance specialist will reach out to walk through your exposure report and a tailored guardrail plan.</p>
      </div>
    );
  }

  return (
    <div className="sx-card sx-cta">
      <div className="sx-cta-copy">
        <h3>Mitigate your enterprise AI risk — request a Synthetix demo</h3>
        <p>See how the guardrail layer enforces execution boundaries, captures immutable audit trails, and proves compliance across every agent — with your exposure report in hand.</p>
        <div className="sx-cta-chips">
          <span>Risk score <strong>{riskScore}/100</strong></span>
          <span>Est. exposure <strong>{usd(exposure)}</strong></span>
        </div>
      </div>

      {/* [HUBSPOT] Swap this block for <div id="sx-hs-form" /> when using the embed. */}
      <div className="sx-form" id="sx-hs-form">
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
          Request my demo <ArrowRight size={16} />
        </button>
        <p className="sx-form-fine">Your risk score and estimated exposure are attached automatically. No spam — a specialist, not a sequence.</p>
      </div>
    </div>
  );
}

/* ==========================================================================
   Styles — brand tokens via CSS variables (light default, dark toggle).
   ========================================================================== */
const CSS = `
.sx-root{
  --sx-bg:#FFFFFF; --sx-bg-soft:#F4F6FC; --sx-panel:#FFFFFF; --sx-border:#E3E8F3;
  --sx-ink:#0B1533; --sx-muted:#5B6B8C; --sx-royal:#1E39E0; --sx-royal-deep:#1226A6;
  --sx-cyan:#0FBFB2; --sx-hero:#0A1230; --sx-hero-2:#111C46;
  --sx-high:#E23D4B; --sx-mid:#E08A1E; --sx-low:#12A06E;
  --sx-shadow:0 1px 2px rgba(11,21,51,.04),0 12px 32px rgba(11,21,51,.06);
  --sx-radius:18px;
  font-family:'Urbanist',system-ui,sans-serif; color:var(--sx-ink);
  background:var(--sx-bg-soft); min-height:100vh; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.sx-root[data-theme="dark"]{
  --sx-bg:#070B1C; --sx-bg-soft:#0A0F26; --sx-panel:#0F1836; --sx-border:#1F2C54;
  --sx-ink:#EBF0FF; --sx-muted:#93A3CB; --sx-royal:#5A78FF; --sx-royal-deep:#3A57E8;
  --sx-cyan:#2BE6D6; --sx-hero:#05091A; --sx-hero-2:#0C1533;
  --sx-shadow:0 1px 2px rgba(0,0,0,.3),0 16px 40px rgba(0,0,0,.35);
}
.sx-root *{box-sizing:border-box;}
.sx-root h1,.sx-root h2,.sx-root h3,.sx-root h4{font-family:'Space Grotesk',sans-serif;margin:0;letter-spacing:-.01em;}
.sx-root button{font-family:inherit;cursor:pointer;}
.sx-root :focus-visible{outline:2px solid var(--sx-royal);outline-offset:2px;border-radius:8px;}

/* Topbar */
.sx-topbar{display:flex;align-items:center;justify-content:space-between;
  padding:16px clamp(18px,5vw,56px);max-width:1180px;margin:0 auto;}
.sx-brand{display:flex;align-items:center;gap:10px;}
.sx-logo{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;
  background:linear-gradient(135deg,var(--sx-royal),var(--sx-cyan));color:#fff;}
.sx-wordmark{font-family:'Orbitron',sans-serif;font-weight:700;font-size:15px;letter-spacing:.14em;color:var(--sx-ink);}
.sx-labs{color:var(--sx-royal);}
.sx-topbar-right{display:flex;align-items:center;gap:14px;}
.sx-topbar-tag{font-size:12px;color:var(--sx-muted);font-weight:600;letter-spacing:.02em;}
.sx-theme{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;
  border:1px solid var(--sx-border);background:var(--sx-panel);color:var(--sx-ink);}
@media(max-width:560px){.sx-topbar-tag{display:none;}}

/* Hero */
.sx-hero{max-width:1180px;margin:0 auto;padding:clamp(28px,6vw,64px) clamp(18px,5vw,56px) 60px;}
.sx-hero-inner{
  background:radial-gradient(120% 130% at 88% -8%,var(--sx-hero-2) 0%,var(--sx-hero) 58%);
  border-radius:28px;padding:clamp(30px,5vw,64px);color:#EAF0FF;position:relative;overflow:hidden;
  box-shadow:0 30px 70px rgba(10,18,48,.28);
}
.sx-hero-inner::after{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(60% 60% at 92% 10%,rgba(15,191,178,.16),transparent 60%);}
.sx-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;color:#8FE9E0;
  background:rgba(15,191,178,.12);border:1px solid rgba(15,191,178,.28);
  padding:6px 12px;border-radius:999px;}
.sx-h1{font-size:clamp(30px,5vw,52px);line-height:1.05;margin:20px 0 0;max-width:16ch;font-weight:600;}
.sx-h1-accent{background:linear-gradient(100deg,#6E8BFF,#2BE6D6);-webkit-background-clip:text;background-clip:text;color:transparent;}
.sx-sub{margin:18px 0 0;max-width:60ch;color:#B8C4E6;font-size:clamp(15px,1.6vw,18px);}
.sx-track-label{margin-top:34px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7E8DB8;}
.sx-tracks{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px;position:relative;z-index:1;}
@media(max-width:680px){.sx-tracks{grid-template-columns:1fr;}}
.sx-track{display:flex;align-items:center;gap:16px;text-align:left;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);
  border-radius:16px;padding:20px;color:#EAF0FF;transition:transform .18s ease,border-color .18s ease,background .18s ease;}
.sx-track:hover{transform:translateY(-3px);border-color:rgba(110,139,255,.55);background:rgba(110,139,255,.1);}
.sx-track-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:12px;flex:none;
  background:linear-gradient(135deg,var(--sx-royal),#6E8BFF);color:#fff;}
.sx-track-icon--teal{background:linear-gradient(135deg,#0FBFB2,#2BE6D6);}
.sx-track-body{display:flex;flex-direction:column;gap:3px;flex:1;}
.sx-track-title{font-family:'Space Grotesk';font-weight:600;font-size:18px;}
.sx-track-desc{font-size:13px;color:#B8C4E6;}
.sx-track-tags{font-family:'Orbitron';font-size:10px;letter-spacing:.06em;color:#7E8DB8;margin-top:4px;}
.sx-track-arrow{color:#7E8DBF;flex:none;transition:transform .18s ease;}
.sx-track:hover .sx-track-arrow{transform:translateX(3px);color:#fff;}
.sx-hero-meta{display:flex;flex-wrap:wrap;gap:18px;margin-top:26px;position:relative;z-index:1;}
.sx-hero-meta span{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:#9FB0D8;}
.sx-hero-meta svg{color:#2BE6D6;}

/* Shared card */
.sx-card{background:var(--sx-panel);border:1px solid var(--sx-border);border-radius:var(--sx-radius);box-shadow:var(--sx-shadow);}

/* Quiz */
.sx-quiz{max-width:760px;margin:0 auto;padding:clamp(8px,3vw,24px) clamp(18px,5vw,32px) 56px;}
.sx-quiz-head{margin-bottom:20px;}
.sx-quiz-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.sx-quiz-track{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:var(--sx-royal);}
.sx-quiz-count{font-family:'Orbitron';font-size:11px;letter-spacing:.06em;color:var(--sx-muted);}
.sx-progress{height:6px;background:var(--sx-border);border-radius:999px;overflow:hidden;}
.sx-progress-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sx-royal),var(--sx-cyan));transition:width .4s cubic-bezier(.4,0,.2,1);}
.sx-question{padding:clamp(22px,4vw,34px);animation:sxRise .35s ease both;}
@keyframes sxRise{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.sx-qbadge{display:inline-block;font-family:'Orbitron';font-size:10.5px;letter-spacing:.08em;
  color:var(--sx-royal);background:color-mix(in srgb,var(--sx-royal) 10%,transparent);
  border:1px solid color-mix(in srgb,var(--sx-royal) 24%,transparent);padding:5px 10px;border-radius:999px;}
.sx-qtext{font-size:clamp(18px,2.4vw,23px);line-height:1.3;margin:16px 0 22px;font-weight:600;}
.sx-options{display:flex;flex-direction:column;gap:10px;}
.sx-option{display:flex;align-items:center;gap:13px;text-align:left;width:100%;
  background:var(--sx-bg-soft);border:1.5px solid var(--sx-border);border-radius:13px;
  padding:15px 16px;color:var(--sx-ink);transition:border-color .16s ease,background .16s ease,transform .12s ease;}
.sx-option:hover{border-color:var(--sx-royal);transform:translateX(2px);}
.sx-option.is-active{border-color:var(--sx-royal);background:color-mix(in srgb,var(--sx-royal) 7%,var(--sx-panel));}
.sx-radio{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;flex:none;
  border:2px solid var(--sx-border);color:var(--sx-royal);}
.sx-option.is-active .sx-radio{border-color:var(--sx-royal);background:color-mix(in srgb,var(--sx-royal) 14%,transparent);}
.sx-option-label{flex:1;font-size:14.5px;font-weight:500;}
.sx-option-tag{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;flex:none;letter-spacing:.02em;}
.sx-option[data-tone="high"] .sx-option-tag{color:var(--sx-high);background:color-mix(in srgb,var(--sx-high) 12%,transparent);}
.sx-option[data-tone="mid"] .sx-option-tag{color:var(--sx-mid);background:color-mix(in srgb,var(--sx-mid) 14%,transparent);}
.sx-option[data-tone="low"] .sx-option-tag{color:var(--sx-low);background:color-mix(in srgb,var(--sx-low) 12%,transparent);}
.sx-nav{display:flex;justify-content:space-between;margin-top:22px;gap:12px;}

/* Buttons */
.sx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:14.5px;
  padding:13px 22px;border-radius:12px;border:1px solid transparent;transition:transform .12s ease,box-shadow .16s ease,opacity .16s ease;}
.sx-btn:disabled{opacity:.4;cursor:not-allowed;}
.sx-btn-primary{background:linear-gradient(120deg,var(--sx-royal),var(--sx-royal-deep));color:#fff;box-shadow:0 8px 20px color-mix(in srgb,var(--sx-royal) 32%,transparent);}
.sx-btn-primary:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 12px 26px color-mix(in srgb,var(--sx-royal) 40%,transparent);}
.sx-btn-ghost{background:var(--sx-panel);border-color:var(--sx-border);color:var(--sx-ink);}
.sx-btn-ghost:hover{border-color:var(--sx-royal);color:var(--sx-royal);}
.sx-btn-full{width:100%;margin-top:6px;}

/* Calculating */
.sx-calc{max-width:520px;margin:0 auto;padding:80px 24px 120px;text-align:center;}
.sx-calc-ring{width:78px;height:78px;margin:0 auto 24px;border-radius:50%;display:grid;place-items:center;
  color:var(--sx-royal);background:conic-gradient(from 0deg,var(--sx-royal),var(--sx-cyan),var(--sx-royal));
  -webkit-mask:radial-gradient(circle 30px at center,transparent 96%,#000 97%);mask:radial-gradient(circle 30px at center,transparent 96%,#000 97%);animation:sxRot 1.4s linear infinite;}
@keyframes sxRot{to{transform:rotate(360deg);}}
.sx-spin{animation:sxRot 1s linear infinite;}
.sx-calc-title{font-size:22px;margin-bottom:10px;font-weight:600;}
.sx-calc-sub{color:var(--sx-muted);font-size:15px;}
@media(prefers-reduced-motion:reduce){.sx-calc-ring,.sx-spin{animation:none;}}

/* Report */
.sx-report{max-width:960px;margin:0 auto;padding:clamp(8px,3vw,20px) clamp(18px,5vw,32px) 64px;}
.sx-report-eyebrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.sx-report-eyebrow>span{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;color:var(--sx-muted);}
.sx-restart{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--sx-royal);
  background:none;border:none;}
.sx-report-hero{display:grid;grid-template-columns:1fr 1.3fr;gap:16px;margin-bottom:16px;}
@media(max-width:720px){.sx-report-hero{grid-template-columns:1fr;}}

.sx-score{padding:24px;display:flex;flex-direction:column;position:relative;overflow:hidden;}
.sx-score::before{content:"";position:absolute;inset:0 auto 0 0;width:5px;}
.sx-tone-high::before{background:var(--sx-high);}
.sx-tone-mid::before{background:var(--sx-mid);}
.sx-tone-low::before{background:var(--sx-low);}
.sx-score-top{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:14px;}
.sx-tone-high .sx-score-top{color:var(--sx-high);}
.sx-tone-mid .sx-score-top{color:var(--sx-mid);}
.sx-tone-low .sx-score-top{color:var(--sx-low);}
.sx-score-num{font-family:'Orbitron';font-weight:800;font-size:60px;line-height:1;margin:14px 0 4px;color:var(--sx-ink);}
.sx-score-den{font-size:22px;color:var(--sx-muted);font-weight:600;}
.sx-score-bar{height:8px;background:var(--sx-border);border-radius:999px;overflow:hidden;margin:6px 0 12px;}
.sx-score-bar-fill{height:100%;border-radius:999px;transition:width 1.1s cubic-bezier(.2,.7,.2,1);}
.sx-tone-high .sx-score-bar-fill{background:linear-gradient(90deg,var(--sx-mid),var(--sx-high));}
.sx-tone-mid .sx-score-bar-fill{background:linear-gradient(90deg,var(--sx-royal),var(--sx-mid));}
.sx-tone-low .sx-score-bar-fill{background:linear-gradient(90deg,var(--sx-cyan),var(--sx-low));}
.sx-score-note{font-size:12.5px;color:var(--sx-muted);margin:0;}

.sx-exposure{padding:24px;display:flex;flex-direction:column;
  background:radial-gradient(120% 120% at 100% 0%,color-mix(in srgb,var(--sx-royal) 8%,var(--sx-panel)),var(--sx-panel));}
.sx-exposure-label{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sx-muted);}
.sx-exposure-num{font-family:'Orbitron';font-weight:800;font-size:clamp(34px,5.4vw,52px);line-height:1.05;
  margin:8px 0 2px;background:linear-gradient(100deg,var(--sx-royal),var(--sx-cyan));-webkit-background-clip:text;background-clip:text;color:transparent;}
.sx-exposure-est{font-size:12px;color:var(--sx-muted);}
.sx-lineitems{margin-top:16px;border-top:1px solid var(--sx-border);padding-top:12px;display:flex;flex-direction:column;gap:9px;}
.sx-lineitem{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13.5px;}
.sx-lineitem-l{display:inline-flex;align-items:center;gap:8px;color:var(--sx-muted);}
.sx-lineitem-l svg{color:var(--sx-royal);flex:none;}
.sx-lineitem-v{font-family:'Orbitron';font-weight:700;font-size:14px;color:var(--sx-ink);}

/* Radar */
.sx-radar-card{padding:22px;margin-bottom:16px;}
.sx-card-head{margin-bottom:8px;}
.sx-card-head h3{font-size:18px;font-weight:600;}
.sx-card-sub{font-size:12.5px;color:var(--sx-muted);}
.sx-radar-wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;align-items:center;}
@media(max-width:680px){.sx-radar-wrap{grid-template-columns:1fr;}}
.sx-radar-chart{height:290px;width:100%;}
.sx-radar-legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;}
.sx-radar-legend li{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:11px 13px;border-radius:12px;background:var(--sx-bg-soft);border:1px solid var(--sx-border);}
.sx-legend-l{display:inline-flex;align-items:center;gap:9px;font-size:13.5px;font-weight:500;}
.sx-legend-v{font-family:'Orbitron';font-weight:700;font-size:15px;}
.sx-radar-legend li[data-tone="high"] .sx-legend-v{color:var(--sx-high);}
.sx-radar-legend li[data-tone="high"] .sx-legend-l svg{color:var(--sx-high);}
.sx-radar-legend li[data-tone="mid"] .sx-legend-v{color:var(--sx-mid);}
.sx-radar-legend li[data-tone="mid"] .sx-legend-l svg{color:var(--sx-mid);}
.sx-radar-legend li[data-tone="low"] .sx-legend-v{color:var(--sx-low);}
.sx-radar-legend li[data-tone="low"] .sx-legend-l svg{color:var(--sx-low);}

/* Gaps */
.sx-gaps-head{margin:26px 0 14px;}
.sx-gaps-head h3{font-size:20px;font-weight:600;}
.sx-gaps-head p{color:var(--sx-muted);font-size:14px;margin:6px 0 0;max-width:62ch;}
.sx-gaps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media(max-width:780px){.sx-gaps{grid-template-columns:1fr;}}
.sx-gap{padding:18px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden;}
.sx-gap::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;}
.sx-gap-high::before{background:var(--sx-high);}
.sx-gap-mid::before{background:var(--sx-mid);}
.sx-gap-top{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.sx-gap-badge{font-family:'Orbitron';font-size:9.5px;letter-spacing:.05em;color:var(--sx-muted);}
.sx-gap-sev{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:999px;}
.sx-gap-sev-high{color:var(--sx-high);background:color-mix(in srgb,var(--sx-high) 12%,transparent);}
.sx-gap-sev-mid{color:var(--sx-mid);background:color-mix(in srgb,var(--sx-mid) 14%,transparent);}
.sx-gap-concern{display:flex;gap:8px;font-size:14px;font-weight:600;line-height:1.4;}
.sx-gap-concern svg{color:var(--sx-muted);flex:none;margin-top:3px;}
.sx-gap-fix{background:var(--sx-bg-soft);border:1px solid var(--sx-border);border-radius:11px;padding:12px;}
.sx-gap-fix-label{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;color:var(--sx-low);margin-bottom:6px;}
.sx-gap-fix p{margin:0;font-size:13px;color:var(--sx-ink);line-height:1.45;}
.sx-gap-clean{grid-column:1/-1;flex-direction:row;align-items:center;gap:16px;}
.sx-gap-clean svg{color:var(--sx-low);flex:none;}
.sx-gap-clean h4{font-size:16px;margin-bottom:4px;}
.sx-gap-clean p{margin:0;color:var(--sx-muted);font-size:14px;}

/* CTA + form */
.sx-cta{margin-top:26px;padding:clamp(22px,4vw,32px);display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:start;
  background:radial-gradient(130% 130% at 0% 0%,color-mix(in srgb,var(--sx-royal) 9%,var(--sx-panel)),var(--sx-panel));}
@media(max-width:760px){.sx-cta{grid-template-columns:1fr;}}
.sx-cta-copy h3{font-size:23px;font-weight:600;line-height:1.2;}
.sx-cta-copy p{color:var(--sx-muted);font-size:14.5px;margin:12px 0 0;}
.sx-cta-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}
.sx-cta-chips span{font-size:12.5px;color:var(--sx-muted);background:var(--sx-bg-soft);border:1px solid var(--sx-border);
  padding:8px 12px;border-radius:10px;}
.sx-cta-chips strong{color:var(--sx-royal);font-family:'Orbitron';font-size:13px;margin-left:4px;}
.sx-form{display:flex;flex-direction:column;gap:11px;}
.sx-form-row{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
@media(max-width:420px){.sx-form-row{grid-template-columns:1fr;}}
.sx-form label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--sx-muted);}
.sx-form input{font-family:inherit;font-size:14px;color:var(--sx-ink);background:var(--sx-bg);
  border:1.5px solid var(--sx-border);border-radius:10px;padding:11px 13px;transition:border-color .15s ease;}
.sx-form input:focus{outline:none;border-color:var(--sx-royal);}
.sx-form input::placeholder{color:color-mix(in srgb,var(--sx-muted) 70%,transparent);}
.sx-form-error{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--sx-high);font-weight:600;}
.sx-form-fine{font-size:11.5px;color:var(--sx-muted);margin:2px 0 0;}
.sx-cta-done{grid-template-columns:1fr;text-align:center;justify-items:center;padding:44px 24px;}
.sx-cta-done svg{color:var(--sx-low);}
.sx-cta-done h3{font-size:22px;margin:14px 0 8px;}
.sx-cta-done p{color:var(--sx-muted);max-width:46ch;margin:0;}

/* Footer */
.sx-footer{max-width:960px;margin:0 auto;padding:22px clamp(18px,5vw,32px) 48px;
  display:flex;flex-direction:column;gap:12px;}
.sx-footer>div:first-child{font-size:11.5px;color:var(--sx-muted);line-height:1.55;
  border-top:1px solid var(--sx-border);padding-top:18px;max-width:80ch;}
.sx-footer-brand{font-size:12px;color:var(--sx-muted);font-weight:600;}
`;
