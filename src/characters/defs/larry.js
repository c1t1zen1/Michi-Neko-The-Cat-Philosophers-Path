import { defineCreature } from '../creature.js?v=20261113a';

/** Larry, the corral's turtle guardian. Patrol and the Jade Paw challenge stay in countryside.js. */
export const LARRY = defineCreature({
  id: 'larry',
  kind: 'turtle',
  label: 'Larry the turtle',
  palette: { shell: 0x5f7e42, shellLight: 0x8da85c, skin: 0x9aaa68, plastron: 0xd8cfa0, eye: 0x14120e },
  scale: 1,
  // the behaviour animates the group only (position.y, rotation.y/z); these are the rig's own hinges
  handles: ['shell', 'head', 'flipper_fl', 'flipper_fr', 'flipper_bl', 'flipper_br']
});
