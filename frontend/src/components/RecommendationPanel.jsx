import { useEffect, useMemo, useState } from "react";
import CombinationCard from "./CombinationCard.jsx";
import CombinationDetails from "./CombinationDetails.jsx";

export default function RecommendationPanel({ result, loading, error }) {
  const [selectedCombination, setSelectedCombination] = useState(null);

  useEffect(() => {
    if (!result?.recommendation) {
      setSelectedCombination(null);
      return;
    }

    setSelectedCombination(result.recommendation);
  }, [result]);

  const combinations = useMemo(() => {
    if (!result?.recommendation) return [];
    return [result.recommendation, ...(result.alternatives || [])];
  }, [result]);

  const activeCombination = selectedCombination || result?.recommendation || null;

  if (loading) {
    return (
      <div className="rounded-3xl bg-white/70 p-8 shadow-card ring-1 ring-sand">
        <p className="animate-pulse font-display text-2xl">Comparing combinations…</p>
        <p className="mt-2 text-ink/70">Cleaning catalog data and verifying totals on the backend.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-white p-8 ring-1 ring-clay/40">
        <h2 className="font-display text-2xl text-clay">Something went wrong</h2>
        <p className="mt-2 text-ink/80">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-3xl bg-moss px-8 py-10 text-paper shadow-card">
        <p className="text-sm uppercase tracking-[0.2em] text-sand">Waiting for details</p>
        <h2 className="mt-3 font-display text-3xl">Tell me a budget and what to buy</h2>
        <p className="mt-4 max-w-md text-paper/80">
          Example: “I have ₹5000. I need a backpack, headphones and a smartwatch for college.”
        </p>
      </div>
    );
  }

  if (result.route && !result.recommendation) return null;

  if (result.status === "needs_clarification") {
    return (
      <div className="rounded-3xl bg-moss px-8 py-10 text-paper shadow-card">
        <p className="text-sm uppercase tracking-[0.2em] text-sand">Waiting for details</p>
        <h2 className="mt-3 font-display text-3xl">Tell me a budget and what to buy</h2>
        <p className="mt-4 max-w-md text-paper/80">
          Example: “I have ₹5000. I need a backpack, headphones and a smartwatch for college.”
        </p>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="rounded-3xl bg-white p-8 ring-1 ring-sand">
        <h2 className="font-display text-2xl">No valid combination</h2>
        <p className="mt-3 whitespace-pre-line text-ink/80">{result.assistantMessage || result.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeCombination ? (
        <CombinationDetails combination={activeCombination} budget={result.requirements?.budget || result.recommendation?.remainingBudget + result.recommendation?.totalPrice || 0} />
      ) : null}

      {combinations.length > 1 ? (
        <section className="rounded-3xl bg-white p-6 ring-1 ring-sand">
          <h3 className="font-display text-xl">Alternative combinations</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {combinations.map((combo, index) => (
              <CombinationCard
                key={`${combo.totalPrice}-${index}`}
                combo={combo}
                index={index}
                label={index === 0 ? "Primary recommendation" : `Option ${index + 1}`}
                isSelected={activeCombination === combo}
                onSelect={setSelectedCombination}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
