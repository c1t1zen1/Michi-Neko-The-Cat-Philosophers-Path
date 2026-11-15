import { runLab } from '../../shared/workshop.js';
import { SOURCES, FAMILIES, SPECIMENS, STEPS, ASSEMBLY, loadDeps } from './recipes.js';
import { makeSummitStage } from './stage.js';
import { LIFE_FAMILY, LIFE_SPECIMENS } from './life.js';
import { VISTA_FAMILY, VISTA_SPECIMENS, loadVistaDeps } from './vista.js';

await loadDeps();
await loadVistaDeps();
runLab({ slug: 'summit', hour: 16, plinth: 'stone', families: [...FAMILIES.slice(0, 3), VISTA_FAMILY, ...FAMILIES.slice(3), LIFE_FAMILY], specimens: [...SPECIMENS, ...VISTA_SPECIMENS, ...LIFE_SPECIMENS], sources: SOURCES, steps: STEPS, assembly: ASSEMBLY,
  choose: (spec, lab) => lab.world?.chooseSpec?.(spec), stage: makeSummitStage });
