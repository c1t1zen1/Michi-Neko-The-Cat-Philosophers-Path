import { runLab } from '../../shared/workshop.js';
import { SOURCES, FAMILIES, SPECIMENS, STEPS, ASSEMBLY, loadDeps } from './recipes.js';
import { makeCritterStage } from './stage.js';

await loadDeps();
runLab({ slug: 'critters', hour: 12, plinth: 'moss', families: FAMILIES, specimens: SPECIMENS, sources: SOURCES, steps: STEPS, assembly: ASSEMBLY,
  choose: (spec, lab) => lab.world?.chooseSpec?.(spec), stage: makeCritterStage });
