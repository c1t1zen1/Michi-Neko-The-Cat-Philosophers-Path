import { runLab } from '../../shared/workshop.js';
import { SOURCES, FAMILIES, SPECIMENS, STEPS, ASSEMBLY, loadDeps } from './recipes.js';
import { makeKomorebiStage } from './stage.js';

await loadDeps();
runLab({ slug: 'komorebi', hour: 13, plinth: 'moss', families: FAMILIES, specimens: SPECIMENS, sources: SOURCES, steps: STEPS, assembly: ASSEMBLY,
  choose: (spec, lab) => lab.world?.chooseSpec?.(spec), stage: makeKomorebiStage });
