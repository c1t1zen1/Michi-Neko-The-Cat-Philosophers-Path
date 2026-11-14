// The shrine family (Phase 2, wave 2.2): lab 06 "shrine".
//   torii, shrine-hall (+ shimenawa, shrine-bell, offering-box as its
//   components), mist-altar, offering-bells.
// See gate.js, hall.js and altar.js for what each builds and why.
import { assets as gate } from './gate.js?v=20261113a';
import { assets as hall } from './hall.js?v=20261113a';
import { assets as altar } from './altar.js?v=20261113a';

export const assets = [...gate, ...hall, ...altar];
