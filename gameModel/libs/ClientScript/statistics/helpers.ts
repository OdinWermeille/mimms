import { ActionBase } from "../game/common/actions/actionBase";
import { getHospitalById } from "../game/common/evacuation/hospitalController";
import { RadioMessage } from "../game/common/radio/radioMessage";
import { MainStateObject } from "../game/common/simulationState/mainSimulationState";
import { getTitle } from "./legendGen";

// Events

export type Role = "AL" | "ACS" | "MCS" | "EVASAN" | "LEADPMA" | "All";
export type MainCategory = "METHANE" | "Comms" | "Evacs" | "PlayerMoves" | "Orders" | "Roles" | "Posts" | "Announcements" | "VehicleArrivals";
export type Category = "METHANE" | "OpenComms" | "SentMessages" | "ReceivedMessages" | "Situation" | "AmbulanceEvacs" | "HelicopterEvacs" | "PlayerMoves" | "WaitingOrders" | "PretriageOrders" | "PorterOrders" | "LeadPMARole" | "EVASANRole" | "PcFrontPost" | "NestPost" | "AmbulancePost" | "HelicopterPost" | "AccregPost" | "PMAPost" | "PCPost" | "AcsMscArrivalAnnouncement" | "EvasanArrivalAnnouncement" | "LeadpmaArrivalAnnouncement" | "AmbulanceArrivals" | "HelicopterArrivals" | "SmurArrivals";
export type Event = { startTime : number, duration : number, ownerId : number, info : string };
export type CategorisedEventList = { category : Category, events : Event[] }

function getSimplifiedAction(action : ActionBase, info : string) : Event{
  return { startTime : action.startTime / 60, duration : action.durationSec / 60, ownerId : action.ownerId, info : info }
}

function getSimplifiedMessage(message : RadioMessage, correspondant : "sender" | "recipient") : Event | undefined {
  const correspondantId = correspondant === "sender" ? message.senderId : message.recipientId;
  const messageIntro = correspondant === "sender" ? `Message envoyé :

` : `Message reçu :

`;
  return correspondantId ? { startTime : message.timeStamp / 60, duration : 1, ownerId : correspondantId, info : messageIntro + message.message} : undefined
}

function getSimplifiedMessageNoInfo(message : RadioMessage, correspondant : "sender" | "recipient") : Event | undefined {
  const correspondantId = correspondant === "sender" ? message.senderId : message.recipientId;
  return correspondantId ? { startTime : message.timeStamp / 60, duration : 1, ownerId : correspondantId, info : ""} : undefined
}

function getActionList(state : MainStateObject) {
  return state.actions;
}

export function getUniqueEvent(state : MainStateObject, actionNameKey : string) {
    const actions = getActionList(state);
    const action = actions.find(action => action.actionNameKey === actionNameKey);
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
    if (role !== "EVASAN" && role !== "LEADPMA") {
        return "Please giva a valid role: EVASAN or LEADPMA";
    }
    const creatorEvent = getUniqueEvent(state, `appoint-${role}-title`);
    if (creatorEvent) {
        return getOwnerRole(state, creatorEvent.ownerId);
    } else {
        return null;
    }
}

function getTaskType(order : ActionBase, state : MainStateObject) {
  return state.tasks.find(task => task.Uid === order.targetTaskId)?.taskType;
};

function isWaitingOrder(order : ActionBase, state : MainStateObject) : boolean {
  const targetTaskType = getTaskType(order, state);
  return targetTaskType === "Waiting";
}

function isPretriageOrder(order : ActionBase, state : MainStateObject) : boolean {
  const targetTaskType = getTaskType(order, state);
  return targetTaskType === "Pretriage";
}

function isPorterOrder(order : ActionBase, state : MainStateObject) : boolean {
  const targetTaskType = getTaskType(order, state);
  return targetTaskType === "Porter";
}

function containsAmbulance(resourceIds : number[], state : MainStateObject) : boolean {
  let containsAmbulance = false;
  resourceIds.forEach(resourceId => {
    const resource = state.resources.find(resource => resource.Uid === resourceId);
    resource.type === "ambulance" && (containsAmbulance = true);
  })
  return containsAmbulance;
};

function containsHelicopter(resourceIds : number[], state : MainStateObject) : boolean {
  let containsHelicopter = false;
  resourceIds.forEach(resourceId => {
    const resource = state.resources.find(resource => resource.Uid === resourceId);
    resource.type === "helicopter" && (containsHelicopter = true);
  })
  return containsHelicopter;
};

function arePositionsEqual(pos1: any[], pos2: any[]): boolean {
  return JSON.stringify(pos1) === JSON.stringify(pos2);
};

function getPostIndex(postAction: ActionBase): number {
  const shape = postAction.fixedMapEntity.geometricalShape;
  const selectedPosition = shape.selectedPosition;
  return shape.availablePositions.findIndex(pos => arePositionsEqual(pos, selectedPosition));
};

function getPostLetter(postIndex: number): string {
  return String.fromCharCode(65 + postIndex);
};

function getResourcesEnum(resourcesId : number[], state : MainStateObject) : string {
  if (!resourcesId.length) return "aucune";
  const resourceTypesNumbers : { typeName : string, ammount : number }[] = [];
  resourcesId.forEach(resourceId => {
    const resource = state.resources.find(resource => resource.Uid === resourceId);
    if (resource) {
      if(!resourceTypesNumbers.some(resourceType => resourceType.typeName === resource.type)) {
        resourceTypesNumbers.push({typeName : resource.type, ammount : 1});
      }else{
        const resourceType = resourceTypesNumbers.find(resourceType => resourceType.typeName === resource.type);
        resourceType && resourceType.ammount++;
      };
    };
  });
  let resourcesEnum = ``;
  resourceTypesNumbers.forEach(resourceType => {
    resourcesEnum += `
    ` + getTitle(resourceType.typeName) + ` : ` + resourceType.ammount;
  });
  return resourcesEnum;
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
    specialPositionChangeEvent && positions.push([specialPositionChangeEvent.fixedMapEntity.id, (specialPositionChangeEvent.startTime + specialPositionChangeEvent.durationSec)/60]);
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
    specialPositionChangeEvent && positions.push([specialPositionChangeEvent.fixedMapEntity.id, (specialPositionChangeEvent.startTime + specialPositionChangeEvent.durationSec)/60]);
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
    const initialPositionEvent = getUniqueEvent(state, "appoint-EVASAN-title");
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
    const creatorRole = getCreatorRole(state, "LEADPMA");
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


export function getActorsPositions(state : MainStateObject, roles : Role[] | "All" = "All", time : number = 0) : Partial<Record<Role, any>>{
    type PositionFunction = (state: MainStateObject, time: number) => any;
    const actorsPositions : Partial<Record<Role, any>> = {};
    const functionCaller : Record<Role, PositionFunction> = { AL: getALPositions, ACS: getACSPositions, MCS: getMCSPositions, EVASAN: getEVASANPositions, LEADPMA: getLEADPMAPositions };
    let rolesToCheck : Role[] = roles === "All" ? ["AL", "ACS", "MCS", "EVASAN", "LEADPMA"] : roles;
    rolesToCheck.forEach(role => {
      const positionalInfo = functionCaller[role](state, time);
      const cleanPosition : {position : string, time : number} = {position : "", time : 0};
      const cleanPositions : {position : string, time : number}[] = [];
      Array.isArray(positionalInfo) ?
      positionalInfo.forEach(positionData => {
        cleanPositions.push({position : positionData[0], time : positionData[1]})
      })
      : cleanPosition.position = positionalInfo 
      cleanPosition.time = time;
      actorsPositions[role] = cleanPosition.time ? cleanPosition : cleanPositions;
    });
    return actorsPositions;
}

export function getMETHANE(state : MainStateObject) : CategorisedEventList[] {
    const actions = getActionList(state);
    const methane : CategorisedEventList[] = []

    const methaneEvents : Event[] = [];
    // "-" interpreted as minus, leading to number casting in resourceRequest.ACS-MCS and resourceRequest.PC-San
    const acsMcsResourceName = "ACS-MCS";
    const pcSanResourceName = "PC-San";
    actions.filter(action => action.casuMessagePayload?.messageType === "METHANE").forEach(action => {methaneEvents.push(getSimplifiedAction(action, `M - ` + action.casuMessagePayload.major + `
E - ` + action.casuMessagePayload.exact + `
T - ` + action.casuMessagePayload.incidentType + `
H - ` + action.casuMessagePayload.hazards + `
A - ` + action.casuMessagePayload.access + `
N - ` + action.casuMessagePayload.victims + `
E - ` + action.casuMessagePayload.resourceRequest[acsMcsResourceName] + ` ACS-MCS 
    ` + action.casuMessagePayload.resourceRequest[pcSanResourceName] + ` PC-San 
    ` + action.casuMessagePayload.resourceRequest.PMA  + ` PMA 
    ` + action.casuMessagePayload.resourceRequest.Ambulance + ` Ambulance
    ` + action.casuMessagePayload.resourceRequest.SMUR + ` SMUR 
    ` + action.casuMessagePayload.resourceRequest.Helicopter + ` Helicoptère 
    ` + action.casuMessagePayload.resourceRequest.PICA + ` PICA `))
    });
    methane.push({ category : "METHANE", events : methaneEvents });

    return methane
}

function getComms(state : MainStateObject) : CategorisedEventList[] {

    const actions = getActionList(state);
    const comms : CategorisedEventList[] = [];

    const situationEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "situation-update-title").forEach(action => situationEvents.push(getSimplifiedAction(action, "")));
    comms.push({ category : "Situation" , events : situationEvents});

    const openCommsEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "activate-radio-schema-title").forEach(action => openCommsEvents.push(getSimplifiedAction(action, "")));
    comms.push({ category : "OpenComms", events : openCommsEvents })

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
    comms.push({ category : "SentMessages", events : sentMessagesEvents })
    comms.push({ category : "ReceivedMessages", events : receivedMessagesEvents})


    return comms
}

function getEvacs(state : MainStateObject) : CategorisedEventList[] {
    const actions = getActionList(state);
    const evacs : CategorisedEventList[] = [];

    const ambulanceEvacsEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "evacuate-title").forEach(evac => {
      if (!containsAmbulance(evac.involvedResourcesId, state)) return;
      ambulanceEvacsEvents.push(getSimplifiedAction(evac, `Évacuation :
      
patient : ` + evac.patientId + `
hôpital : ` + getHospitalById(evac.hospitalId).shortName + `
soignants : ` + (evac.involvedResourcesId.length - 2)));
    });
    evacs.push({ category : "AmbulanceEvacs", events : ambulanceEvacsEvents });

    const helicopterEvacsEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "evacuate-title").forEach(evac => {
      if (!containsHelicopter(evac.involvedResourcesId, state)) return;
      helicopterEvacsEvents.push(getSimplifiedAction(evac, `Évacuation :
      
patient : ` + evac.patientId + `
hôpital : ` + getHospitalById(evac.hospitalId).shortName + `
soignants : ` + (evac.involvedResourcesId.length - 2)))
    });
    evacs.push({ category : "HelicopterEvacs", events : helicopterEvacsEvents });

    return evacs;
}

function getPlayerMoves(state : MainStateObject) : CategorisedEventList[] {
    const actions = getActionList(state);
    const playerMoves : CategorisedEventList[] = [];

    const playerMovesEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "move-actor-title").forEach(action => playerMovesEvents.push(getSimplifiedAction(action, `Déplacement vers : ` + action.location)));
    playerMoves.push({ category : "PlayerMoves", events : playerMovesEvents });

    return playerMoves;
}

function getOrders(state : MainStateObject) : CategorisedEventList[] {
    const actions = getActionList(state);
    const orders : CategorisedEventList[] = [];

    const waitingOrdersEvents : Event[] = [];
    actions.filter(action => isWaitingOrder(action, state)).forEach(action => {waitingOrdersEvents.push(getSimplifiedAction(action, `Tâche : ` + getTaskType(action, state) + `
Depuis : ` + action.sourceLocation + `
À : ` + action.targetLocation + `
Ressources :` + getResourcesEnum(action.involvedResourcesId, state)))});
    orders.push({ category : "WaitingOrders", events : waitingOrdersEvents });

    const pretriageOrdersEvents : Event[] = [];
    actions.filter(action => isPretriageOrder(action, state)).forEach(action => pretriageOrdersEvents.push(getSimplifiedAction(action, `Tâche : ` + getTaskType(action, state) + `
Depuis : ` + action.sourceLocation + `
À : ` + action.targetLocation + `
Ressources :` + getResourcesEnum(action.involvedResourcesId, state))));
    orders.push({ category : "PretriageOrders", events : pretriageOrdersEvents });

    const porterOrdersEvents : Event[] = [];
    actions.filter(action => isPorterOrder(action, state)).forEach(action => porterOrdersEvents.push(getSimplifiedAction(action, `Tâche : ` + getTaskType(action, state) + `
Depuis : ` + action.sourceLocation + `
À : ` + action.targetLocation + `
Ressources :` + getResourcesEnum(action.involvedResourcesId, state))));
    orders.push({ category : "PorterOrders", events : porterOrdersEvents });

    return orders;
}

function getRoles(state : MainStateObject) : CategorisedEventList[] {
    const actions = getActionList(state);
    const roles : CategorisedEventList[] = [];

    const leadPmaRoleEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "appoint-LeadPMA-title").forEach(action => leadPmaRoleEvents.push(getSimplifiedAction(action, "")));
    roles.push({ category : "LeadPMARole", events : leadPmaRoleEvents })

    const evasanRoleEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "appoint-EVASAN-title").forEach(action => evasanRoleEvents.push(getSimplifiedAction(action, "")));
    roles.push({ category : "EVASANRole", events : evasanRoleEvents })

    return roles
}

function getPosts(state : MainStateObject) : CategorisedEventList[] {
    const actions = getActionList(state);
    const posts : CategorisedEventList[] = [];

    const pcFrontPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-pcFront-title").forEach(action => pcFrontPostEvents.push(getSimplifiedAction(action, `Position du pcFront : ` + getPostLetter(getPostIndex(action)))));
    posts.push({ category : "PcFrontPost", events : pcFrontPostEvents });
    
    const nestPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-Nest-title").forEach(action => nestPostEvents.push(getSimplifiedAction(action, `Position du nid de blessés : ` + getPostLetter(getPostIndex(action)))));
    posts.push({ category : "NestPost", events : nestPostEvents });
    
    const ambulancePostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-ambulance-park-title").forEach(action => ambulancePostEvents.push(getSimplifiedAction(action, `Position de parking des ambulances : ` + getPostLetter(getPostIndex(action)))));
    posts.push({ category : "AmbulancePost", events : ambulancePostEvents });

    const helicopterPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-helicopter-park-title").forEach(action => helicopterPostEvents.push(getSimplifiedAction(action, `Position de parking des helicoptères : ` + getPostLetter(getPostIndex(action)))));
    posts.push({ category : "HelicopterPost", events : helicopterPostEvents });
    
    const accregPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-accreg-title").forEach(action => accregPostEvents.push(getSimplifiedAction(action, `Position des voies d'accès et d'évac. : ` + getPostLetter(getPostIndex(action)))));
    posts.push({ category : "AccregPost", events : accregPostEvents });
    
    const pmaPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-PMA-title").forEach(action => pmaPostEvents.push(getSimplifiedAction(action, `Position du PMA : ` + getPostLetter(getPostIndex(action)))));
    posts.push({ category : "PMAPost", events : pmaPostEvents });
    
    const pcPostEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-PC-title").forEach(action => pcPostEvents.push(getSimplifiedAction(action, `Position du PC SAN : ` + getPostLetter(getPostIndex(action)))));
    posts.push({ category : "PCPost", events : pcPostEvents });
    
    return posts
}

function getAnnouncements(state : MainStateObject) : CategorisedEventList[] {
    const actions = getActionList(state);
    const announcements : CategorisedEventList[] = [];

    const acsMscArrivalAnnouncementEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-acsMscArrival-title").forEach(action => acsMscArrivalAnnouncementEvents.push(getSimplifiedAction(action, "")));
    announcements.push({ category : "AcsMscArrivalAnnouncement", events : acsMscArrivalAnnouncementEvents })
    
    const evasanArrivalAnnouncementEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-evasanArrival-title").forEach(action => evasanArrivalAnnouncementEvents.push(getSimplifiedAction(action, "")));
    announcements.push({ category : "EvasanArrivalAnnouncement", events : evasanArrivalAnnouncementEvents })
    
    const leadpmaArrivalAnnouncementEvents : Event[] = [];
    actions.filter(action => action.actionNameKey === "define-leadpmaArrival-title").forEach(action => leadpmaArrivalAnnouncementEvents.push(getSimplifiedAction(action, "")));
    announcements.push({ category : "LeadpmaArrivalAnnouncement", events : leadpmaArrivalAnnouncementEvents })
    
    return announcements
}

function getVehicleArrivals(state : MainStateObject) : CategorisedEventList[] {
    const messages =  state.radioMessages;
    const vehicleArrivals : CategorisedEventList[] = [];

    const ambulanceArrivalsEvents : Event[] = [];
    messages.filter(message => message.message === "Arrivée de 2 ambulancier").forEach(message =>  {
      const simplifiedRecievedMessage = getSimplifiedMessageNoInfo(message, "recipient");
      simplifiedRecievedMessage && ambulanceArrivalsEvents.push(simplifiedRecievedMessage);
    });
    vehicleArrivals.push({ category : "AmbulanceArrivals", events : ambulanceArrivalsEvents });

    const helicopterArrivalsEvents : Event[] = [];
    messages.filter(message => message.message === "Arrivée de 1 ambulancier, 1 medecinSenior").forEach(message =>  {
      const simplifiedRecievedMessage = getSimplifiedMessageNoInfo(message, "recipient");
      simplifiedRecievedMessage && helicopterArrivalsEvents.push(simplifiedRecievedMessage);
    });
    vehicleArrivals.push({ category : "HelicopterArrivals", events : helicopterArrivalsEvents });

    const smurArrivalsEvents : Event[] = [];
    messages.filter(message => message.message === "Arrivée de 1 ambulancier, 1 medecinJunior").forEach(message =>  {
      const simplifiedRecievedMessage = getSimplifiedMessageNoInfo(message, "recipient");
      simplifiedRecievedMessage && smurArrivalsEvents.push(simplifiedRecievedMessage);
    });
    vehicleArrivals.push({ category : "SmurArrivals", events : smurArrivalsEvents });

    return vehicleArrivals;
}

function getCategoryEvents(state : MainStateObject, category : MainCategory) : CategorisedEventList[] {
    if (!["METHANE", "Comms", "Evacs", "PlayerMoves", "Orders", "Roles", "Posts", "Announcements", "VehicleArrivals"].includes(category)) return [];
    const functionCaller = { METHANE: getMETHANE, Comms: getComms, Evacs: getEvacs, PlayerMoves: getPlayerMoves, Orders: getOrders, Roles: getRoles, Posts: getPosts, Announcements: getAnnouncements, VehicleArrivals: getVehicleArrivals };
    return functionCaller[category](state)
}


export function getCategorisedEvents(state : MainStateObject, categories : { [key in MainCategory]: boolean } | "ALL") : CategorisedEventList[] {
    if (categories === "ALL") return getAllCategorisedEvents(state);

    const categorisedEvents : CategorisedEventList[] = [];
    Object.entries(categories).forEach(([category, isEnabled]) => {
      if (isEnabled) {
        getCategoryEvents(state, category as MainCategory).forEach(subcategoryEvents => categorisedEvents.push(subcategoryEvents));
      }
    });
    return categorisedEvents;
}

function getAllCategorisedEvents(state : MainStateObject) {
    const categories = { METHANE: true, Comms: true, Evacs: true, PlayerMoves: true, Orders: true, Roles: true, Posts: true, Announcements: true, VehicleArrivals: true };
    return getCategorisedEvents(state, categories);
}

// Stats

function getPatientList(state : MainStateObject) {
    return state.patients;
}
  
export function countDeadPatients(state : MainStateObject) : number {
    const patients = getPatientList(state);
    const deadPatientCount = patients.reduce((acc, patient) => {
        if (patient.humanBody.state.vitals.cardio.hr === 0) {
        acc++;
        }
        return acc;
    }, 0);
    return deadPatientCount;
}

export function countPatients(state : MainStateObject) {
    const patients = getPatientList(state);
    return patients.length;
}

export function getMortalityRate(state : MainStateObject) : string { 
    const deadPatients = countDeadPatients(state);
    const totalPatients = countPatients(state);
    return totalPatients > 0 ? ((deadPatients / totalPatients) * 100).toFixed(0) : "0";
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

// Left if needed for future implementation

// function getAverageMETHANE(teamsStates : MainStateObject[]) {
//     let totalStartTime = 0;
//     let teamsNumber = 0;
//     teamsStates.forEach(teamState => {
//         const METHANE = getMETHANE(teamState);
//         if (METHANE) {
//             totalStartTime += METHANE.startTime/60;
//             teamsNumber++;
//         } 
//     });
//     return teamsNumber > 0 ? totalStartTime/teamsNumber : 0;
// }

// function getAveragePostTime(postName, teamsStates : MainStateObject[]) {
//     let totalStartTime = 0;
//     let teamsNumber = 0;
//     teamsStates.forEach(teamState => {
//         const postEvent = getUniqueEvent(teamState, `define-${postName}-title`);
//         if (postEvent) {
//             totalStartTime += (postEvent.startTime + postEvent.durationSec)/60;
//             teamsNumber++;
//         }
//     });
//     return teamsNumber > 0 ? totalStartTime/teamsNumber : 0;
// }

// function getAverageRoleTime(roleName : Role, teamsStates : MainStateObject[]) {
//     let totalStartTime = 0;
//     let teamsNumber = 0;
//     teamsStates.forEach(teamState => {
//         const roleEvent = getUniqueEvent(teamState, `appoint-${roleName}-title`);
//         if (roleEvent) {
//             totalStartTime += (roleEvent.startTime + roleEvent.durationSec)/60;
//             teamsNumber++;
//         }
//     });
//     return teamsNumber > 0 ? totalStartTime/teamsNumber : 0;
// }

// export function getAverageTime(eventName, teamsStates : MainStateObject[]) {
//     switch (eventName) {
//         case "METHANE":
//             return getAverageMETHANE(teamsStates);
//         case "Nest" :
//         case "PC" :
//         case "PMA" :
//         case "accreg" :
//         case "ambulance-park" :
//         case "helicopter-park":
//             return getAveragePostTime(eventName, teamsStates);
//         case "EVASAN" :
//         case "LEADPMA":
//             return getAverageRoleTime(eventName, teamsStates);
//         default:
//             return null;
//     }
// }