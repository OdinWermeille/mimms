import { getContextUidGenerator } from '../../gameExecutionContextController';
import { SimFlag } from '../actions/actionTemplateBase';
import { InterventionRole } from '../actors/actor';
import { ResourceContainerDefinitionId, SimDuration, SimTime, TranslationKey } from '../baseTypes';
import { ResourceType } from './resourceType';

const RESOURCE_CONTAINER_SEED_ID: ResourceContainerDefinitionId = 6000;

// TODO might be configurable in a far future
/**
 * Corresponds to the type of containers that a player can request
 */
export const ResourceContainerTypeArray = [
  'ACS-MCS',
  'Ambulance',
  'SMUR',
  'PMA',
  'PICA',
  'PC-San',
  'Helicopter',
] as const;

export type ResourceContainerType = typeof ResourceContainerTypeArray[number];

/**
 * Friendly name used for the configuration of container types
 */
export const ResourceContainerDefinitionNameArray = [
  'AMB-U',
  'AMB-I',
  'AMB-T',
  'SMUR',
  'Helico',
  'ACS-MCS',
  'PMA',
  'PICA',
  'PC',
] as const;

export const optionalResourceDefinitions: Record<ResourceContainerDefinitionName, boolean> = {
  'AMB-U': true,
  'AMB-I': true,
  'AMB-T': true,
  SMUR: true,
  Helico: true,
  'ACS-MCS': false,
  PMA: false,
  PICA: false,
  PC: false,
};

export type ResourceContainerDefinitionName = typeof ResourceContainerDefinitionNameArray[number];

export const UniqueResourceTypeMap: Record<ResourceContainerType, boolean> = {
  'ACS-MCS': true,
  'PC-San': true,
  PICA: true,
  PMA: true,
  Ambulance: false,
  Helicopter: false,
  SMUR: false,
};

/**
 * Describes the content of one container that can be requested by an actor to the emergency department
 */
export interface ResourceContainerDefinition {
  /**
   * Unique identifier
   */
  uid: ResourceContainerDefinitionId;

  /**
   * Associated resource type
   */
  type: ResourceContainerType;

  /**
   * Displayed name
   */
  name: TranslationKey;

  /**
   * List of resources that will be sent
   */
  resources: Partial<Record<ResourceType, number>>;

  /**
   * List of actors that will be sent
   */
  roles: InterventionRole[];

  /**
   * Flags that are raised (added to the state) when an instance of this container arrives on site
   */
  flags: SimFlag[];
}

export function buildContainerDefinition(
  type: ResourceContainerType,
  name: TranslationKey,
  resources: Partial<Record<ResourceType, number>>,
  roles: InterventionRole[] = [],
  flags: SimFlag[] = []
): ResourceContainerDefinition {
  return {
    uid: getContextUidGenerator().getNext('ResourceContainer', RESOURCE_CONTAINER_SEED_ID),
    type: type,
    name: name,
    resources: resources || {},
    roles: roles,
    flags: flags,
  };
}

/**
 * Describes the availability and amount of a given container
 */
export interface ResourceContainerConfig {
  templateId: ResourceContainerDefinitionId;

  name: string;

  // TODO might be a function (more flexibility)
  // or keep it a time value for easier configuration ?
  // or an offset from the first METHANE ?
  /**
   * When the resource starts to be available during the game
   */
  availabilityTime: SimTime;

  /**
   * Once requested, time required to get on site
   */
  travelTime: SimDuration;

  /**
   * the number of available containers
   */
  amount: number;
}
