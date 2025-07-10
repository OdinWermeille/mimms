import { getTeamsContext } from '../dashboard/utils';

function getInitialShownCategories() {
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
    Other: false,
  };
}

function getInitialTeamsUnfolded(): TeamsUnfolded {
  const initialTeamsUnfolded: TeamsUnfolded = {};
  getTeamsContext().forEach(team => {
    initialTeamsUnfolded[team.id] = true;
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
    Other: boolean;
  };
  teamsUnfolded: TeamsUnfolded;
  filtersUnfolded: boolean;
}

export function createDashboardState(): AnalysisDashboardState {
  return {
    categories: getInitialShownCategories(),
    teamsUnfolded: getInitialTeamsUnfolded(),
    filtersUnfolded: getInitialFiltersUnfolded(),
  };
}

export function isLastTimeline(
  teams: { id: number; name: string }[],
  teamId: number,
  teamsUnfolded: TeamsUnfolded
): boolean {
  return teams[teams.length - 1].id === teamId && !teamsUnfolded[teamId];
}

export function isLastRoleInLastTimeline(
  teams: { id: number; name: string }[],
  teamId: number,
  teamsUnfolded: TeamsUnfolded,
  role: { role: string }
): boolean {
  if (!(teams[teams.length - 1].id === teamId && teamsUnfolded[teamId])) return false;
  return role.role === 'EVASAN';
}
