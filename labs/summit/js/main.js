import { runLab } from '../../shared/workshop.js';
import { SOURCES, FAMILIES, SPECIMENS, STEPS, ASSEMBLY, loadDeps } from './recipes.js';
import { makeSummitStage } from './stage.js';
import { LIFE_FAMILY, LIFE_SPECIMENS } from './life.js';

await loadDeps();
runLab({ slug: 'summit', hour: 16, plinth: 'stone', families: [...FAMILIES, LIFE_FAMILY], specimens: [...SPECIMENS, ...LIFE_SPECIMENS], sources: SOURCES, steps: STEPS, assembly: ASSEMBLY,
  choose: (spec, lab) => lab.world?.chooseSpec?.(spec), stage: makeSummitStage });
