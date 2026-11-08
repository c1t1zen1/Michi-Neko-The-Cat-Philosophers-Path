import { runLab } from '../../shared/workshop.js';
import { Bag } from '../../shared/craft.js';
import { SOURCES, FAMILIES, SPECIMENS, STEPS, ASSEMBLY, loadShrineDeps, primeSource } from './recipes.js';
import { makeShrineStage } from './stage.js';

const sculpt = await loadShrineDeps();
await primeSource();

runLab({
  slug: 'shrine', hour: 16.8, plinth: 'gravel', exposure: 1.05,
  families: FAMILIES, specimens: SPECIMENS, sources: SOURCES, steps: STEPS, assembly: ASSEMBLY,
  chooseLabel: (s) => (s.original ? 'Compare on the stage' : 'Try it on the stage'),
  choose: (spec, lab) => lab.world?.chooseSpec?.(spec),
  stage: async (lab) => { lab.sculpt = sculpt; lab.Bag = Bag; return makeShrineStage(lab); }
});
