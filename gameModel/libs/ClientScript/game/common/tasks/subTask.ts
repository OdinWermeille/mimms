import { getContextUidGenerator } from '../../gameExecutionContextController';
import {
  ActorId,
  GlobalEventId,
  HospitalId,
  PatientId,
  PatientUnitId,
  ResourceId,
  SubTaskId,
  TranslationKey,
} from '../baseTypes';
import { EvacuationSquadDefinition } from '../evacuation/evacuationSquadDef';
import { LOCATION_ENUM } from '../simulationState/locationState';

const SUB_TASK_SEED_ID: SubTaskId = 5000;

export class SubTask {
  public readonly subTaskId: SubTaskId;

  /** The resources involved in the execution of the sub-task */
  public resources: ResourceId[];
  /** The patient involved in the sub-task */
  public patientId: PatientId;
  /** The time spent on the task */
  public cumulatedTime: number;

  public constructor(resources: ResourceId[], patientId: PatientId) {
    this.subTaskId = getContextUidGenerator().getNext('SubTask', SUB_TASK_SEED_ID);
    this.resources = resources;
    this.patientId = patientId;
    this.cumulatedTime = 0;
  }
}

export class PorterSubTask extends SubTask {
  public targetLocation: LOCATION_ENUM;
  public patientCanWalk: boolean;

  constructor(
    resources: ResourceId[],
    patientId: string,
    targetLocation: LOCATION_ENUM,
    patientCanWalk: boolean
  ) {
    super(resources, patientId);
    this.targetLocation = targetLocation;
    this.patientCanWalk = patientCanWalk;
  }
}

type EvacuationSubTaskStatus = 'started' | 'way_to_hospital' | 'way_back' | 'completed';

export class EvacuationSubTask extends SubTask {
  public status: EvacuationSubTaskStatus;
  public hospitalId: HospitalId;
  public patientUnitId: PatientUnitId;
  public doResourcesComeBack: boolean;
  public parentEventId: GlobalEventId;
  public ownerId: ActorId;
  public travelTime: number;

  constructor(
    resources: ResourceId[],
    patientId: string,
    hospitalId: HospitalId,
    patientUnitId: PatientUnitId,
    doResourcesComeBack: boolean,
    parentEventId: GlobalEventId,
    ownerId: ActorId,
    travelTime: number,
    public feedbackWhenReturning: TranslationKey,
    public squadDef: EvacuationSquadDefinition
  ) {
    super(resources, patientId);
    this.hospitalId = hospitalId;
    this.patientUnitId = patientUnitId;
    this.doResourcesComeBack = doResourcesComeBack;
    this.parentEventId = parentEventId;
    this.ownerId = ownerId;
    this.travelTime = travelTime;
    this.status = 'started';
  }
}
