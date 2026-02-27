import { useMemo, useState } from "react";
import StepWelcome from "./components/StepWelcome.jsx";
import StepName from "./components/StepName.jsx";
import StepAge from "./components/StepAge.jsx";
import StepMarital from "./components/StepMarital.jsx";
import StepExposure from "./components/StepExposure.jsx";
import StepRisk from "./components/StepRisk.jsx";
import StepHorizon from "./components/StepHorizon.jsx";
import StepSubmit from "./components/StepSubmit.jsx";
import ProgressBar from "./components/ProgressBar.jsx";
import ResultModal from "./components/ResultModal.jsx";

const TOTAL_STEPS = 8;

const initialForm = {
  name: "",
  age: 30,
  maritalStatus: "",
  allocation: {
    stocks: 0,
    mutualFunds: 0,
    gold: 0,
    bonds: 0,
    cash: 0,
    realEstate: 0
  },
  riskAppetite: "",
  horizon: ""
};

const toPercentages = (allocation) => {
  const entries = Object.entries(allocation || {});
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (total <= 0) {
    return entries.reduce((acc, [key]) => ({ ...acc, [key]: 0 }), {});
  }

  const raw = entries.map(([key, value]) => [key, (Number(value || 0) / total) * 100]);
  const rounded = raw.reduce((acc, [key, value]) => {
    acc[key] = Math.round(value);
    return acc;
  }, {});
  const roundedTotal = Object.values(rounded).reduce((sum, value) => sum + value, 0);
  const diff = 100 - roundedTotal;
  if (diff !== 0) {
    const largestKey = raw.reduce((a, b) => (a[1] >= b[1] ? a : b))[0];
    rounded[largestKey] = Math.max(0, rounded[largestKey] + diff);
  }
  return rounded;
};

export default function App() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [analysis, setAnalysis] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const allocationTotal = useMemo(() => {
    return Object.values(form.allocation).reduce((sum, value) => sum + Number(value || 0), 0);
  }, [form.allocation]);

  const allocationValid = allocationTotal > 0;
  const isCompactExposure = step === 5;

  const nextStep = () => setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  const restart = () => {
    setForm(initialForm);
    setAnalysis(null);
    setError("");
    setIsSubmitting(false);
    setSubmitProgress(0);
    setShowModal(false);
    setStep(1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitProgress(0);
    setError("");
    let intervalId;
    const startedAt = Date.now();

    const startProgress = () => {
      let current = 0;
      intervalId = setInterval(() => {
        const bump = Math.random() * 8 + 3;
        current = Math.min(90, current + bump);
        setSubmitProgress(Math.round(current));
      }, 220);
    };

    startProgress();

    try {
      if (allocationTotal <= 0) {
        throw new Error("Enter investment amounts to analyze your portfolio.");
      }

      const allocationPercentages = toPercentages(form.allocation);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          allocation: allocationPercentages
        })
      });

      if (!response.ok) {
        throw new Error("Unable to analyze your portfolio right now.");
      }

      const data = await response.json();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 10000 - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      clearInterval(intervalId);
      setSubmitProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 250));
      setAnalysis(data);
      setShowModal(true);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setSubmitProgress(0);
    } finally {
      if (intervalId) clearInterval(intervalId);
      setIsSubmitting(false);
    }
  };

  const stepContent = () => {
    switch (step) {
      case 1:
        return <StepWelcome onNext={nextStep} />;
      case 2:
        return (
          <StepName
            name={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            onNext={nextStep}
          />
        );
      case 3:
        return (
          <StepAge
            age={form.age}
            onChange={(value) => setForm((prev) => ({ ...prev, age: value }))}
            onNext={nextStep}
          />
        );
      case 4:
        return (
          <StepMarital
            value={form.maritalStatus}
            onSelect={(value) => setForm((prev) => ({ ...prev, maritalStatus: value }))}
            onNext={nextStep}
          />
        );
      case 5:
        return (
          <StepExposure
            allocation={form.allocation}
            total={allocationTotal}
            valid={allocationValid}
            onChange={(key, value) =>
              setForm((prev) => ({
                ...prev,
                allocation: { ...prev.allocation, [key]: value }
              }))
            }
            onNext={nextStep}
          />
        );
      case 6:
        return (
          <StepRisk
            value={form.riskAppetite}
            onSelect={(value) => setForm((prev) => ({ ...prev, riskAppetite: value }))}
            onNext={nextStep}
          />
        );
      case 7:
        return (
          <StepHorizon
            value={form.horizon}
            onSelect={(value) => setForm((prev) => ({ ...prev, horizon: value }))}
            onNext={nextStep}
          />
        );
      case 8:
        return (
          <StepSubmit
            form={form}
            allocationTotal={allocationTotal}
            allocationValid={allocationValid}
            isSubmitting={isSubmitting}
            submitProgress={submitProgress}
            error={error}
            onSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-ink-900">
      <div
        className={`mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-8 ${
          isCompactExposure ? "py-4" : "py-8"
        }`}
      >
        <header className={`flex items-center justify-between ${isCompactExposure ? "mb-4" : "mb-6"}`}>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ink-600">
              Portfolio Analyzer
            </p>
            <h1 className="text-2xl font-semibold text-ink-900">Modern Portfolio Intelligence</h1>
          </div>
          <div className="hidden items-center gap-2 text-sm text-ink-600 sm:flex">
            <span className="h-2 w-2 rounded-full bg-mint-500" />
            Secure local analysis
          </div>
        </header>

        {step > 1 && (
          <div className={isCompactExposure ? "mb-4" : "mb-6"}>
            <ProgressBar step={step} total={TOTAL_STEPS} />
          </div>
        )}

        <main
          className={`app-shell flex flex-1 items-center justify-center rounded-3xl shadow-card ${
            isCompactExposure ? "px-5 py-6 sm:px-8" : "px-6 py-10 sm:px-12"
          }`}
        >
          <div
            key={step}
            className={`w-full animate-fade-slide ${isCompactExposure ? "max-w-5xl" : "max-w-3xl"}`}
          >
            {stepContent()}
          </div>
        </main>

        <footer
          className={`flex flex-col justify-between gap-3 text-xs text-ink-600 sm:flex-row ${
            isCompactExposure ? "mt-4" : "mt-8"
          }`}
        >
          <span>Built for quick, private portfolio diagnostics.</span>
          <span>Step {step} of {TOTAL_STEPS}</span>
        </footer>
      </div>

      <ResultModal
        open={showModal}
        analysis={analysis}
        form={form}
        onRestart={restart}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
