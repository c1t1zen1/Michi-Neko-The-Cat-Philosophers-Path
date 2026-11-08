import { runLab } from '../../shared/workshop.js';
import { SOURCES, FAMILIES, SPECIMENS, STEPS, ASSEMBLY, loadDeps } from './recipes.js';
import { makeSummitStage } from './stage.js';

await loadDeps();
runLab({ slug: 'summit', hour: 16, plinth: 'stone', families: FAMILIES, specimens: SPECIMENS, sources: SOURCES, steps: STEPS, assembly: ASSEMBLY,
  choose: (spec, lab) => lab.world?.chooseSpec?.(spec), stage: makeSummitStage });
