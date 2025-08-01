import { MainSimulationState } from '../game/common/simulationState/mainSimulationState';
import { getCurrentState } from '../game/mainSimulationLogic';
import { InterfaceState } from '../gameInterface/interfaceState';
import { openOverlayItem } from '../gameMap/mapEntities';

export type AfterUpdateCallback = (
  prevState: Readonly<MainSimulationState>,
  currState: Readonly<MainSimulationState>,
  intState: Partial<InterfaceState>
) => void;

let afterUpdateCallbacks: AfterUpdateCallback[] = [];
let previousState: Readonly<MainSimulationState> | undefined;

function clearAfterEventsProcessingCallbacks(): void {
  afterUpdateCallbacks = [];
}

/**
 * Added callback will be called the next time the game's state changes.
 * It is called once and removed
 */
function addAfterUpdateCallback(callback: AfterUpdateCallback): void {
  if (!callback) return;
  afterUpdateCallbacks.push(callback);
}

/**
 * Sets the previous state reference that will be passed to the callback functions
 */
export function setPreviousReferenceState(prevState: Readonly<MainSimulationState>): void {
  // only update the previous state if the pending callbacks have been called
  if (!previousState) {
    previousState = prevState;
  }
}

/**
 * If a previous reference state has been set,
 * applies the pending callbacks and clears the callback list
 */
export function applyPendingCallbacks(current: Readonly<InterfaceState>): Partial<InterfaceState> {
  if (previousState) {
    const ps = previousState;
    const interfaceStateClone = Helpers.cloneDeep(current);
    afterUpdateCallbacks.forEach(callback => {
      callback(ps, getCurrentState(), interfaceStateClone);
    });

    clearAfterEventsProcessingCallbacks();
    previousState = undefined;
  }
  return current;
}

/**
 * opens the position of the selected actor if it has moved since the previous reference state
 */
export function registerOpenSelectedActorPanelAfterMove(): void {
  const f: AfterUpdateCallback = function (
    oldState: Readonly<MainSimulationState>,
    current: Readonly<MainSimulationState>,
    intState: Partial<InterfaceState>
  ) {
    const id = intState.currentActorUid;

    if (id) {
      const oldLoc = oldState.getActorById(id)?.Location;
      const newLoc = current.getActorById(id)?.Location;
      if (newLoc && oldLoc !== newLoc) {
        openOverlayItem(newLoc);
      }
    }
  };

  addAfterUpdateCallback(f);
}
