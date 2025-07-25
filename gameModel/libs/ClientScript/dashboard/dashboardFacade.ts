/**
 * All UX interactions related to trainer dashboard should live here.
 * If any signature is modified make sure to report it in all page scripts.
 * Put minimal logic in here.
 */

import { SimFlag } from '../game/common/actions/actionTemplateBase';
import { InterventionRole } from '../game/common/actors/actor';
import { getRoleLongTranslation, getRoleShortTranslation } from '../game/common/actors/actorLogic';
import {
  getIndexOfSelectedChoice,
  getLocationLongTranslation,
  getLocationShortTranslation,
} from '../game/common/location/locationLogic';
import { LOCATION_ENUM } from '../game/common/simulationState/locationState';
import {
  formatTime,
  buildValidSimDateTime,
  getSimStartDateTime,
  GameState,
} from '../gameInterface/main';
import { getLetterRepresentationOfIndex } from '../tools/helper';
import {
  DashboardGameState,
  fetchAndUpdateTeamsGameState,
  UpdateStateFunc,
} from './dashboardState';
import { CasuMessageAction } from '../game/common/actions/actionBase';
import { getRadioTranslation, getRadioChannels } from '../game/common/radio/radioLogic';
import { getTranslation } from '../tools/translation';
import { getGameModelType, getSelectedTeamName, getTeam, getTestTeamId } from './utils';
import {
  getAllTeamsMultiplayerMatrix,
  getEmptyPlayerMatrix,
  getTeamMultiplayerMatrix,
  MultiplayerMatrix,
  updateTeamMatrix,
} from '../multiplayer/multiplayerManager';
import {
  DashboardUIStateCtx,
  DashboardUIState,
  getTypedDashboardUIState,
  hasSelectedTeam,
  ModalState,
  resetModalCustom,
  TimeForwardDashboardParams,
} from './dashboardUIState';
import {
  sendNotification,
  sendNotificationGame,
  sendRadioMessage,
  sendRadioMessageGame,
  triggerAbsoluteTimeForward,
  triggerAbsoluteTimeForwardGame,
  triggerDashboardTimeForward,
  triggerDashboardTimeForwardGame,
} from './impacts';
import { dashboardLogger } from '../tools/logger';

// -------------------------------------------------------------------------------------------------
// state part
// -------------------------------------------------------------------------------------------------

export function getTime(state: DashboardGameState, teamId: number): string {
  // TODO a global condition on a line
  if (state) {
    return formatTime(getRawTime(state, teamId));
  } else {
    return '...loading';
  }
}

export function getRawTime(state: DashboardGameState, teamId: number): Date {
  const teamState = state[teamId];

  const currentDateTime = getSimStartDateTime();
  if (teamState) {
    currentDateTime.setTime(currentDateTime.getTime() + teamState.simulationTimeSec * 1000);
  }
  return currentDateTime;
}

/**
 * TODO define what information is needed
 * and possibly raise flags to change state
 */
export function getMethaneStatus(state: DashboardGameState, teamId: number): boolean {
  const teamState = state[teamId];

  if (teamState) {
    // TODO make it clean when decided what we want
    return (
      teamState.actions.find(
        act =>
          'casuMessagePayload' in act &&
          (act as unknown as CasuMessageAction)['casuMessagePayload'].messageType !== 'R'
      ) != undefined
    );
  }
  return false;
}

// -------------------------------------------------------------------------------------------------
// roles part
// -------------------------------------------------------------------------------------------------

/**
 * Ordered list of roles to be displayed
 */
export function getRolesArray(): InterventionRole[] {
  return ['AL', 'ACS', 'MCS', 'LEADPMA', 'EVASAN'];
}

export function getRolesContext(): {
  id: InterventionRole;
  role: InterventionRole;
  shortName: string;
  longName: string;
}[] {
  return getRolesArray().map(r => ({
    id: r,
    role: r,
    shortName: getRoleShortTranslation(r),
    longName: getRoleLongTranslation(r),
  }));
}

export function getActorsLocation(
  state: DashboardGameState,
  teamId: number,
  role: InterventionRole
): string {
  const teamState = state[teamId];

  if (teamState) {
    // for the moment, we do not deal with multiple actors with same role
    const location = teamState.actors.find(act => act.Role === role)?.Location;
    if (location) {
      return getLocationShortTranslation(location);
    }
  }
  return '';
}

// -------------------------------------------------------------------------------------------------
// locations part
// -------------------------------------------------------------------------------------------------

/**
 * Ordered list of locations to be displayed
 */
export function getLocationsArray(): LOCATION_ENUM[] {
  return [
    LOCATION_ENUM.pcFront,
    LOCATION_ENUM.PC,
    LOCATION_ENUM.nidDeBlesses,
    LOCATION_ENUM.PMA,
    LOCATION_ENUM.AccReg,
    LOCATION_ENUM.ambulancePark,
    LOCATION_ENUM.helicopterPark,
  ];
}

export function getLocationsContext(): {
  id: LOCATION_ENUM;
  location: LOCATION_ENUM;
  shortName: string;
  longName: string;
}[] {
  return getLocationsArray().map(loc => ({
    id: loc,
    location: loc,
    shortName: getLocationShortTranslation(loc),
    longName: getLocationLongTranslation(loc),
  }));
}

export function getLocationChoice(
  state: DashboardGameState,
  teamId: number,
  location: LOCATION_ENUM
): string {
  const teamState = state[teamId];

  if (teamState) {
    const mapLocation = teamState.mapLocations.find(mapLoc => mapLoc.id === location);

    if (mapLocation) {
      const index = getIndexOfSelectedChoice(mapLocation);

      if (index !== undefined) {
        return getLetterRepresentationOfIndex(index);
      }
    }
  }

  return '';
}

export function showAsOpened(
  state: DashboardGameState,
  teamId: number,
  location: LOCATION_ENUM
): boolean {
  const teamState = state[teamId];

  return !!(teamState && location === LOCATION_ENUM.PMA && teamState.flags[SimFlag.PMA_OPEN]);
}

// -------------------------------------------------------------------------------------------------
// impacts part
// -------------------------------------------------------------------------------------------------

export function getRadioChannelChoices(): { label: string; value: string }[] {
  return Object.values(getRadioChannels()).map(radio => {
    return { label: getRadioTranslation(radio.translationKey), value: radio.type };
  });
}

export function getRadioModeChoices(): { label: string; value: string }[] {
  return [
    {
      label: getTranslation('mainSim-dashboard', 'radio-message'),
      value: 'radio',
    },
    {
      label: getTranslation('mainSim-interface', 'notifications'),
      value: 'notif',
    },
  ];
}

export function getTimeChoices(): { label: string; value: string }[] {
  return [
    {
      label: getTranslation('mainSim-dashboard', 'add-time'),
      value: 'add',
    },
    {
      label: getTranslation('mainSim-dashboard', 'set-time'),
      value: 'set',
    },
  ];
}

export interface TeamGameStateStatus {
  id: number;
  gameState: GameState;
}

export let teamsGameStateStatuses: TeamGameStateStatus[] = [];

/**
 * Get the gameState values for all teams
 */
export async function getAllTeamGameStateStatus(): Promise<TeamGameStateStatus[]> {
  const script = 'CustomDashboard.getGameStateByTeam()';
  let response: IManagedResponse;

  try {
    response = await APIMethods.runScript(script, {});
    const allTeamsGameStateStatus = response.updatedEntities as TeamGameStateStatus[];
    // Filter out 'Test team' unless in SCENARIO mode
    teamsGameStateStatuses = allTeamsGameStateStatus.filter(
      t => t.id !== getTestTeamId() || getGameModelType() === 'SCENARIO'
    );
  } catch (error) {
    dashboardLogger.error(error);
  }

  return teamsGameStateStatuses;
}

/**
 * Get the gameState value for the given teamId
 *
 * @params {number} teamId - Id of given team
 */
export function getGameStateStatus(teamId: number): GameState | undefined {
  if (teamsGameStateStatuses.length === 0) {
    return undefined;
  } else {
    return teamsGameStateStatuses.find(team => team.id === teamId)?.gameState;
  }
}

/**
 * Set the gameState value for the given teamId
 *
 * @params {number} teamId - Id of given team
 * @params {GameState} gameState - Target gameState
 */
export async function setGameStateStatus(
  teamId: number,
  gameState: GameState,
  ctx: DashboardUIStateCtx
) {
  await getAllTeamGameStateStatus();
  const current = getGameStateStatus(teamId) || GameState.NOT_INITIATED;

  if (current === GameState.NOT_INITIATED || current === gameState) return;

  const script = `CustomDashboard.setGameState(${teamId}, "${gameState}")`;

  try {
    await APIMethods.runScript(script, {});
    await getAllTeamGameStateStatus();
    ctx.setState(Helpers.cloneDeep(ctx.state));
  } catch (error) {
    dashboardLogger.error(error);
  }
}

/**
 * Are some gameStateStatuses still set to NOT_INITIATED ?
 */
export function someGameStateStatusNotInitiated() {
  if (teamsGameStateStatuses.length === 0) {
    return true;
  } else {
    return teamsGameStateStatuses.some(t => t.gameState === GameState.NOT_INITIATED);
  }
}

/**
 * Toggle the gameState of given team
 *
 * @params {number} teamId - Id of given team
 */
export async function togglePlay(teamId: number, ctx: DashboardUIStateCtx) {
  try {
    const gameState = getGameStateStatus(teamId);
    switch (gameState) {
      case GameState.NOT_INITIATED:
        return;
      case GameState.RUNNING:
        await setGameStateStatus(teamId, GameState.PAUSED, ctx);
        break;
      case GameState.PAUSED:
        await setGameStateStatus(teamId, GameState.RUNNING, ctx);
        break;
    }
  } catch (error) {
    dashboardLogger.error(error);
  }
}

/**
 * Set the gameState for all teams
 *
 * @params {GameState} gameState - Target gameState
 */
export async function setAllTeamsGameState(gameState: GameState, ctx: DashboardUIStateCtx) {
  await getAllTeamGameStateStatus();

  // prevent setting PAUSE or RUNNING if any team is not done with the "welcome" page
  if (someGameStateStatusNotInitiated()) return;

  const teamIds = teams.map(team => team.getEntity().id);
  const scripts = [];

  for (const teamId of teamIds) {
    scripts.push(`CustomDashboard.setGameState(${teamId}, "${gameState}")`);
  }

  try {
    await APIMethods.runScript(scripts.join(';'), {});
    await getAllTeamGameStateStatus();
    ctx.setState(Helpers.cloneDeep<DashboardUIState>(ctx.state));
  } catch (error) {
    dashboardLogger.error(error);
  }
}

/**
 * Fetches fresh time values and computes the earliest absolute
 * time at which a given team or all the teams could time forwarded
 * @param teamId target team or among all teams if undefined
 */
export async function updateMinimumValidTimeForwardValue(
  updateFunc: (minDate: Date) => void,
  teamId: number | undefined = undefined
): Promise<void> {
  function computeMinTimeAndUpdate(dstate: DashboardGameState) {
    let min = 0;
    if (dstate) {
      if (teamId) {
        if (dstate[teamId]) {
          min = dstate[teamId]?.simulationTimeSec || 0;
        }
      } else {
        // among all teams
        Object.keys(dstate).forEach(tid => {
          const t = dstate[Number(tid)]?.simulationTimeSec || 0;
          if (t > min) {
            min = t;
          }
        });
      }
    }
    const minDateTime = getSimStartDateTime();
    minDateTime.setTime(minDateTime.getTime() + min * 1000);
    updateFunc(minDateTime);
  }
  await fetchAndUpdateTeamsGameState(computeMinTimeAndUpdate, false);
}

const MAXTIME_FORWARD_SECONDS = 60 * 60 * 8;

export function getMaxTimeForwardValue(minFwdTime: Date): Date {
  const absoluteMax = getSimStartDateTime();
  absoluteMax.setDate(absoluteMax.getDate() + 1);
  const maxTimeFwd = new Date((minFwdTime || getSimStartDateTime()).getTime());
  maxTimeFwd.setTime(maxTimeFwd.getTime() + MAXTIME_FORWARD_SECONDS * 1000);
  return maxTimeFwd > absoluteMax ? absoluteMax : maxTimeFwd;
}

/**
 * @return true if the currently entered time is within a valid range, defined as later
 * than minForwardTime but not more than MAXTIME_FORWARD_SECONDS later
 */
export function checkEnteredTimeValidity(): boolean {
  const state = getTypedDashboardUIState();
  const max = getMaxTimeForwardValue(state.minForwardTime);
  const enteredTime = buildValidSimDateTime(state.time?.setHour || 0, state.time?.setMinute || 0);
  return enteredTime <= max && enteredTime >= state.minForwardTime;
}

/**
 * @return true if the impact should be ignored because the team/any team has not yet started
 */
async function shouldIgnoreImpact(teamId: number): Promise<boolean> {
  const current = await getAllTeamGameStateStatus();

  return teamId
    ? current.find(t => t.id)?.gameState === GameState.NOT_INITIATED || false
    : current.some(t => t.gameState === GameState.NOT_INITIATED);
}

/**
 * @param params trainer filled form parameters
 * @param teamId the target team id, if 0 or undefined => all teams
 */
export async function processTimeForward(
  params: TimeForwardDashboardParams,
  teamId: number = 0
): Promise<void> {
  const setStateFunc: UpdateStateFunc = Context.state.setState;
  if (await shouldIgnoreImpact(teamId)) return;

  if (params.mode === 'add') {
    const seconds = (params.addMinute || 0) * 60;
    if (seconds > MAXTIME_FORWARD_SECONDS) {
      throw new Error(
        `Time forward too large, ${seconds}, max value is ${MAXTIME_FORWARD_SECONDS}`
      );
    }
    if (teamId) {
      await triggerDashboardTimeForward(seconds, teamId, setStateFunc);
    } else {
      await triggerDashboardTimeForwardGame(seconds, setStateFunc);
    }
  } else if (params.mode === 'set') {
    const hour = params.setHour || 0;
    const minute = params.setMinute || 0;
    const targetTime = buildValidSimDateTime(hour, minute);
    if (teamId) {
      await triggerAbsoluteTimeForward(targetTime, teamId, setStateFunc);
    } else {
      await triggerAbsoluteTimeForwardGame(targetTime, setStateFunc);
    }
  }
}

/**
 * extracts radio messages and notifications parameters and sends events, by team or game wise
 */
export async function processMessage(state: DashboardUIState): Promise<void> {
  const updateFunc: UpdateStateFunc = Context.state.setState;
  const teamId = state.selectedTeam;
  if (await shouldIgnoreImpact(teamId)) return;

  const message = state.radio.message;

  if (state.radio.mode === 'notif') {
    if (teamId) {
      await sendNotification(message, state.radio.roles, teamId, updateFunc);
    } else {
      await sendNotificationGame(message, state.radio.roles, updateFunc);
    }
  } else if (state.radio.mode === 'radio') {
    if (teamId) {
      await sendRadioMessage(message, state.radio.channel, teamId, updateFunc);
    } else {
      await sendRadioMessageGame(message, state.radio.channel, updateFunc);
    }
  }
}

/**
 * Builds a multiplayer matrix that has an entry for each player in the team
 * Players that are not yet registered in the simulation get an empty matrix
 * Remark : All teams multiplayer matrices are refreshed
 */
export async function getTeamPlayersAndRolesAsync(teamId: number): Promise<MultiplayerMatrix> {
  await getAllTeamsMultiplayerMatrix();
  return getTeamPlayersAndRoles(teamId);
}

/**
 * Builds a multiplayer matrix that has an entry for each player in the team
 * Players that are not yet registered in the simulation get an empty matrix
 */
export function getTeamPlayersAndRoles(teamId: number): MultiplayerMatrix {
  const multiMatrix: MultiplayerMatrix = [];
  const team = getTeam(teamId);

  if (team) {
    const players = team.getPlayers();
    const teamMatrix = getTeamMultiplayerMatrix(teamId);
    if (teamMatrix) {
      players.forEach(p => {
        const pm = teamMatrix.find(m => m.id === p.getId());
        multiMatrix.push(pm || getEmptyPlayerMatrix(p));
      });
    }
  }
  return multiMatrix;
}

export function getModalHeaderTitle(): string {
  switch (getTypedDashboardUIState().modalState) {
    case ModalState.RadioNotifImpact:
    case ModalState.TimeImpact: {
      if (hasSelectedTeam()) {
        return getSelectedTeamName();
      } else {
        return getTranslation('mainSim-dashboard', 'all-teams');
      }
    }
    case ModalState.RolesConfiguration:
      return `${getTranslation('mainSim-dashboard', 'roles')} (${getSelectedTeamName()})`;
    default:
      return 'None';
  }
}

/**
 * Updates the current player x role assignation and opens the configuration modal
 */
export async function openRoleSetupModal(state: DashboardUIState): Promise<void> {
  const newState = Helpers.cloneDeep(state);
  newState.modalState = ModalState.RolesConfiguration;
  newState.selectedTeam = Context.team.id;
  newState.roleConfig = await getTeamPlayersAndRolesAsync(Context.team.id);
  Context.dashboardState.setState(newState);
}

/**
 * Confirm button for roles setup
 */
export async function updateRolesSetupAndClose(
  dasboardStateCtx: DashboardUIStateCtx
): Promise<void> {
  const state = dasboardStateCtx.state;
  await updateTeamMatrix(state.selectedTeam, state.roleConfig);
  resetModalCustom(dasboardStateCtx);
}

let firstLoadDone = false;

export async function refresh(safety: boolean): Promise<unknown> {
  if (safety && firstLoadDone) {
    return;
  }
  firstLoadDone = true;

  return await Promise.all([
    getAllTeamsMultiplayerMatrix(),
    getAllTeamGameStateStatus(),
    fetchAndUpdateTeamsGameState(Context.state.setState, safety),
  ]);
}
