import { getTeamsContext } from "../dashboard/utils";
import { MainStateObject } from "../game/common/simulationState/mainSimulationState";
import { getTargetExecutionContext } from "../game/gameExecutionContextController";
import { MainCategory, Category, getCategorisedEvents } from "./helpers";

export function getCategories(categories: { [key in MainCategory]: boolean }) : { name : string }[] {
  const teams = getTeamsContext();
  const result = new Set<Category>();

  for (const team of teams) {
    const teamState : MainStateObject | undefined = getTargetExecutionContext(team.id)?.getCurrentState()?.getInternalStateObject();

    if (!teamState) {
      continue;
    }

    const categorisedEventsList = getCategorisedEvents(teamState, categories);

    for (const categorisedEvents of categorisedEventsList) {
      const category = categorisedEvents.category
      const events = categorisedEvents.events

      if (!events?.length) continue;

      if (result.has(category)) continue;

      result.add(category);
    }
  }

  return Array.from(result).map(name => ({ name : (getTitle(name)) }));
}

export function getTitle(name : string) : string {
  return name[0].toUpperCase() + name.slice(1);
}