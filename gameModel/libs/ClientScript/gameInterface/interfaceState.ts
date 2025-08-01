import { Actor } from '../game/common/actors/actor';
import { HospitalId, PatientId, PatientUnitId, TaskId } from '../game/common/baseTypes';
import { EvacuationSquadType } from '../game/common/evacuation/evacuationSquadDef';
import { HospitalProximity } from '../game/common/evacuation/hospitalType';
import { RadioType } from '../game/common/radio/communicationType';
import {
  ResourceContainerType,
  ResourceContainerTypeArray,
} from '../game/common/resources/resourceContainer';
import { CommMedia } from '../game/common/resources/resourceReachLogic';
import { ResourcesArray, ResourceType } from '../game/common/resources/resourceType';
import { LOCATION_ENUM } from '../game/common/simulationState/locationState';
import { mainSimLogger } from '../tools/logger';
import { getDefaultSituationUpdateDuration } from '../UIfacade/actionFacade';
import { getCurrentPlayerActors } from '../UIfacade/actorFacade';
import { initResourceManagementCurrentTaskId } from '../UIfacade/taskFacade';
import { applyPendingCallbacks } from './afterUpdateCallbacks';
import { SelectedPanel } from './selectedPanel';

export enum ResourcesManagementActivityType {
  assignTask = 'assignTask',
  requestReport = 'requestReport',
}

export type CasuAction = 'CasuMessage' | 'channelsActivation' | 'freeMessage' | undefined;

export interface InterfaceState {
  currentActorUid: number | undefined;
  currentActionUid: number;
  moveActorChosenLocation: LOCATION_ENUM | undefined;
  situationUpdateDuration: number;
  getHospitalInfoChosenProximity: HospitalProximity | undefined;
  showPatientModal: boolean;
  selectedPatient: PatientId | undefined;
  timeForwardAwaitingConfirmation: boolean;
  showLeftPanel: boolean;
  selectedPanel: SelectedPanel;
  selectedMapObjectId: string;
  selectedRadioChannel: RadioType;
  updatedChannelMessagesAt: number;
  radioMessageInput: Partial<Record<RadioType, string>>;
  selectedCasuAction: CasuAction;
  casuMessage: CasuMessage;
  resources: {
    allocateResources: {
      currentTaskId: TaskId | undefined;
      targetLocation: LOCATION_ENUM | undefined;
      targetTaskId: TaskId | undefined;
    } & Partial<Record<ResourceType, number>>;
    allocateResourcesRadio: {
      currentLocation: LOCATION_ENUM | undefined;
      currentTaskId: TaskId | undefined;
      targetLocation: LOCATION_ENUM | undefined;
      targetTaskId: TaskId | undefined;
    } & Partial<Record<ResourceType, number>>;
    requestedResources: Partial<Record<ResourceContainerType, number>>;
  };
  resourcesManagement: {
    activityType: ResourcesManagementActivityType | undefined;
    pretriageReportRequestLocation: LOCATION_ENUM | undefined;
  };
  evacuation: {
    data: {
      patientId: PatientId | undefined;
      hospitalId: HospitalId | undefined;
      patientUnitId: PatientUnitId | undefined;
      transportSquad: EvacuationSquadType | undefined;
      doResourcesComeBack: boolean;
    };
    form: {
      showPatientChoice: boolean;
      showDestinationChoice: boolean;
      showVectorChoice: boolean;
    };
  };
}

interface CasuMessage {
  messageType: string;
  major: string;
  exact: string;
  incidentType: string;
  hazards: string;
  access: string;
  victims: string;
}

// used in page 43
export function getInitialInterfaceState(): InterfaceState {
  return {
    currentActorUid: getCurrentPlayerDefaultActor()?.Uid,
    currentActionUid: 0,
    casuMessage: {
      messageType: '',
      major: '',
      exact: '',
      incidentType: '',
      hazards: '',
      access: '',
      victims: '',
    },
    resources: {
      allocateResources: getEmptyAllocateResources(),
      allocateResourcesRadio: getEmptyAllocateResourcesRadio(),
      requestedResources: getEmptyResourceRequest(),
    },
    evacuation: getEmptyEvacuationInterfaceState(),
    moveActorChosenLocation: undefined,
    situationUpdateDuration: getDefaultSituationUpdateDuration(),
    getHospitalInfoChosenProximity: undefined,
    showPatientModal: false,
    selectedPatient: undefined,
    timeForwardAwaitingConfirmation: false,
    showLeftPanel: true,
    selectedMapObjectId: '0',
    // selectedMapObject: '',
    selectedPanel: SelectedPanel.actions,
    selectedRadioChannel: RadioType.CASU,
    updatedChannelMessagesAt: 0,
    radioMessageInput: {},
    selectedCasuAction: undefined,
    resourcesManagement: {
      activityType: undefined,
      pretriageReportRequestLocation: undefined,
    },
  };
}

function getCurrentPlayerDefaultActor(): Actor | undefined {
  return getCurrentPlayerActors()[0];
}

export function getEmptyAllocateResourcesRadio(): InterfaceState['resources']['allocateResourcesRadio'] {
  const resources = getEmptyResources();

  return {
    currentLocation: undefined,
    currentTaskId: undefined,
    targetLocation: undefined,
    targetTaskId: undefined,
    ...resources,
  };
}

export function getEmptyAllocateResources(): InterfaceState['resources']['allocateResources'] {
  const resources = getEmptyResources();

  return {
    currentTaskId: initResourceManagementCurrentTaskId(
      getCurrentPlayerDefaultActor()?.Uid,
      getCurrentPlayerDefaultActor()?.Location,
      CommMedia.Direct
    ),
    targetLocation: undefined,
    targetTaskId: undefined,
    ...resources,
  };
}

function getEmptyResources(): Partial<Record<ResourceType, number>> {
  const resources: Partial<Record<ResourceType, number>> = {};
  ResourcesArray.forEach(t => {
    resources[t] = 0;
  });
  return resources;
}

export function getEmptyResourceRequest(): Partial<Record<ResourceContainerType, number>> {
  const resourceRequest: Partial<Record<ResourceContainerType, number>> = {};
  ResourceContainerTypeArray.forEach(t => {
    resourceRequest[t] = 0;
  });
  return resourceRequest;
}

export function getEmptyEvacuationInterfaceState(): InterfaceState['evacuation'] {
  return {
    data: {
      patientId: undefined,
      hospitalId: undefined,
      patientUnitId: undefined,
      transportSquad: undefined,
      doResourcesComeBack: true,
    },
    form: {
      showPatientChoice: false,
      showDestinationChoice: false,
      showVectorChoice: false,
    },
  };
}

export function triggerInterfaceStateUpdate(state: InterfaceState) {
  if (state.currentActorUid === undefined && getCurrentPlayerActors().length > 0) {
    setInterfaceState({ currentActorUid: getCurrentPlayerActors()[0]?.Uid });
  }

  //mainSimLogger.debug('applying callbacks', state.currentActorUid);
  applyPendingCallbacks(state);
}

/**
 * @param update, an object that only contains the change set to be applied to the interface state
 */
export function setInterfaceState(update: Partial<InterfaceState>): void {
  const newState = Helpers.cloneDeep(Context.interfaceState.state);

  function updateSubStateRecursive(
    src: Record<string, any>,
    target: Record<string, any>,
    depth: number
  ): void {
    if (depth > 20) {
      // safety break
      mainSimLogger.warn(
        'Stopping recursion on update of object, too much depth (circular reference ?)'
      );
      return;
    }
    for (const key in src) {
      const t = target[key];
      if (t && typeof t === 'object') {
        updateSubStateRecursive(src[key], t, ++depth);
      } else {
        // either a primitive or target was null thus assigning src object is ok
        target[key] = src[key];
      }
    }
  }
  updateSubStateRecursive(update, newState, 0);
  Context.interfaceState.setState(newState);
}

/**
 * For convenience
 * Just casting the interface state properly
 */
export function getTypedInterfaceState(): InterfaceState {
  return Context.interfaceState.state;
}
