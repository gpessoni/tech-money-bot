type IncomeStep =
  | { step: "tipo" }
  | { step: "valor"; tipo: string }
  | { step: "descricao"; tipo: string; valor: number };

const stateMap = new Map<string, IncomeStep>();

export function setUserState(userId: string, state: IncomeStep) {
  stateMap.set(userId, state);
}

export function getUserState(userId: string): IncomeStep | undefined {
  return stateMap.get(userId);
}

export function clearUserState(userId: string) {
  stateMap.delete(userId);
}
