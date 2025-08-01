import { MainStateObject } from '../game/common/simulationState/mainSimulationState';
import { AnalysisDashboardState } from './analysisDashboard';
import { Category, Role, Event, CategorisedEventList, getCategorisedEvents, getOwnerRole } from './helpers';

function getStyleClass(
  twelfth: number,
  events: [Category, Event][],
  afterEnd: boolean
): string {
  if (!events.length) return '';
  const index = Math.floor(twelfth / (12 / events.length));
  const [category, event] = events[index];
  return category;
}

function createTwelfths(events: [Category, Event][], afterEnd: boolean): string {
  let twelfths = '';
  for (let twelfth = 0; twelfth < 12; twelfth++) {
    twelfths +=
      `
          <div style="display: flex; position: relative; padding: 0px;">
            <div class="eventSquare ` +
      getStyleClass(twelfth, events, afterEnd) +
      `" style="display: flex; flex: 1 1 auto;"></div>
          </div>`;
  }
  return twelfths;
}

function getMinuteState(
  minute: number,
  eventList: CategorisedEventList[], 
  mainState: MainStateObject,
  role: Role,
  noEvacArr: boolean = true
): [Category, Event][] {
  const events: [Category, Event][] = [];
  eventList.forEach(categorisedEvents => {
    if(!categorisedEvents.events.length || noEvacArr && categorisedEvents.category === "AmbulanceEvacs" || categorisedEvents.category === "HelicopterEvacs" || categorisedEvents.category === "AmbulanceArrivals" || categorisedEvents.category === "HelicopterArrivals" || categorisedEvents.category === "SmurArrivals") return
    categorisedEvents.events.forEach(event => {
      if (event.startTime === minute) {
        const ownerRole = getOwnerRole(mainState, event.ownerId);
        if (ownerRole !== "CASU" && role === 'All' || ownerRole === role) {
          events.push([categorisedEvents.category, event]);
        }
      }
    })
  })

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
  // const last is necessary because 'time.minute + added' cannot be included by using the `...` + string + `...` method
  const last = time.minute + added === time.lastMinute ? ' last' : '';
  const afterEnd: boolean = time.minute + added > state.simulationTimeSec / 60
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
  minuteSquare += createTwelfths(events, afterEnd);
  minuteSquare += `
        </div>
      </div>
    </div>
  </div>`;
  return minuteSquare;
}

export function createNoMinuteParallelogram(lastMinute: number, lastTeamMinute: number, minute: number, firstInMinute: boolean, lastInMinute: boolean) : string {
  const first = (minute === 0 && firstInMinute) ? ' first' : '';
  const last = (minute === lastMinute && lastInMinute) ? ' last' : '';
  return `<div style="display: flex; --minutes-count: ` + lastMinute + `" class="parallelogram` + 
  first + `` + 
  last + `"></div>`;
}

export function getMinuteBubbleContent(minute: number, state: MainStateObject, dashboardState: AnalysisDashboardState, role: Role = "All") : string {
  let bubbleInfo = "";
  const minuteState = getMinuteState(minute, getCategorisedEvents(state, dashboardState.categories), state, role, false);
  minuteState.forEach(categoryEvent => {
    const [category, event] = categoryEvent;
    event.info.length && (bubbleInfo += event.info + `

`);
  })
  return bubbleInfo;
}
