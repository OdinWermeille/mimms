import { ActionBase } from "../game/common/actions/actionBase";
import { getTargetExecutionContext } from "../game/gameExecutionContextController";

export function getTeamState(teamId : number) : ActionBase[] {
  const mainState = getTargetExecutionContext(teamId)?.getCurrentState();
  if (!mainState) return [];

  const state = mainState.getInternalStateObject();

  const stateWithoutMethods = JSON.parse(JSON.stringify(state));

  return stateWithoutMethods;
};