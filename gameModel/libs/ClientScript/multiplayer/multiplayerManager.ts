import { getGameModelType, getPlayer, getTestTeamId } from '../dashboard/utils';
import { InterventionRole } from '../game/common/actors/actor';
import { mainSimLogger } from '../tools/logger';

export interface MultiplayerMatrix extends Array<PlayerMatrix> {}

interface PlayerMatrix {
  id: number;
  name: string;
  ready: boolean;
  roles: PlayerRoles;
}

type PlayerRoles = Partial<Record<InterventionRole, boolean>>;

// Throttle resquests to server
let hasRegisteredOnce = false;

/**
 * Clear all values for in matrix for current team (players and roles)
 */
export async function clearMultiplayerMatrix(): Promise<void> {
  hasRegisteredOnce = false;

  try {
    await APIMethods.runScript(
      `Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).clearProperties()`,
      {}
    );
  } catch (error) {
    mainSimLogger.error(error);
  }
}

/**
 * Register current player (self) in matrix
 */
export async function registerSelf(): Promise<void> {
  if (hasRegisteredOnce) return;
  const currentPlayerId = self.getId();
  const currentPlayerName = self.getName() ?? currentUserName;
  const playableRoles: PlayerRoles = {
    AL: false,
    ACS: false,
    MCS: false,
    EVASAN: false,
    LEADPMA: false,
  };

  const matrix = Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).getProperties();

  if (currentPlayerId && !matrix[currentPlayerId]) {
    const playerMatrix: PlayerMatrix = {
      id: currentPlayerId,
      name: currentPlayerName,
      ready: false,
      roles: playableRoles,
    };

    const script = `Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).setProperty(${currentPlayerId.toString()}, ${JSON.stringify(
      JSON.stringify(playerMatrix)
    )})`;

    try {
      hasRegisteredOnce = true;
      await APIMethods.runScript(script, {});
    } catch (error) {
      hasRegisteredOnce = false;
      mainSimLogger.error(error);
    }
  }
}

/**
 * Is the current player allowed to update the target player ?
 *
 * @params {number} targetPlayerId - Id of target player
 */
function canUpdateRole(targetPlayerId: number): boolean {
  const currentPlayerId = self.getId();
  return (
    APP_CONTEXT !== 'Player' ||
    (currentPlayerId !== undefined && targetPlayerId === currentPlayerId)
  );
}

/**
 * Update role of given player
 *
 * @params {number} playerId - Id of player to update
 * @params {InterventionRole} role - Role to be updated
 */
export async function updateRole(playerId: number, role: InterventionRole): Promise<void> {
  if (!canUpdateRole(playerId)) return;

  const playerMatrix = getPlayersAndRoles().find(p => p.id === playerId)!;
  playerMatrix.roles[role] = !playerMatrix.roles[role];

  const script = `Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).setProperty(${playerId!.toString()}, ${JSON.stringify(
    JSON.stringify(playerMatrix)
  )})`;

  try {
    await APIMethods.runScript(script, {});
  } catch (error) {
    mainSimLogger.error(error);
  }
}

/**
 * Update ready status of given player
 *
 * @params {number} playerId - Id of player to update
 */
export async function updateReady(playerId: number): Promise<void> {
  if (!canUpdateRole(playerId)) return;

  const playerMatrix = getPlayersAndRoles().find(p => p.id === playerId)!;
  playerMatrix.ready = !playerMatrix.ready;

  const script = `Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).setProperty(${playerId.toString()}, ${JSON.stringify(
    JSON.stringify(playerMatrix)
  )})`;

  try {
    await APIMethods.runScript(script, {});
  } catch (error) {
    mainSimLogger.error(error);
  }
}

/**
 * Get and convert multiplayerMatrix to workable format
 *
 * @returns {MultiplayerMatrix}
 */
export function getPlayersAndRoles(): MultiplayerMatrix {
  return Object.entries(
    Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).getProperties()
  ).map(([id, playerMatrix]) => ({
    id: parseInt(id),
    name: JSON.parse(playerMatrix).name,
    ready: JSON.parse(playerMatrix).ready,
    roles: JSON.parse(playerMatrix).roles,
  }));
}

/**
 * Get the available roles for the current player
 *
 * @returns {PlayerRoles}
 */
export function getPlayerRolesSelf(): PlayerRoles {
  const currentPlayerId = self.getId();
  if (currentPlayerId === undefined) {
    mainSimLogger.error(`You are currently not registered as a player`);
    return {};
  }

  const playerRoles = getPlayersAndRoles().find(m => m.id === currentPlayerId);
  if (playerRoles === undefined) {
    // Happens when the page load registration call has not returned
    mainSimLogger.info(`Player with id: ${currentPlayerId} has not registered roles`);
    return {};
  }
  return playerRoles.roles;
}
/**
 * Check if all playable roles are currently filled by a player
 */
export function checkAllRolesPlayed(): boolean {
  const playersRoles = getPlayersAndRoles().map(p => Object.values(p.roles));
  const playableRoles = new Array(5).fill(false);

  for (const player of playersRoles) {
    for (const [i, role] of Object.entries(player)) {
      if (role) playableRoles[Number(i)] = role;
    }
  }
  return playableRoles.every(r => r);
}

/**
 * Check if all players are marked as ready
 */
export function checkAllPlayersReady(): boolean {
  return getPlayersAndRoles()
    .flatMap(p => p.ready)
    .every(r => r);
}

// ################################
// ||                            ||
// ||    SCENARIST & TRAINER     ||
// ||         FUNCTIONS          ||
// ||                            ||
// ################################

/**
 * Unregister given player from playerMatrix
 *
 * @params {number} playerId - Id of player to unregister
 */
export async function unregisterPlayer(playerId: number): Promise<void> {
  // Players aren't allowed to unregister others
  if (APP_CONTEXT === 'Player') return;

  const currentPlayers = Variable.find(gameModel, 'multiplayerMatrix')
    .getInstance(self)
    .getProperties();

  if (playerId && currentPlayers[String(playerId)]) {
    const script = `Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).removeProperty(${String(
      playerId
    )})`;

    try {
      await APIMethods.runScript(script, {});
    } catch (error) {
      mainSimLogger.error(error);
    }
  }
}

/**
 * Register self as all roles and mark ready (use only for scenarist)
 */
export async function registerSelfAllRolesAndReady(): Promise<void> {
  const playerId = self.getId();
  const playerMatrix = getPlayersAndRoles().find(p => p.id === playerId)!;

  playerMatrix.ready = true;
  for (const role in playerMatrix.roles) {
    playerMatrix.roles[role as InterventionRole] = true;
  }

  const script = `Variable.find(gameModel, 'multiplayerMatrix').getInstance(self).setProperty(${playerId!.toString()}, ${JSON.stringify(
    JSON.stringify(playerMatrix)
  )})`;

  try {
    await APIMethods.runScript(script, {});
  } catch (error) {
    mainSimLogger.error(error);
  }
}

interface TeamMatrix {
  id: number;
  matrix: MultiplayerMatrix;
}

/**
 * Script variable in which we store matrixes for each team
 */
export let multiPlayerMatrixes: TeamMatrix[] = [];

/**
 * Retrieve matrix for all teams
 *
 * @returns {Promise<TeamMatrix[]>}
 */
export async function getAllTeamsMultiplayerMatrix(): Promise<TeamMatrix[]> {
  const script = 'MultiplayerHelper.getMultiplayerMatrix()';

  let response: IManagedResponse;

  try {
    response = await APIMethods.runScript(script, {});
  } catch (error) {
    mainSimLogger.error(error);
  }

  const teams = response!.updatedEntities[0] as any;

  let teamMatrixes = Object.keys(teams).map(key => ({
    id: Number(key),
    matrix: Object.values(teams[key].properties).map(m =>
      JSON.parse(String(m))
    ) as MultiplayerMatrix,
  }));

  // Filter out 'Test team' unless in SCENARIO mode
  teamMatrixes = teamMatrixes.filter(
    t => t.id !== getTestTeamId() || getGameModelType() === 'SCENARIO'
  );
  multiPlayerMatrixes = teamMatrixes;

  return teamMatrixes;
}

/**
 * Get team matrix of given team
 *
 * @params {string} teamId - Id of team to retrieve
 */
export function getTeamMultiplayerMatrix(teamId: number): MultiplayerMatrix {
  if (multiPlayerMatrixes === undefined || multiPlayerMatrixes.length === 0) {
    return [];
  } else {
    const multi = multiPlayerMatrixes.find(matrix => matrix.id === teamId);
    return multi ? multi.matrix : [];
  }
}

/**
 * Retrieve and parse a player matrix
 *
 * @params {string} - Id of team to retrieve
 * @params {number} - Id of player to retrieve
 * @returns {PlayerMatrix}
 */
function getPlayerMatrix(teamId: number, playerId: number): PlayerMatrix {
  const teamMatrix = multiPlayerMatrixes.find(teamMatrixes => teamMatrixes.id === teamId);
  if (teamMatrix && teamMatrix!.matrix.find(m => m.id === playerId)) {
    return teamMatrix.matrix.find(m => m.id === playerId)!;
  } else {
    // build an empty instance
    const player = getPlayer(teamId, playerId);
    return getEmptyPlayerMatrix(player!);
  }
}

/**
 * Update role of given player in team
 *
 * @params {string} teamId - Id of team to update
 * @params {number} playerId - Id of player to update
 * @params {InterventionRole} role - Role to update
 */
export async function updatePlayerRole(
  teamId: number,
  playerId: number,
  role: InterventionRole
): Promise<void> {
  const playerMatrix: PlayerMatrix = getPlayerMatrix(teamId, playerId);

  playerMatrix.roles[role] = !playerMatrix.roles[role];
  try {
    await updatePlayerMatrix(teamId, playerId, playerMatrix);
  } catch (error) {
    mainSimLogger.error(error);
  }
}

/**
 * Update ready of given player in team
 *
 * @params {string} teamId - Id of team to update
 * @params {number} playerId - Id of player to update
 */
export async function updatePlayerReady(teamId: number, playerId: number): Promise<void> {
  const playerMatrix = getPlayerMatrix(teamId, playerId);

  playerMatrix.ready = !playerMatrix.ready;
  try {
    await updatePlayerMatrix(teamId, playerId, playerMatrix);
  } catch (error) {
    mainSimLogger.error(error);
  }
}

/**
 * Update multiplayerMatrix variable for given team and player, fetch update when done
 *
 * @params {string} teamId - Id of team to update
 * @params {number} playerId - Id of player to update
 * @params {PlayerMatrix} matrix - Matrix being replaced in variable
 */
async function updatePlayerMatrix(
  teamId: number,
  playerId: number,
  matrix: PlayerMatrix
): Promise<void> {
  const payload = JSON.stringify(JSON.stringify(matrix));

  const script = `MultiplayerHelper.updatePlayerMatrix(${teamId}, ${playerId}, ${payload})`;
  try {
    await APIMethods.runScript(script, {});
    await getAllTeamsMultiplayerMatrix();
  } catch (error) {
    mainSimLogger.error(error);
  }
}

/**
 * Update multiplayerMatrix variable for a given team, fetch update when done
 *
 * @params {number} teamId - Id of team to update
 * @params {MultiplayerMatrix} matrix - Team matrix being replaced
 */
export async function updateTeamMatrix(
  teamId: number,
  teamMatrix: MultiplayerMatrix
): Promise<void> {
  const scripts: string[] = [];

  for (let matrix of teamMatrix) {
    const payload = JSON.stringify(JSON.stringify(matrix));

    scripts.push(`MultiplayerHelper.updatePlayerMatrix(${teamId}, ${matrix.id}, ${payload})`);
  }

  try {
    await APIMethods.runScript(scripts.join(';'), {});
    await getAllTeamsMultiplayerMatrix();
  } catch (error) {
    mainSimLogger.error(error);
  }
}

/**
 * Returns the initial player matrix configuration (no role selected)
 */
export function getEmptyPlayerMatrix(player: SPlayer): PlayerMatrix {
  return {
    id: player.getId() || 0,
    name: player.getName() || '',
    ready: false,
    roles: {
      AL: false,
      ACS: false,
      MCS: false,
      EVASAN: false,
      LEADPMA: false,
    },
  };
}

if (APP_CONTEXT !== 'Player') {
  getAllTeamsMultiplayerMatrix();
}
