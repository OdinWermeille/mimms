import { getTeamsContext } from '../dashboard/utils';
import { MainCategory, Role } from './helpers';

function getInitialShownCategories() : { [Key in MainCategory] : boolean } {
  return {
    METHANE: true,
    Comms: false,
    Evacs: true,
    PlayerMoves: false,
    Orders: false,
    Roles: true,
    Posts: true,
    Announcements: false,
    VehicleArrivals: false,
  };
}

function getInitialTeamsUnfolded(): TeamsUnfolded {
  const initialTeamsUnfolded: TeamsUnfolded = {};
  getTeamsContext().forEach(team => {
    initialTeamsUnfolded[team.id] = false;
  });
  return initialTeamsUnfolded;
}

function getInitialFiltersUnfolded(): boolean {
  return false;
}

export interface TeamsUnfolded {
  [key: number]: boolean;
}

export interface AnalysisDashboardState {
  categories: {
    METHANE: boolean;
    Comms: boolean;
    Evacs: boolean;
    PlayerMoves: boolean;
    Orders: boolean;
    Roles: boolean;
    Posts: boolean;
    Announcements: boolean;
    VehicleArrivals: boolean;
  };
  teamsUnfolded: TeamsUnfolded;
  filtersUnfolded: boolean;
  overlayShown: { minute: number, teamId: number, role: string };
}

export function createDashboardState(): AnalysisDashboardState {
  return {
    categories: getInitialShownCategories(),
    teamsUnfolded: getInitialTeamsUnfolded(),
    filtersUnfolded: getInitialFiltersUnfolded(),
    overlayShown: { minute: -1, teamId: -1, role: "" },
  };
}

export function isLastTimeline(
  teams: { id: number; name: string }[],
  teamId: number,
  teamsUnfolded: TeamsUnfolded,
): boolean {
  return teams[teams.length - 1]?.id === teamId && !teamsUnfolded[teamId];
}

export function isLastRoleInLastTimeline(
  teams: { id: number; name: string }[],
  teamId: number,
  teamsUnfolded: TeamsUnfolded,
  role: { role: Role }
): boolean {
  if (!(teams[teams.length - 1]?.id === teamId && teamsUnfolded[teamId])) return false;
  return role.role === 'EVASAN';
};

export function isLastTimelineInNotLastTeam(
  teams: { id: number; name: string }[],
  teamId: number,
  teamsUnfolded: TeamsUnfolded,
  role: { role: Role } = { role: "All" },
): boolean {
  if(teams[teams.length - 1]?.id === teamId) return false;
  let isLastTimeline = false;
  teamsUnfolded[teamId] ? 
  isLastTimeline = role.role === "EVASAN" : 
  isLastTimeline = true;
  return isLastTimeline;
}