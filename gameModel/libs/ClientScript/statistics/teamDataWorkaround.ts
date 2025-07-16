import { MainStateObject } from "../game/common/simulationState/mainSimulationState";
import { getTargetExecutionContext } from "../game/gameExecutionContextController";

export function getTeamState(teamId : number) : MainStateObject | undefined {
  const mainState = getTargetExecutionContext(teamId)?.getCurrentState();
  if (!mainState) return undefined;

  const state = mainState.getInternalStateObject();

  const stateWithoutMethods : MainStateObject = JSON.parse(JSON.stringify(state));

  return stateWithoutMethods;
};