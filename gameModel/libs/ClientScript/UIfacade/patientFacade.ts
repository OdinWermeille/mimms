import { PatientId } from '../game/common/baseTypes';
import { LOCATION_ENUM } from '../game/common/simulationState/locationState';
import { getPatientsByLocation, PatientState } from '../game/common/simulationState/patientState';
import { HumanHealth } from '../game/legacy/the_world';
import { getCurrentState } from '../game/mainSimulationLogic';
import {
  AfflictedBlockDetails,
  formatMetric,
  getAfflictedBlocksDetailsOfHuman,
  getAfflictedBlocksOfHuman,
  getHumanVisualInfosOfHuman,
} from '../game/patientZoom/currentPatientZoom';
import { getFlatCategoryCardSvg, getLocalizedBlocks } from '../game/patientZoom/graphics';
import {
  Categorization,
  getBackgroundColorByCategoryId,
  getCategoryById,
  PreTriageResult,
} from '../game/pretri/triage';
import { BodyState, HumanBody } from '../HUMAn/human';
import { computeDiastolicPressure, computeSystolicPressure } from '../HUMAn/physiologicalModel';
import { getBlockTranslation, getTranslation } from '../tools/translation';
import { getHospitalById, getPatientUnitById } from '../game/common/evacuation/hospitalController';

/**
 * @returns All currently present patients
 */
export function getAllPatients(): Readonly<PatientState[]> {
  return getCurrentState().getAllPatients();
}

export function getPatientsForLocation(location: LOCATION_ENUM): Readonly<PatientState[]> {
  return getPatientsByLocation(getCurrentState(), 'FixedMapEntity', location);
}

export function getPatient(id: string): Readonly<PatientState | undefined> {
  return getAllPatients().find(patient => patient.patientId === id);
}

/* old hack - to be updated
export function keepStateAlive({ state, setState }: FullState) {
	const ePatient = getCurrentPatientId();
	const cPatient = state.currentPatient;
	if (ePatient !== cPatient) {
		setState({
			...getInitialPatientZoomState(),
			currentPatient: ePatient,
		});
	}
}
*/

// -------------------------------------------------------------------------------------------------
// human body
// -------------------------------------------------------------------------------------------------

export function getTranslatedBlockName(blockName: string): string {
  return getBlockTranslation(blockName);
}

export function getAfflictedBlocksDetails(patient: PatientState): AfflictedBlockDetails[] {
  const human = patient.humanBody;
  const health: HumanHealth = {
    pathologies: human.revivedPathologies!,
    effects: human.effects!,
  };
  const currentTime = patient.humanBody.state.time;

  return getAfflictedBlocksDetailsOfHuman(human, health, currentTime, false);
}

function getAfflictedBlocks(patient: PatientState): string[] {
  const human = patient.humanBody;
  const health: HumanHealth = {
    pathologies: human.revivedPathologies!,
    effects: human.effects!,
  };
  const currentTime = patient.humanBody.state.time;

  return getAfflictedBlocksOfHuman(human, health, currentTime);
}

export function getLocalizedAffictedBlocks(patient: PatientState) {
  const afflictedBlocks = getAfflictedBlocks(patient);

  return getLocalizedBlocks([...afflictedBlocks]).localized;
}

export function getHumanVisualInfos(id: string) {
  const human = getHumanAndCategory(id);
  return getHumanVisualInfosOfHuman(human);
}

export function getDivForCategory(patientId: string): string {
  const patient = getPatient(patientId)!;
  const categoryId = patient.preTriageResult?.categoryId;
  const category = categoryId != undefined ? getCategoryById(categoryId) : undefined;

  return `<div class='listTag-container' style='color: ${
    category ? category.color : 'black'
  }; background-color: ${category ? category.bgColor : '#f6f7f9ff'}'/>`;
}

export function getCategoryCardSvg(patient: PatientState) {
  const categoryId = patient?.preTriageResult?.categoryId;
  const bgColor = categoryId ? getBackgroundColorByCategoryId(categoryId) : '#f6f7f9ff';
  return getFlatCategoryCardSvg(bgColor, 0, 0, 64);
}

/**
 * Get a structure compatible with currentPatientZoom.ts.
 * <p>
 * For the moment, we do not have a use for the category, so we can leave it undefined.
 */
function getHumanAndCategory(
  id: PatientId
): (HumanBody & { category: Categorization | undefined }) | undefined {
  const patient = getPatient(id)!;
  const human = patient.humanBody;
  //
  return { ...human, category: undefined };
}

// -------------------------------------------------------------------------------------------------
// evacuation
// -------------------------------------------------------------------------------------------------

// used in page 52
export function getPatientsAvailableForEvacuation(): { label: string; value: string }[] {
  return getPatientsByLocation(getCurrentState(), 'FixedMapEntity', LOCATION_ENUM.PMA).map(
    patient => {
      return { label: patient.patientId, value: patient.patientId };
    }
  );
}

// -------------------------------------------------------------------------------------------------
// summary
// -------------------------------------------------------------------------------------------------

// used in page 57
export function getPatientsSummary() {
  let patientNumber = 1;

  const patients = Object.values(getCurrentState().getInternalStateObject().patients);
  const response: {
    n: number;
    data: {
      id: string;
      categorization: PreTriageResult<string> | undefined;
      location: string;
      effects: string[];
      patientUnit: string;
    };
    id: string;
  }[] = [];

  patients.forEach(patient => {
    const patientId = patient.humanBody.id;
    if (patientId) {
      let effectsStringArray = [''];
      if (patient.humanBody.effects && patient.humanBody.effects.length > 0) {
        effectsStringArray = patient.humanBody.effects.map(effect => effect.source.id || '');
      }
      response.push({
        n: patientNumber,
        data: {
          id: patientId,
          categorization: patient.preTriageResult,
          location:
            patient.location.kind === 'Hospital'
              ? getHospitalById(patient.location.locationId).shortName
              : patient.location.locationId,
          effects: effectsStringArray,
          patientUnit:
            patient.location.kind === 'Hospital'
              ? I18n.translate(getPatientUnitById(patient.location.patientUnit).name)
              : '',
        },
        id: patientId,
      });
      patientNumber++;
    }
  });
  return response;
}

// -------------------------------------------------------------------------------------------------
// Body State Values
// -------------------------------------------------------------------------------------------------

export function getHeartRate(state: BodyState): string {
  return state.vitals.cardio.hr.toFixed() + ' /min';
}

export function getRespirationRate(state: BodyState): string {
  return state.vitals.respiration.rr.toFixed() + ' /min';
}

export function getDiastolicPressure(state: BodyState): string {
  return computeDiastolicPressure(state).toFixed();
}

export function getSystolicPressure(state: BodyState): string {
  return computeSystolicPressure(state).toFixed();
}

export function getBloodPressure(state: BodyState): string {
  const dp = getDiastolicPressure(state);
  const sp = getSystolicPressure(state);
  return sp + ' / ' + dp + ' mmHg';
}

export function getEtCO2(state: BodyState): string {
  if (isIntubated(state)) return state.vitals.respiration.PaCO2.toFixed();
  else return getTranslation('human-general', 'no-intubation-set');
}

export function getSpO2Percent(state: BodyState): string {
  return (state.vitals.respiration.SpO2 * 100).toFixed() + '%';
}

export function isIntubated(state: BodyState): boolean {
  if (!state) return false;
  return state.blocks.get('NECK')?.params.intubated ? true : false;
}

/**
 * format : x/10 with x from 0 to 10
 */
export function getPainValue(state: BodyState): string {
  if (!state) return '';
  const [_, value] = formatMetric('vitals.visiblePain', state.vitals.pain);
  return value;
}

export function getBloodSugarLevel(state: BodyState): string {
  return state.vitals.cardio.bloodSugarLevel.toFixed(1) + ' mmol/l';
}

export function getTemperature(state: BodyState): string {
  return state.vitals.temperature.toFixed(1) + '°';
}
