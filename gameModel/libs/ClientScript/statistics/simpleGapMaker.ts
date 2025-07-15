import { ActionBase } from '../game/common/actions/actionBase';
import { MainStateObject } from '../game/common/simulationState/mainSimulationState';
import { AnalysisDashboardState } from './analysisDashboard';
import { Category, Role, Event, CategorisedEventList, getCategorisedEvents, getOwnerRole } from './helpers';

/*x*/export function getCommsClass(event: ActionBase): string {
  if (event.actionNameKey && event.actionNameKey.includes('situation')) return 'situation';
  return 'radio';
}

/*x*/export function getOrdersClass(event: ActionBase, state: MainStateObject): string {
  const targetTaskId = event.targetTaskId;
  const task = state.tasks.find(task => task.Uid === targetTaskId);
  return task.taskType;
}

/*x*/export function getRolesClass(event: ActionBase): string {
  //returns role thanks to appoint-role-title formatting
  return event.actionNameKey.split('-')[1];
}

/*x*/export function getPostsClass(event: ActionBase): string {
  //returns post thanks to define-post-title formatting
  return event.actionNameKey.split('-')[1];
}

/*x*/export function getAnnouncementsClass(event: ActionBase): string {
  //returns announcement thanks to define-announcement-title formatting
  return event.actionNameKey.split('-')[1];
}

function getStyleClass(
  twelfth: number,
  events: /*x*/[Category, string, ActionBase][],
  // events: [Category, Event][]
/*x*/state: MainStateObject
): string {
  if (!events.length) return '';
  const index = Math.floor(twelfth / (12 / events.length));
  const [category, role, event] = events[index];
  //calling a function to figure out what class should be returned when a category contains sub-categories
  // return category
/*x*/switch (category) {
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
          <div style="display: flex; position: relative; padding: 0px;">
            <div class="eventSquare ` +
      getStyleClass(twelfth, events, state) +
      `" style="display: flex; flex: 1 1 auto;"></div>
          </div>`;
  }
  return twelfths;
}

function getMinuteState(
  minute: number,
/*x*/  state: [Category, ActionBase[]][],
  // events: CategorisedEventList[], 
  mainState: MainStateObject,
  role: Role
): [string, string, ActionBase][] {
  const events: [Category, string, ActionBase][] = [];
/*x*/state.forEach(([categoryName, eventList]) => {
    if (eventList.length > 0) {
      eventList.forEach(event => {
        if (event.startTime === minute * 60 || event.timeStamp === minute * 60) {
          const ownerRole = getOwnerRole(mainState, event.ownerId);
          if (role === 'All' || ownerRole === role) {
            events.push([categoryName, getOwnerRole(mainState, event.ownerId), event]);
          }
        }
      });
    }
  });
  /* events.forEach(categorisedEvents => {
    if(!categorisedEvents.events.length) return
    categorisedEvents.events.forEach(event => {
      if (event.startTime === minute) {
        const ownerRole = getOwnerRole(mainState, event.ownerId);
        if (role === 'All' || ownerRole === role) {
          events.push([categoriseEvents.category, event]);
        }
      }
    })
  })*/

  return events;
}

//exists because passing a variable to a style property is not possible in WEGAS
export function createMinuteSquare(
  time: { minute: number; lastMinute: number },
  added: number,
  state: MainStateObject,
  dashboardState: AnalysisDashboardState,
  role: Role = 'All'
): string {
  if (time.minute + added > time.lastMinute) return '';
  //last is necessary because '+' cannot be included by using the `...` + string + `...` method
  const last = time.minute + added === time.lastMinute ? ' last' : '';
  let minuteSquare =
    `<div class="eventContainer` +
    last +
    `" style="display: flex; position: relative; --minutes-count: ` +
    time.lastMinute +
    `">
    <div style="display: flex; flex: 1 1 auto;">
      <div class="minute-square" style="display: flex; position; relative; padding: 0">
        <div style="display: flex; flex: 1 1 auto;">`;
  let events = getMinuteState(
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
