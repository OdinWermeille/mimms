import { ActionBase } from "../game/common/actions/actionBase";
import { RadioMessage } from "../game/common/radio/radioMessage";
import { MainStateObject } from "../game/common/simulationState/mainSimulationState";

// import { getTeamsContext } from '../dashboard/utils';
// import { getTargetExecutionContext } from '../game/gameExecutionContextController';
// import { getCurrentState } from '../game/mainSimulationLogic';


// const teamsStates = getTeamsContext().map(team => getTargetExecutionContext(team.id)).map(state => state.stateHistory[0])
// const currentState = getCurrentState()


// Events

export type Role = "AL" | "ACS" | "MCS" | "EVASAN" | "LEADPMA" | "LeadPMA" | "All";
export type MainCategory = "METHANE" | "Comms" | "Evacs" | "PlayerMoves" | "Orders" | "Roles" | "Posts" | "Announcements" | "VehicleArrivals" | "Other";
export type Category = "METHANE" | "OpenComms" | "SentMessages" | "ReceivedMessages" | "Situation" | "AmbulanceEvacs" | "HelicopterEvacs" | "PlayerMoves" | "WaitingOrders" | "PretriageOrders" | "PorterOrders" | "LeadPMARole" | "EVASANRole" | "PcFrontPost" | "NestPost" | "AmbulancePost" | "HelicopterPost" | "AccregPost" | "PMAPost" | "PCPost" | "AcsMscArrivalAnnouncement" | "EvasanArrivalAnnouncement" | "LeadpmaArrivalAnnouncement" | "AmbulanceArrivals" | "HelicopterArrivals" | "SmurArrivals" | "Other";
export type Event = { startTime : number, duration : number, ownerId : number };
export type CategorisedEventList = { category : Category, events : Event[] }

function getSimplifiedAction(action : ActionBase) : Event{
  return { startTime : action.startTime / 60, duration : action.durationSec / 60, ownerId : action.ownerId }
}

function getSimplifiedMessage(message : RadioMessage, correspondant : "sender" | "recipient") : Event | undefined {
  const correspondantId = correspondant === "sender" ? message.senderId : message.recipientId;
  return correspondantId ? { startTime : message.timeStamp / 60, duration : 1, ownerId : correspondantId} : undefined
}

function getActionList(state : MainStateObject) {
  return state.actions;
}

export function getUniqueEvent(state : MainStateObject, actionNameKey : string) {
    const actions = getActionList(state);
    const action = actions.find(action => action.actionNameKey === actionNameKey);
    wlog("in getUniqueEvent");
    return action;
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
    const actions = getActionList(state);
    const roleId = getOwnerId(state, role);
    return actions.filter(action => action.ownerId === roleId);
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

export function getMETHANE(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const methane : CategorisedEventList[] = []

    const methaneEvents : Event[] = [];
    actions.filter(action => action.casuMessagePayload?.messageType === "METHANE").forEach(action => methaneEvents.push(getSimplifiedAction(action)));
    methane.push({ category : "METHANE", events : methaneEvents });

    // return methane
/*x*/    const event = actions.filter(action => action.casuMessagePayload?.messageType === "METHANE");
/*x*/    return event;
    /* return methaneEvent ? [{ category : "METHANE" , events : [getSimplifiedAction(methaneEvent)] }] : []*/
}

function getComms(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const comms /*: CategorisedEventList[]*/ = [];

    const situationEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "situation-update-title").forEach(action => comms.push(action)/*situationEvents.push(getSimplifiedAction(event))*/);
    // comms.push({ category : "Situation" , events : situationEvents});

    const openCommsEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "activate-radio-schema-title").forEach(action => comms.push(action)/*openCommsEvents.push(getSimplifiedAction(event))*/);
    // comms.push({ category : "OpenComms", events : openCommsEvents })

    const sentMessagesEvents : Event[] = [];
    const receivedMessagesEvents : Event[] = [];
    state.radioMessages.filter(message => message.isRadioMessage).forEach(message =>  {
      const simplifiedSentMessage = getSimplifiedMessage(message, "sender");
      simplifiedSentMessage && sentMessagesEvents.push(simplifiedSentMessage);
    }); 
    state.radioMessages.filter(message => message.isRadioMessage).forEach(message =>  {
      const simplifiedRecievedMessage = getSimplifiedMessage(message, "recipient");
      simplifiedRecievedMessage && receivedMessagesEvents.push(simplifiedRecievedMessage);
    });
    // comms.push({ category : "SentMessages", events : sentMessagesEvents })
    // comms.push({ category : "ReceivedMessages", events : receivedMessagesEvents})

    state.radioMessages.filter(message => message.isRadioMessage).forEach(message => comms.push(message)));

    return comms
}

function getEvacs(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const evacs : CategorisedEventList[] = [];

    const ambulanceEvacsEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "evacuate-title").forEach(action => ambulanceEvacsEvents.push(getSimplifiedAction(action)));
    // evacs.push({ category : "AmbulanceEvacs", events : ambulanceEvacsEvents });

    const helicopterEvacsEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "evacuate-title").forEach(action => helicopterEvacsEvents.push(getSimplifiedAction(action)));
    // evacs.push({ category : "HelicopterEvacs", events : helicopterEvacsEvents });

    // return evacs;
/*x*/return actions.filter(action => action.actionNameKey === "evacuate-title");
}

function getPlayerMoves(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const playerMoves : CategorisedEventList[] = [];

    const playerMovesEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "move-actor-title").forEach(action => playerMovesEvents.push(getSimplifiedAction(action)));
    playerMoves.push({ category : "PlayerMoves", events : playerMovesEvents });

    // return playerMoves;
/*x*/return actions.filter(action => action.actionNameKey === "move-actor-title");
}

function getOrders(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const orders : CategorisedEventList[] = [];

    const waitingOrdersEvents : Event[] = [];
    // actions.filter(action => isWaitingOrder(action, state)).forEach(action => waitingOrdersEvents.push(getSimplifiedAction(action)));
    // orders.push({ category : "WaitingOrders", events : waitingOrdersEvents })

    const pretriageOrdersEvents : Event[] = [];
    // actions.filter(action => isPretriageOrder(action, state)).forEach(action => pretriageOrdersEvents.push(getSimplifiedAction(action)));
    // orders.push({ category : "PretriageOrders", events : pretriageOrdersEvents })

    const porterOrdersEvents : Event[] = [];
    // actions.filter(action => isPorterOrder(action, state)).forEach(action => porterOrdersEvents.push(getSimplifiedAction(action)));
    // orders.push({ category : "PorterOrders", events : porterOrdersEvents })

    // return orders
/*x*/return actions.filter(action => action.actionNameKey === "move-res-task-title");
}

function getRoles(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const roles : CategorisedEventList[] = [];

    const leadPmaRoleEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "appoint-LeadPMA-title").forEach(action => leadPmaRoleEvents.push(getSimplifiedAction(action)));
    // roles.push({ category : "LeadPMARole", events : leadPmaRoleEvents })

    const evasanRoleEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "appoint-EVASAN-title").forEach(action => evasanRoleEvents.push(getSimplifiedAction(action)));
    // roles.push({ category : "EVASANRole", events : evasanRoleEvents })

    // return roles
/*x*/return actions.filter(action => action.actionNameKey.split("-")[0] === "appoint")
}

function getPosts(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const posts : CategorisedEventList[] = [];

    const pcFrontPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-pcFront-title").forEach(action => pcFrontPostEvents.push(getSimplifiedAction(action)));
    // posts.push({ category : "PcFrontPost", events : pcFrontPostEvents });
    
    const nestPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-Nest-title").forEach(action => nestPostEvents.push(getSimplifiedAction(action)));
    // posts.push({ category : "NestPost", events : nestPostEvents });
    
    const ambulancePostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-ambulance-park-title").forEach(action => ambulancePostEvents.push(getSimplifiedAction(action)));
    // posts.push({ category : "AmbulancePost", events : ambulancePostEvents });

    const helicopterPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-helicopter-park-title").forEach(action => helicopterPostEvents.push(getSimplifiedAction(action)));
    // posts.push({ category : "HelicopterPost", events : helicopterPostEvents });
    
    const accregPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-accreg-title").forEach(action => accregPostEvents.push(getSimplifiedAction(action)));
    // posts.push({ category : "AccregPost", events : accregPostEvents });
    
    const pmaPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-PMA-title").forEach(action => pmaPostEvents.push(getSimplifiedAction(action)));
    // posts.push({ category : "PMAPost", events : pmaPostEvents });
    
    const pcPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-PC-title").forEach(action => pcPostEvents.push(getSimplifiedAction(action)));
    // posts.push({ category : "PCPost", events : pcPostEvents });
    
    // return posts
/*x*/return actions.filter(action => action.actionNameKey.split("-")[0] === "define" && !action.actionNameKey.includes("Arrival"));
}

function getAnnouncements(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const actions = getActionList(state);
    const announcements : CategorisedEventList[] = [];

    const acsMscArrivalAnnouncementEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-acsMscArrival-title").forEach(action => acsMscArrivalAnnouncementEvents.push(getSimplifiedAction(action)));
    // announcements.push({ category : "AcsMscArrivalAnnouncement", events : acsMscArrivalAnnouncementEvents })
    
    const evasanArrivalAnnouncementEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-evasanArrival-title").forEach(action => evasanArrivalAnnouncementEvents.push(getSimplifiedAction(action)));
    // announcements.push({ category : "EvasanArrivalAnnouncement", events : evasanArrivalAnnouncementEvents })
    
    const leadpmaArrivalAnnouncementEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-leadpmaArrival-title").forEach(action => leadpmaArrivalAnnouncementEvents.push(getSimplifiedAction(action)));
    // announcements.push({ category : "LeadpmaArrivalAnnouncement", events : leadpmaArrivalAnnouncementEvents })
    
    // return announcements
/*x*/return actions.filter(action => action.actionNameKey.split("-")[0] === "define" && action.actionNameKey.includes("Arrival"));
}

function getVehicleArrivals(state : MainStateObject) : [string, RadioMessage[]][] /*: CategorisedEventList[]*/ {
    const messages =  state.radioMessages;
/*x*/const vehicleArrivals : [string, RadioMessage[]][] = [];
    // const vehicleArrivals : CategorisedEventList[] = [];

    // const ambulanceArrivalsEvents : Event[] = [];
    // messages.filter(message => message.message === "Arrivée de 2 ambulancier").forEach(message => ambulanceArrivalsEvents.push(getSimplifiedMessage(message)))

    // const helicopterArrivalsEvents : Event[] = [];
    // messages.filter(message => message.message === "Arrivée de 1 ambulancier, 1 medecinSenior").forEach(message => helicopterArrivalsEvents.push(getSimplifiedMessage(message)))

    // const smurArrivalsEvents : Event[] = [];
    // messages.filter(message => message.message === "Arrivée de 1 ambulancier, 1 medecinJunior")


/*x*/vehicleArrivals.push(["SMUR", messages.filter(message => message.message === "Arrivée de 1 ambulancier, 1 medecinJunior")]);
/*x*/vehicleArrivals.push(["Ambulance", messages.filter(message => message.message === "Arrivée de 2 ambulancier")]);
/*x*/vehicleArrivals.push(["Helicopter", messages.filter(message => message.message === "Arrivée de 1 ambulancier, 1 medecinSenior")]);
    return vehicleArrivals;
}

/*x*/function getOther(state : MainStateObject) /*: CategorisedEventList[]*/ {
    const [...actions] = getActionList(state);
    const otherCategories = ["METHANE", "Comms", "Evacs", "PlayerMoves", "Orders", "Roles", "Posts", "Announcements", "VehicleArrivals"];
    const categorizedEvents = getCategorisedEvents(state, otherCategories)
    categorizedEvents.push(["CommEvents", actions.filter(action => action.actionNameKey === "casu-message-title")])
    categorizedEvents.forEach(categoryEvents => {
        if (categoryEvents[0] === 'METHANE') {
            actions.splice(actions.indexOf(categoryEvents[1]), 1);
        }else{
            categoryEvents[1].forEach(event => {
                actions.splice(actions.indexOf(event), 1);
            });
        }
    });
    return actions;
}

function getCategoryEvents(state : MainStateObject, category : MainCategory) : ActionBase[] | RadioMessage[][] | [string, RadioMessage[]][] {
    if (!["METHANE", "Comms", "Evacs", "PlayerMoves", "Orders", "Roles", "Posts", "Announcements", "VehicleArrivals"/*x*/, "Other"/*x*/].includes(category)) return [];
    const functionCaller = { METHANE: getMETHANE, Comms: getComms, Evacs: getEvacs, PlayerMoves: getPlayerMoves, Orders: getOrders, Roles: getRoles, Posts: getPosts, Announcements: getAnnouncements, VehicleArrivals: getVehicleArrivals, Other: getOther };
    return functionCaller[category](state)
}


export function getCategorisedEvents(state : MainStateObject, categories : { [key in MainCategory]: boolean } | "ALL") : [MainCategory, ActionBase[] | RadioMessage[][] | [string, RadioMessage[]][]][] {
    if (categories === "ALL") return getAllCategorisedEvents(state);

/*x*/const categorisedEvents : [MainCategory, ActionBase[] | RadioMessage[][] | [string, RadioMessage[]][]][] = [];
    // const categorisedEvents : CategorisedEventList[] = [];
    Object.entries(categories).forEach(([category, isEnabled]) => {
      if (isEnabled) {
        // getCategoryEvents(state, category as MainCategory).forEach(subcategoryEvents => categorisedEvents.push(subcategoryEvents));
/*x*/   categorisedEvents.push([category as MainCategory, getCategoryEvents(state, category as MainCategory)]);
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