import { ActionBase } from '../game/common/actions/actionBase';
import { MainStateObject } from '../game/common/simulationState/mainSimulationState';
import { AnalysisDashboardState } from './analysisDashboard';
import { getCategorisedEvents, getOwnerRole } from './helpers';

export function getCommsClass(event: ActionBase): string {
  if (event.actionNameKey && event.actionNameKey.includes('situation')) return 'situation';
  return 'radio';
}

export function getOrdersClass(event: ActionBase, state: MainStateObject): string {
  const targetTaskId = event.targetTaskId;
  const task = state.tasks.find(task => task.Uid === targetTaskId);
  return task.taskType;
}

export function getRolesClass(event: ActionBase): string {
  //returns role thanks to appoint-role-title formatting
  return event.actionNameKey.split('-')[1];
}

export function getPostsClass(event: ActionBase): string {
  //returns post thanks to define-post-title formatting
  return event.actionNameKey.split('-')[1];
}

export function getAnnouncementsClass(event: ActionBase): string {
  //returns announcement thanks to define-announcement-title formatting
  return event.actionNameKey.split('-')[1];
}

function getStyleClass(
  twelfth: number,
  events: [string, string, ActionBase][],
  state: MainStateObject
): string {
  if (!events.length) return '';
  const index = Math.floor(twelfth / (12 / events.length));
  const [category, role, event] = events[index];
  //calling a function to figure out what class should be returned when a category contains sub-categories
  switch (category) {
    case 'Comms':
      return `` + category + ` ` + getCommsClass(event) + ``;
    case 'Orders':
      return `` + category + ` ` + getOrdersClass(event, state) + ``;
    case 'Roles':
      return `` + category + ` ` + getRolesClass(event) + ``;
    case 'Posts':
      return `` + category + ` ` + getPostsClass(event) + ``;
    case 'Announcements':
      return `` + category + ` ` + getAnnouncementsClass(event) + ``;
    default:
      return category;
  }
}

function createTwelfths(events: [string, string, ActionBase][], state: MainStateObject): string {
  let twelfths = '';
  for (let twelfth = 0; twelfth < 12; twelfth++) {
    twelfths +=
      `
          <div class="css-oncjkf css-whfv5v " style="padding: 0px;">
            <div class="eventSquare ` +
      getStyleClass(twelfth, events, state) +
      `" style="display: flex; flex: 1 1 auto;"></div>
          </div>`;
  }
  return twelfths;
}

function getMinuteState(
  minute: number,
  state: [string, ActionBase[]][],
  mainState: MainStateObject,
  role: string
): [string, string, ActionBase][] {
  const events: [string, string, ActionBase][] = [];
  state.forEach(([categoryName, eventList]) => {
    if (eventList.length > 0) {
      eventList.forEach(event => {
        if (event.startTime === minute * 60 || event.timeStamp === minute * 60) {
          const ownerRole = getOwnerRole(mainState, event.ownerId);
          if (role === 'ALL' || ownerRole === role) {
            events.push([categoryName, getOwnerRole(mainState, event.ownerId), event]);
          }
        }
      });
    }
  });

  return events;
}

//exists because passing a variable to a style property is not possible in WEGAS
export function createMinuteSquare(
  time: { minute: number; lastMinute: number },
  added: number,
  state: MainStateObject,
  dashboardState: AnalysisDashboardState,
  role: string = 'ALL'
): string {
  if (time.minute + added > time.lastMinute) return '';
  //last is necessary because '+' cannot be included by using the `...` + string + `...` method
  const last = time.minute + added === time.lastMinute ? ' last' : '';
  let minuteSquare =
    `<div class="css-oncjkf css-whfv5v eventContainer` +
    last +
    `" style="--minutes-count: ` +
    time.lastMinute +
    `">
    <div style="display: flex; flex: 1 1 auto;">
      <div class="css-oncjkf css-whfv5v minute-square" style="padding: 0">
        <div style="display: flex; flex: 1 1 auto;">`;
  let events = getCategorisedEvents(state, dashboardState.categories);
  events = getMinuteState(
    time.minute + added,
    getCategorisedEvents(state, dashboardState.categories),
    state,
    role
  );
  minuteSquare += createTwelfths(events, state);
  minuteSquare += `
        </div>
      </div>
    </div>
  </div>`;
  return minuteSquare;
}
