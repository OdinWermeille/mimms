import { ActionBase } from "../game/common/actions/actionBase";
import { RadioMessage } from "../game/common/radio/radioMessage";
import { MainStateObject } from "../game/common/simulationState/mainSimulationState";
import { getTemplateFromId } from "../game/mainSimulationLogic";
import { statsLogger } from "../tools/logger";

// import { getTeamsContext } from '../dashboard/utils';
// import { getTargetExecutionContext } from '../game/gameExecutionContextController';
// import { getCurrentState } from '../game/mainSimulationLogic';


// const teamsStates = getTeamsContext().map(team => getTargetExecutionContext(team.id)).map(state => state.stateHistory[0])
// const currentState = getCurrentState()


// Events

export type Role = "AL" | "ACS" | "MCS" | "EVASAN" | "LEADPMA" | "LeadPMA";
export type Category = "METHANE" | "Comms" | "Evacs" | "PlayerMoves" | "Orders" | "Roles" | "Posts" | "Announcements" | "VehicleArrivals" | "Other";
export type Event = RadioMessage | ActionBase;

function getEventList(state : MainStateObject) {
  return state.actions;
}

function logEventCategory(event) {
  statsLogger.error("template :", getTemplateFromId(event.templateId));
}

export function getUniqueEvent(state : MainStateObject, actionNameKey : string) {
    const events = getEventList(state);
    const event = events.find(event => event.actionNameKey === actionNameKey);
    wlog("in getUniqueEvent");
    logEventCategory(event);
    return event;
}

function getOwnerId(state : MainStateObject, role : Role) {
    const actors = state.actors;
    return actors.find(actor => actor.Role === role)?.Uid;
}

export function getOwnerRole(state : MainStateObject, ownerId : number) : string {
    const actors = state.actors;
    const actor = actors.find(actor => actor.Uid === ownerId);
    if (actor) {
        return actor.Role;
    } else {
        return "";
    }
}

function getCreatorRole(state : MainStateObject, role : Role) {
    if (role !== "EVASAN" && role !== "LeadPMA") {
        return "Please giva a valid role: EVASAN or LeadPMA";
    }
    const creatorEvent = getUniqueEvent(state, `appoint-${role}-title`);
    if (creatorEvent) {
        return getOwnerRole(state, creatorEvent.ownerId);
    } else {
        return null;
    }
}

function getRoleEvents(state : MainStateObject, role : Role) {
    const events = getEventList(state);
    const roleId = getOwnerId(state, role);
    return events.filter(event => event.ownerId === roleId);
}

function getALPositions(state : MainStateObject, time : number = 0) {
    const events = getRoleEvents(state, "AL");
    if (events.length === 0) return null;
    const specialPositionChangeEvent = getUniqueEvent(state, "define-pcFront-title");
    const movements = events.filter(event => event.actionNameKey === "move-actor-title");
    const positions = [["ambulance", 0], [specialPositionChangeEvent.fixedMapEntity.id, (specialPositionChangeEvent.startTime + specialPositionChangeEvent.durationSec)/60]];
    movements.forEach(movement => {
        positions.push([movement.location, (movement.startTime + movement.durationSec)/60]);
    });
    if (!time) return positions;
    
    const filteredPositions = positions.filter(pos => pos[1] <= time);
    if (filteredPositions.length === 0) return null;
    return filteredPositions[filteredPositions.length - 1][0];
}

function getACSPositions(state : MainStateObject, time : number = 0) {
    const events = getRoleEvents(state, "ACS");
    if (events.length === 0) return null;
    const initialPositionEvent = events.find(event => event.actionNameKey === "on-the-road");
    const specialPositionChangeEvent = getUniqueEvent(state, "define-PC-title");
    const movements = events.filter(event => event.actionNameKey === "move-actor-title");
    const positions = [["pcFront", (initialPositionEvent.startTime + initialPositionEvent.durationSec)/60]];
    positions.push([specialPositionChangeEvent.fixedMapEntity.id, (specialPositionChangeEvent.startTime + specialPositionChangeEvent.durationSec)/60]);
    movements.forEach(movement => {
        positions.push([movement.location, (movement.startTime + movement.durationSec)/60]);
    });
    if (!time) return positions;
    
    const filteredPositions = positions.filter(pos => pos[1] <= time);
    if (filteredPositions.length === 0) return null;
    return filteredPositions[filteredPositions.length - 1][0];
}

function getMCSPositions(state : MainStateObject, time : number = 0) {
    const events = getRoleEvents(state, "MCS");
    if (events.length === 0) return null;
    const initialPositionEvent = events.find(event => event.actionNameKey === "on-the-road");
    const specialPositionChangeEvent = getUniqueEvent(state, "define-PC-title");
    const movements = events.filter(event => event.actionNameKey === "move-actor-title");
    const positions = [["pcFront", (initialPositionEvent.startTime + initialPositionEvent.durationSec)/60]];
    positions.push([specialPositionChangeEvent.fixedMapEntity.id, (specialPositionChangeEvent.startTime + specialPositionChangeEvent.durationSec)/60]);
    movements.forEach(movement => {
        positions.push([movement.location, (movement.startTime + movement.durationSec)/60]);
    });
    if (!time) return positions;

    const filteredPositions = positions.filter(pos => pos[1] <= time);
    if (filteredPositions.length === 0) return null;
    return filteredPositions[filteredPositions.length - 1][0];
}

function getEVASANPositions(state : MainStateObject, time : number = 0) {
    const events = getRoleEvents(state, "EVASAN");
    if (events.length === 0) return null;
    const creatorRole = getCreatorRole(state, "EVASAN");
    const initialPositionEvent = getUniqueEvent(state, "appoint-LeadPMA-title");
    const creationTime = (initialPositionEvent.startTime + initialPositionEvent.durationSec)/60;
    // We assume that the creator role is either "ACS" or "MCS"    
    const creatorPosition = creatorRole === "ACS" ? getACSPositions(state, creationTime) : getMCSPositions(state, creationTime);
    const movements = events.filter(event => event.actionNameKey === "move-actor-title");
    const positions = [[creatorPosition, creationTime]];
    movements.forEach(movement => {
        positions.push([movement.location, (movement.startTime + movement.durationSec)/60]);
    });
    if (!time) return positions;
    
    const filteredPositions = positions.filter(pos => pos[1] <= time);
    if (filteredPositions.length === 0) return null;
    return filteredPositions[filteredPositions.length - 1][0];
}

function getLEADPMAPositions(state : MainStateObject, time : number = 0) {
    const events = getRoleEvents(state, "LEADPMA");
    if (events.length === 0) return null;
    const creatorRole = getCreatorRole(state, "LeadPMA");
    const initialPositionEvent = getUniqueEvent(state, "appoint-LeadPMA-title");
    const creationTime = (initialPositionEvent.startTime + initialPositionEvent.durationSec)/60;
    // We assume that the creator role is either "ACS" or "MCS"    
    const creatorPosition = creatorRole === "ACS" ? getACSPositions(state, creationTime) : getMCSPositions(state, creationTime);
    const movements = events.filter(event => event.actionNameKey === "move-actor-title");
    const positions = [[creatorPosition, creationTime]];
    movements.forEach(movement => {
        positions.push([movement.location, (movement.startTime + movement.durationSec)/60]);
    });
    if (!time) return positions;
    
    const filteredPositions = positions.filter(pos => pos[1] <= time);
    if (filteredPositions.length === 0) return null;
    return filteredPositions[filteredPositions.length - 1][0];
}


export function getActorsPositions(state : MainStateObject, time : number = 0, roles : Role[] | "All") {
    type PositionFunction = (state: MainStateObject, time: number) => any;
    const actorsPositions : Partial<Record<Role, any>> = {};
    const functionCaller : Record<Role, PositionFunction> = { AL: getALPositions, ACS: getACSPositions, MCS: getMCSPositions, EVASAN: getEVASANPositions, LEADPMA: getLEADPMAPositions, LeadPMA : getLEADPMAPositions };
    let rolesToCheck : Role[] = roles === "All" ? ["AL", "ACS", "MCS", "EVASAN", "LEADPMA"] : roles;
    if (rolesToCheck.includes("LEADPMA") && rolesToCheck.includes("LeadPMA")) {
        rolesToCheck = rolesToCheck.filter((role) => role !== "LeadPMA");
    };
    rolesToCheck.forEach(role => {
        actorsPositions[role] = functionCaller[role](state, time);
    });
    return actorsPositions;
}

export function getMETHANE(state : MainStateObject) {
    const events = getEventList(state);
    const methaneEvent = events?.find(event => event.casuMessagePayload?.messageType === "METHANE");
    return methaneEvent ? [methaneEvent] : [];
}

function getComms(state : MainStateObject) {
    const events = getEventList(state);
    const comms = [];
    events.filter(event => event.actionNameKey === "situation-update-title").forEach(event => comms.push(event));
    events.filter(event => event.actionNameKey === "activate-radio-schema-title").forEach(event => comms.push(event));
    comms.push(state.radioMessages.filter(message => message.isRadioMessage));
    return comms
}

function getEvacs(state : MainStateObject) {
    const events = getEventList(state);
    return events.filter(event => event.actionNameKey === "evacuate-title");
}

function getPlayerMoves(state : MainStateObject) {
    const events = getEventList(state);
    return events.filter(event => event.actionNameKey === "move-actor-title");
}

function getOrders(state : MainStateObject) {
    const events = getEventList(state);
    return events.filter(event => event.actionNameKey === "move-res-task-title");
}

function getRoles(state : MainStateObject) {
    const events = getEventList(state);
    return events.filter(event => event.actionNameKey.split("-")[0] === "appoint")
}

function getPosts(state : MainStateObject) {
    const events = getEventList(state);
    return events.filter(event => event.actionNameKey.split("-")[0] === "define" && !event.actionNameKey.includes("Arrival"));
}

function getAnnouncements(state : MainStateObject) {
    const events = getEventList(state);
    return events.filter(event => event.actionNameKey.split("-")[0] === "define" && event.actionNameKey.includes("Arrival"));
}

function getVehicleArrivals(state : MainStateObject) : [string, RadioMessage[]][] {
    const vehiclesInfos =  state.radioMessages;
    const vehicleArrivals : [string, RadioMessage[]][] = [];
    vehicleArrivals.push(["SMUR", vehiclesInfos.filter(info => info.message === "Arrivée de 1 ambulancier, 1 medecinJunior")]);
    vehicleArrivals.push(["Ambulance", vehiclesInfos.filter(info => info.message === "Arrivée de 2 ambulancier")]);
    vehicleArrivals.push(["Helicopter", vehiclesInfos.filter(info => info.message === "Arrivée de 1 ambulancier, 1 medecinSenior")]);
    return vehicleArrivals;
}

function getOther(state : MainStateObject) {
    const [...events] = getEventList(state);
    const otherCategories = ["METHANE", "Comms", "Evacs", "PlayerMoves", "Orders", "Roles", "Posts", "Announcements", "VehicleArrivals"];
    const categorizedEvents = getCategorisedEvents(state, otherCategories)
    categorizedEvents.push(["CommEvents", events.filter(event => event.actionNameKey === "casu-message-title")])
    categorizedEvents.forEach(categoryEvents => {
        if (categoryEvents[0] === 'METHANE') {
            events.splice(events.indexOf(categoryEvents[1]), 1);
        }else{
            categoryEvents[1].forEach(event => {
                events.splice(events.indexOf(event), 1);
            });
        }
    });
    return events;
}

function getCategoryEvents(state : MainStateObject, category : Category) : ActionBase[] | RadioMessage[][] | [string, RadioMessage[]][] {
    if (!["METHANE", "Comms", "Evacs", "PlayerMoves", "Orders", "Roles", "Posts", "Announcements", "VehicleArrivals", "Other"].includes(category)) return [];
    const functionCaller = { METHANE: getMETHANE, Comms: getComms, Evacs: getEvacs, PlayerMoves: getPlayerMoves, Orders: getOrders, Roles: getRoles, Posts: getPosts, Announcements: getAnnouncements, VehicleArrivals: getVehicleArrivals, Other: getOther };
    return functionCaller[category](state)
}


export function getCategorisedEvents(state : MainStateObject, categories : { [key in Category]: boolean } | "ALL") : [Category, ActionBase[] | RadioMessage[][] | [string, RadioMessage[]][]][] {
    if (categories === "ALL") return getAllCategorisedEvents(state);

    const categorisedEvents : [Category, ActionBase[] | RadioMessage[][] | [string, RadioMessage[]][]][] = [];
    Object.entries(categories).forEach(([category, isEnabled]) => {
      if (isEnabled) {
        categorisedEvents.push([category as Category, getCategoryEvents(state, category as Category)]);
      }
    });
    return categorisedEvents;
}

function getAllCategorisedEvents(state : MainStateObject) {
    const categories = ["METHANE", "Comms", "Evacs", "PlayerMoves", "Orders", "Roles", "Posts", "Announcements", "VehicleArrivals", "Other"];
    return getCategorisedEvents(state, categories);
}

// Stats

function getPatientList(state : MainStateObject) {
    return state.patients;
}
  
function countDeadPatients(state : MainStateObject) {
    const patients = getPatientList(state);
    const deadPatientCount = patients.reduce((acc, patient) {
        if (patient.humanBody.state.vitals.cardio.hr === 0) {
        acc++;
        }
        return acc;
    }, 0);
    return deadPatientCount;
}

function countPatients(state : MainStateObject) {
    const patients = getPatientList(state);
    return patients.length;
}


export function getMortalityRate(state : MainStateObject) { 
    const deadPatients = countDeadPatients(state);
    const totalPatients = countPatients(state);
    return totalPatients > 0 ? (deadPatients / totalPatients) * 100 : 0;
}

function getAverageMETHANE(teamsStates : MainStateObject[]) {
    let totalStartTime = 0;
    let teamsNumber = 0;
    teamsStates.forEach(teamState => {
        const METHANE = getMETHANE(teamState);
        if (METHANE) {
            totalStartTime += METHANE.startTime/60;
            teamsNumber++;
        } 
    });
    return teamsNumber > 0 ? totalStartTime/teamsNumber : 0;
}

function getAveragePostTime(postName, teamsStates : MainStateObject[]) {
    let totalStartTime = 0;
    let teamsNumber = 0;
    teamsStates.forEach(teamState => {
        const postEvent = getUniqueEvent(teamState, `define-${postName}-title`);
        if (postEvent) {
            totalStartTime += (postEvent.startTime + postEvent.durationSec)/60;
            teamsNumber++;
        }
    });
    return teamsNumber > 0 ? totalStartTime/teamsNumber : 0;
}

function getAverageRoleTime(roleName : Role, teamsStates : MainStateObject[]) {
    let totalStartTime = 0;
    let teamsNumber = 0;
    teamsStates.forEach(teamState => {
        const roleEvent = getUniqueEvent(teamState, `appoint-${roleName}-title`);
        if (roleEvent) {
            totalStartTime += (roleEvent.startTime + roleEvent.durationSec)/60;
            teamsNumber++;
        }
    });
    return teamsNumber > 0 ? totalStartTime/teamsNumber : 0;
}

export function getAverageTime(eventName, teamsStates : MainStateObject[]) {
    switch (eventName) {
        case "METHANE":
            return getAverageMETHANE(teamsStates);
        case "Nest" :
        case "PC" :
        case "PMA" :
        case "accreg" :
        case "ambulance-park" :
        case "helicopter-park":
            return getAveragePostTime(eventName, teamsStates);
        case "EVASAN" :
        case "LeadPMA":
            return getAverageRoleTime(eventName, teamsStates);
        default:
            return null;
    }
}

function getMaxSimulationTime(teamsStates : MainStateObject[]) {
    let maxCurrentTime = 0;
    teamsStates.forEach(teamState => {
        const currentTime = teamState.simulationTimeSec;
        if (currentTime > maxCurrentTime) {
            maxCurrentTime = currentTime;
        }
    });
    return (maxCurrentTime) / 60;
}

export function getTimeArray(teamsStates : MainStateObject[]) {
    const lastMinute = getMaxSimulationTime(teamsStates);
    const timeArray = [];
    for (let minute = 0; minute <= lastMinute; minute += 5) {
        timeArray.push({minute, lastMinute});
    }
    return timeArray;
}