// THIS IS NOT A MODULE

import { getBlocksSelector, getSkillsDefinitionsAsChoices } from '../edition/GameModelerHelper';

import { getItems, getPathologies } from '../HUMAn/registries';
import { getItemActionTranslation } from './translation';

Helpers.registerEffect(() => {
  const skillChoices = getSkillsDefinitionsAsChoices();

  /**
   * Custom patient edition
   */
  function hideProperty(schema: any, key: string) {
    schema.properties[key].view.type = 'hidden';
  }

  function turnPropertyReadOnly(schema: any, key: string) {
    schema.properties[key].view.readOnly = true;
  }

  const observableVitals = [
    { label: 'CRT', value: 'vitals.capillaryRefillTime_s' },
    { label: 'glasgow (total)', value: 'vitals.glasgow.total' },
    { label: 'glasgow (e)', value: 'vitals.glasgow.eye' },
    { label: 'glasgow (v)', value: 'vitals.glasgow.verbal' },
    { label: 'glasgow (m)', value: 'vitals.glasgow.motor' },
    //{ "label": "respiration.QR", "value": "vitals.respiration.QR" },
    //{ "label": "Tidal Volume", "value": "vitals.respiration.tidalVolume_L" },
    { label: 'RR', value: 'vitals.respiration.rr' },
    { label: 'PaO2', value: 'vitals.respiration.PaO2' },
    { label: 'SaO2', value: 'vitals.respiration.SaO2' },
    { label: 'CaO2', value: 'vitals.respiration.CaO2' },
    { label: 'Plasma Proteins (mL)', value: 'vitals.cardio.totalVolumeOfPlasmaProteins_mL' },
    { label: 'Plasma (mL)', value: 'vitals.cardio.totalVolumeOfWater_mL' },
    { label: 'White Cells (mL)', value: 'vitals.cardio.totalVolumeOfWhiteBloodCells_mL' },
    { label: 'Erythrocytes (mL)', value: 'vitals.cardio.totalVolumeOfErythrocytes_mL' },
    //{ "label": "cardio.totalVolumeOfInstantaneousLosses_mL", "value": "vitals.cardio.totalVolumeOfInstantaneousLosses_mL" },

    //{ "label": "cardio.PVC_mmHg", "value": "vitals.cardio.PVC_mmHg" },
    { label: 'Qc (L/Min)', value: 'vitals.cardio.cardiacOutput_LPerMin' },
    { label: 'MAP', value: 'vitals.cardio.MAP' },
    { label: 'HR', value: 'vitals.cardio.hr' },
    { label: 'ICP (mmHg)', value: 'vitals.brain.ICP_mmHg' },
    //{ "label": "brain.Rbr", "value": "brain.Rbr" },
    //{ "label": "brain.theoreticalQbr", "value": "brain.theoreticalQbr" },
    //{ "label": "brain.GSC", "value": "brain.GSC" },
    { label: 'DO2Sys', value: 'vitals.cardio.DO2Sys' },
    { label: 'DO2Brain', value: 'vitals.brain.DO2' },
  ];

  const compensableVitals = [
    { label: 'RR', value: 'vitals.respiration.rr' },
    { label: 'Tidal Volume', value: 'vitals.respiration.tidalVolume_L' },
    { label: 'HR', value: 'vitals.cardio.hr' },
    { label: 'Arterial resistance', value: 'vitals.cardio.Ra_mmHgMinPerL' },
    { label: 'Venous resistance', value: 'vitals.cardio.Rrv_mmHgMinPerL' },
    { label: 'cardio.venousCompliance_LPerMmHg', value: 'vitals.cardio.venousCompliance_LPerMmHg' },
    // { label: "UnstressedCapacitance (L)", "value": "vitals.cardio.unstressedCapacitance_L" },
    { label: 'EDV (mL)', value: 'vitals.cardio.endDiastolicVolume_mL' },
    { label: 'ESV (mL)', value: 'vitals.cardio.endSystolicVolume_mL' },
  ];

  Schemas.addSchema(
    'dataSchema',
    (entity, schema) => {
      const od: IObjectDescriptor = entity as unknown as IObjectDescriptorWithId;
      if (od.editorTag === 'patients') {
        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');

        //hideProperty(newSchema, "label");
        turnPropertyReadOnly(newSchema, 'editorTag');
        newSchema.properties.properties.view = {
          label: 'Human',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'Human Id',
              layout: 'shortInline',
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              schema: {
                type: 'object',
                properties: {
                  age: { type: 'number', view: { label: 'Age', layout: 'shortInline' } },
                  sex: {
                    type: 'string',
                    view: {
                      label: 'Assigned Sex',
                      layout: 'shortInline',
                      type: 'select',
                      choices: [
                        { label: 'Male', value: 'male' },
                        { label: 'Female', value: 'female' },
                      ],
                    },
                  },
                  bmi: { type: 'number', view: { label: 'BMI [kg/m²]', layout: 'shortInline' } },
                  scriptedEvents: { view: { type: 'hidden' } },
                  height_cm: {
                    type: 'number',
                    view: { label: 'Height [cm]', layout: 'shortInline' },
                  },
                  lungDepth: {
                    type: 'number',
                    view: { label: 'Lungs [2^x]', layout: 'shortInline' },
                  },
                  skillId: {
                    type: 'string',
                    view: {
                      label: 'Skill',
                      layout: 'shortInline',
                      type: 'select',
                      choices: skillChoices,
                    },
                  },
                  sugarLevel: { type: 'number', view: { label: 'Sugar', layout: 'shortInline' } },
                  temperature: {
                    type: 'number',
                    view: { label: 'Temperature', layout: 'shortInline' },
                  },
                },
              },
            },
          },
        };
        return newSchema;
      } else if (od.editorTag === 'characters') {
        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');

        //hideProperty(newSchema, "label");
        turnPropertyReadOnly(newSchema, 'editorTag');
        newSchema.properties.properties.view = {
          label: 'Profile',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'Profile Id',
              layout: 'shortInline',
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              schema: {
                type: 'object',
                properties: {
                  skillId: {
                    type: 'string',
                    view: {
                      label: 'Skill',
                      layout: 'shortInline',
                      type: 'select',
                      choices: skillChoices,
                    },
                  },
                  description: { type: 'string', view: { label: 'Description' } },
                },
              },
            },
          },
        };
        return newSchema;
      } else if (od.editorTag === 'old_compensation') {
        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');
        turnPropertyReadOnly(newSchema, 'editorTag');

        newSchema.properties.properties.view = {
          label: 'Compensation',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'To compensate',
              type: 'select',
              choices: compensableVitals,
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              schema: {
                type: 'object',
                properties: {
                  min: { type: 'number', view: { label: 'Min', layout: 'shortInline' } },
                  max: { type: 'number', view: { label: 'Max', layout: 'shortInline' } },
                  rules: schemaProps.array({
                    label: 'Rules',
                    itemSchema: {
                      key: {
                        type: 'string',
                        view: {
                          label: 'Vital',
                          type: 'select',
                          choices: observableVitals,
                        },
                      },
                      op: {
                        type: 'string',
                        view: {
                          label: 'operator',
                          layout: 'shortInline',
                          type: 'select',
                          choices: [
                            { label: '<', value: '<' },
                            { label: '<=', value: '<=' },
                            { label: '=', value: '=' },
                            { label: '>=', value: '>=' },
                            { label: '>', value: '>' },
                          ],
                        },
                      },
                      value: { type: 'number', view: { label: 'value', layout: 'shortInline' } },
                      effect_PerMin: {
                        type: 'number',
                        view: { label: 'Effect / min', layout: 'shortInline' },
                      },
                    },
                  }),
                },
              },
            },
          },
        };

        return newSchema;
      } else if (od.editorTag === 'compensation') {
        // interface CompensationRule {
        //	min: number;
        //	max: number;
        //	points: {
        //		x: number;
        //		y: number;
        //	}[]
        //}

        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');
        turnPropertyReadOnly(newSchema, 'editorTag');

        newSchema.properties.properties.view = {
          label: 'Compensation',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'To compensate',
              type: 'select',
              choices: compensableVitals,
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              schema: {
                type: 'object',
                properties: {
                  /*min: { type: 'number', view: { label: 'Min', layout: "shortInline" } },
								max: { type: 'number', view: { label: 'Max', layout: "shortInline" } },*/
                  t4Nerve: { type: 'boolean', view: { label: 'T4?' } },
                  points: schemaProps.array({
                    label: 'Points',
                    itemSchema: {
                      x: { type: 'number', view: { label: 'system', layout: 'shortInline' } },
                      y: { type: 'number', view: { label: 'value', layout: 'shortInline' } },
                    },
                  }),
                },
              },
            },
          },
        };

        return newSchema;
      } else if (od.editorTag === 'ans') {
        // interface SympSystem {
        //   [vitalName: string]: {x: number, y: number}[];
        // }

        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');
        turnPropertyReadOnly(newSchema, 'editorTag');

        newSchema.properties.properties.view = {
          label: '(para)sympathetic system',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'Observe',
              type: 'select',
              choices: observableVitals,
            },
          },
          valueSchema: {
            type: 'string',
            value: '[]',
            view: {
              type: 'serializer',
              schema: schemaProps.array({
                label: 'Rules',
                itemSchema: {
                  x: { type: 'number', view: { label: 'vital', layout: 'shortInline' } },
                  y: { type: 'number', view: { label: 'system', layout: 'shortInline' } },
                },
              }),
            },
          },
        };

        return newSchema;
      } else if (od.editorTag === 'scenarios') {
        return schema;
        /*
			export type Scenario = {
				event: {
					type: 'pathology' | 'item',
					id: string,
				},
				blocks: BlockName[],
				time: number;
			}[];*/

        const newSchema = Helpers.cloneDeep(schema);

        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');
        turnPropertyReadOnly(newSchema, 'editorTag');

        const blocksSelector = getBlocksSelector();

        const allPathologies = getPathologies();
        const allItems = getItems();

        /*
			interface PathologyEvent {
				time: number;
				blocks: BlockName[];
				event: {
					type: 'HumanPathology',
					pathologyId: string;
				}
			}

			interface ItemActionEvent {
				time: number;
				blocks: BlockName[];
				event: {
					type: 'ItemActionOnHuman',
					itemId: string;
					actionId: string;
				}
			}
			*/

        const eventSelector = [
          ...allPathologies.map(p => ({
            label: p.label,
            value: {
              type: 'HumanPathology',
              pathologyId: p.value,
            },
          })),
          ...allItems.flatMap(({ id, item }) => {
            return Object.entries(item.actions).map(([actionId]) => ({
              label: `Item ${getItemActionTranslation(item, actionId)}`,
              value: {
                type: 'ItemActionOnHuman',
                itemId: id,
                actionId: actionId,
              },
            }));
          }),
        ];

        newSchema.properties.properties.view = {
          label: 'Scenarios',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'Scenario Id',
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              layout: 'fullWidth',
              schema: {
                type: 'object',
                properties: {
                  description: {
                    type: 'string',
                    view: {
                      type: 'textarea',
                      label: 'description',
                    },
                  },
                  events: {
                    type: 'array',
                    view: {
                      label: 'Events',
                    },
                    items: {
                      type: 'object',
                      childrenView: {
                        layout: 'flexInline',
                      },
                      properties: {
                        time: {
                          type: 'number',
                          view: {
                            label: 'time [s]',
                            layout: 'extraShortInline',
                          },
                        },
                        blocks: blocksSelector,
                        event: {
                          type: 'string',
                          view: {
                            label: 'Event',
                            type: 'select',
                            choices: eventSelector,
                            layout: 'longInline',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };
        return newSchema;
      } else if (od.name === 'generation_settings') {
        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');
        //return newSchema;
        newSchema.properties.properties = {
          required: true,
          type: 'object',
          value: {},
          properties: {
            generationSettings: {
              type: 'string',
              view: {
                type: 'serializer',
                schema: {
                  type: 'object',
                  properties: {
                    ageHistogram: schemaProps.array({
                      label: 'Age Histogram',
                      required: true,
                      //TODO config
                      itemSchema: {
                        min: { type: 'number', view: { label: 'Min', layout: 'shortInline' } },
                        max: { type: 'number', view: { label: 'Max', layout: 'shortInline' } },
                        cardinality: {
                          type: 'number',
                          view: { label: 'Ratio', layout: 'shortInline' },
                        },
                      },
                    }),
                    heightMeanMen: {
                      type: 'number',
                      view: { label: 'Height Mean Men', layout: 'shortInline' },
                    },
                    heightStdDevMen: {
                      type: 'number',
                      view: { label: 'Height Standard Deviation Men', layout: 'shortInline' },
                    },

                    heightMeanWomen: {
                      type: 'number',
                      view: { label: 'Height Mean Women', layout: 'shortInline' },
                    },
                    heightStdDevWomen: {
                      type: 'number',
                      view: { label: 'Height Standard Deviation Women', layout: 'shortInline' },
                    },

                    BMImean: { type: 'number', view: { label: 'BMI Mean', layout: 'shortInline' } },
                    BMIstdDev: {
                      type: 'number',
                      view: { label: 'BMI Standard Deviation', layout: 'shortInline' },
                    },
                    bodyTemperatureMean: {
                      type: 'number',
                      view: { label: 'Body Temperature Mean', layout: 'shortInline' },
                    },
                    bodyTemperatureSTD: {
                      type: 'number',
                      view: { label: 'Body Temperature STD', layout: 'shortInline' },
                    },
                    bloodSugarLevelMean: {
                      type: 'number',
                      view: { label: 'Blood Sugar Level Mean', layout: 'shortInline' },
                    },
                    bloodSugarLevelSTD: {
                      type: 'number',
                      view: { label: 'Blood Sugar Level STD', layout: 'shortInline' },
                    },

                    WomanManRatio: {
                      type: 'number',
                      view: { label: 'W/M Ratio', layout: 'shortInline' },
                    },
                  },
                },
              },
            },
          },
        };
        return newSchema;
      } else if (['bags', 'situations', 'skills', 'drill - presets'].indexOf(od.editorTag) > -1) {
        let keyName = 'actions';
        switch (od.editorTag) {
          case 'bags':
            keyName = 'items';
            break;
          case 'situations':
            keyName = 'pathologies';
            break;
          case 'drill - presets':
            keyName = 'patients';
            break;
        }
        //keyName = od.editorTag === 'bags' ? 'items' :  od.editorTag === 'situations'  ? 'pathologies' : 'actions';

        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');
        turnPropertyReadOnly(newSchema, 'editorTag');

        newSchema.properties.properties.view = {
          label: od.editorTag,
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'Id',
              layout: 'shortInline',
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', view: { label: 'name', layout: 'shortInline' } },
                  [keyName]: {
                    type: 'object',
                    value: {},
                    view: {
                      type: 'hidden',
                    },
                  },
                },
              },
            },
          },
        };

        return newSchema;
      } else if (od.editorTag === 'localization') {
        const newSchema = Helpers.cloneDeep(schema);
        //hideProperty(newSchema, "description");
        //hideProperty(newSchema, "defaultInstance")
        //turnPropertyReadOnly(newSchema, "editorTag");

        newSchema.properties.properties.view = {
          label: 'Translations',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'Key',
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              schema: {
                view: {
                  label: 'translation',
                  type: 'i18nstring',
                },
              },
            },
          },
        };

        return newSchema;
      } else if (od.editorTag === 'actionsDurations') {
        const newSchema = Helpers.cloneDeep(schema);
        hideProperty(newSchema, 'description');
        hideProperty(newSchema, 'defaultInstance');

        //hideProperty(newSchema, "label");
        turnPropertyReadOnly(newSchema, 'editorTag');
        newSchema.properties.properties.view = {
          label: 'Actions',
          type: 'dictionary',
          value: {},
          keySchema: {
            type: 'string',
            view: {
              label: 'Action key',
              layout: 'shortInline',
            },
          },
          valueSchema: {
            type: 'string',
            value: '{}',
            view: {
              type: 'serializer',
              schema: {
                type: 'object',
                properties: {
                  low_skill: {
                    type: 'number',
                    view: { label: 'Low Skill Duration', layout: 'shortInline' },
                  },
                  high_skill: {
                    type: 'number',
                    view: { label: 'High Skill Duration', layout: 'shortInline' },
                  },
                },
              },
            },
          },
        };
        return newSchema;
      }
    },
    'ObjectDescriptor'
  );

  /*
	  Schemas.addSchema("compSchema", (entity, schema) => {
		if (typeof entity === 'object') {
		  if (entity['type'] === "Select input") {
			if (entity['props']?.id === 'patientSelector') {
			  const newSchema = Helpers.cloneDeep(schema);
			  newSchema.properties.componentProperties.properties.choices = {
				"required": true,
				"type": "object",
				"view": {
				  "returnType": ["{label:string; value:string;}[]"],
				  "label": "Choices",
				  "type": "customscript"
				}
			  }

			  return newSchema;
			}
		  }
		}
	  });
	  */
});
