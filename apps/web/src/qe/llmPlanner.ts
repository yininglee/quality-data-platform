import { PlannerError } from "./agent";
import type { ModelDecision, ModelDriver } from "./modelProtocol";

declare const __QE_LLM_ENABLED__: boolean;

const planWithModel: ModelDriver = async (input, signal) => {
  const response = await fetch("/api/qe/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.message === "string" && payload.message.length <= 150
      ? payload.message : "模型规划接口暂不可用。";
    throw new PlannerError(message);
  }
  return payload as ModelDecision;
};

export const configuredLlmDriver = typeof __QE_LLM_ENABLED__ !== "undefined" && __QE_LLM_ENABLED__
  ? planWithModel : undefined;
