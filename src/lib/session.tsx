/**
 * Estado de la sesión: solo memoria de React. Nada se persiste: al recargar,
 * el proyecto y el análisis desaparecen.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { defaultSettings } from "@/types/medidor";
import type {
  CausalModel,
  ClimateAlignment,
  Indicator,
  PlatformSettings,
  ProjectInput,
  SessionAnalysis,
} from "@/types/medidor";

export const EMPTY_PROJECT: ProjectInput = {
  name: "",
  sector: "",
  territory: "",
  duration: "",
  targetPopulation: "",
  budget: "",
  text: "",
  sourceFileNames: [],
};

interface SessionValue {
  project: ProjectInput;
  setProject: (updater: (prev: ProjectInput) => ProjectInput) => void;
  /** Marcos de la fundación y reglas de validación. Se conservan al iniciar un análisis nuevo. */
  settings: PlatformSettings;
  setSettings: (updater: (prev: PlatformSettings) => PlatformSettings) => void;
  analysis: SessionAnalysis | null;
  setAnalysis: (analysis: SessionAnalysis | null) => void;
  updateCausal: (updater: (prev: CausalModel) => CausalModel) => void;
  updateIndicator: (id: string, updater: (prev: Indicator) => Indicator) => void;
  updateClimateAlignment: (updater: (prev: ClimateAlignment) => ClimateAlignment) => void;
  removeIndicator: (id: string) => void;
  answerQuestion: (id: string, answer: string) => void;
  step: number;
  setStep: (step: number) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<ProjectInput>(EMPTY_PROJECT);
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [settings, setSettingsState] = useState<PlatformSettings>(defaultSettings);
  const [step, setStep] = useState(2);

  const value = useMemo<SessionValue>(
    () => ({
      project,
      setProject: (updater) => setProjectState((prev) => updater(prev)),
      settings,
      setSettings: (updater) => setSettingsState((prev) => updater(prev)),
      analysis,
      setAnalysis,
      updateCausal: (updater) =>
        setAnalysis((prev) => (prev ? { ...prev, causal: updater(prev.causal) } : prev)),
      updateIndicator: (id, updater) =>
        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                indicators: prev.indicators.map((i) => (i.id === id ? updater(i) : i)),
              }
            : prev,
        ),
      updateClimateAlignment: (updater) =>
        setAnalysis((prev) =>
          prev ? { ...prev, climateAlignment: updater(prev.climateAlignment) } : prev,
        ),
      removeIndicator: (id) =>
        setAnalysis((prev) =>
          prev ? { ...prev, indicators: prev.indicators.filter((i) => i.id !== id) } : prev,
        ),
      answerQuestion: (id, answer) =>
        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                questions: prev.questions.map((q) => (q.id === id ? { ...q, answer } : q)),
              }
            : prev,
        ),
      step,
      setStep,
      reset: () => {
        setProjectState(EMPTY_PROJECT);
        setAnalysis(null);
        setStep(2);
      },
    }),
    [project, settings, analysis, step],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
