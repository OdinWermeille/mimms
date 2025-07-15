import { getTeamsContext } from "../dashboard/utils";
import { ActionBase } from "../game/common/actions/actionBase";
import { MainStateObject } from "../game/common/simulationState/mainSimulationState";
import { getTargetExecutionContext } from "../game/gameExecutionContextController";
import { statsLogger } from "../tools/logger";
import { Category, getCategorisedEvents } from "./helpers";
import { getAnnouncementsClass, getCommsClass, getOrdersClass, getPostsClass, getRolesClass } from "./simpleGapMaker";

const categoryClassifier = {
  Comms: getCommsClass,
  Orders: getOrdersClass,
  Roles: getRolesClass,
  Posts: getPostsClass,
  Announcements: getAnnouncementsClass
};

const knownSubcategories : Partial<Record<Category, Set<string>>> = {
  Comms: new Set(["radio", "situation"]),
  Orders: new Set(["Waiting", "Pretriage", "Porter", "Healing", "Evacuation"]),
  Roles: new Set(["EVASAN", "LeadPMA"]),
  Posts: new Set(["pcFront", "Nest", "PC", "PMA", "ambulance", "helicopter", "accreg"])
}

type CategoryWithClassifier = keyof typeof categoryClassifier;

export function getCategories(categories: { [key in Category]: boolean }) {
  const teams = getTeamsContext();
  const result = new Set<string>();

  for (const team of teams) {
    const teamState : MainStateObject = getTargetExecutionContext(team.id)?.getCurrentState()?.internalState;

    if (!teamState) {
      statsLogger.error(`Missing state for team ${team.name} (${team.id})`);
      continue;
    }

    let categorisedEvents;
    try {
      categorisedEvents = getCategorisedEvents(teamState, categories);
    } catch (e) {
      statsLogger.error("Error during getCategorisedEvents:", e);
      continue;
    }

    for (const [category, events] of categorisedEvents) {
      if (!events?.length) continue;

      if (!(category in categoryClassifier)) {
        if (result.has(category)) continue;
        result.add(category);
        continue;
      }

      const known = knownSubcategories[category];

      if (known) {
        const allAlreadySeen = Array.from(known ?? []).every(name => result.has(name));
        if (allAlreadySeen) continue;
      }

      const classifier = categoryClassifier[category as CategoryWithClassifier];
      const subcategoryNames = new Set(events.map(event => {
        return category === "Orders" ? classifier(event as ActionBase, teamState) : classifier(event as ActionBase)
      }));

      //should work without doing this, but just doesn't ¯\_(ツ)_/¯
      const copiedNames = Array.from(subcategoryNames ?? []);

      for (const name of copiedNames) {
        result.add(name);
      }
    }
  }

  return Array.from(result).map(name => ({ name }));
}

export function getTitle(name : string) {
  return name[0].toUpperCase() + name.slice(1);
}