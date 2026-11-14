import { runLab } from '../../shared/workshop.js';
import { SOURCES, FAMILIES, SPECIMENS, STEPS, ASSEMBLY, loadDeps } from './recipes.js';
import { TREAT_FAMILY, TREAT_SPECIMENS } from './treats.js';
import { makeKeepsakeStage } from './stage.js';

await loadDeps();
runLab({ slug: 'keepsakes', hour: 13, plinth: 'moss', families: [...FAMILIES.slice(0, 2), TREAT_FAMILY, ...FAMILIES.slice(2)], specimens: [...SPECIMENS.slice(0, -1), ...TREAT_SPECIMENS, SPECIMENS[SPECIMENS.length - 1]], sources: SOURCES, steps: STEPS, assembly: ASSEMBLY,
  choose: (spec, lab) => lab.world?.chooseSpec?.(spec), stage: makeKeepsakeStage });
