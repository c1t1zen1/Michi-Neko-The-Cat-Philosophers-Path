// The machiya family (Phase 2, wave 2.2, part a): the components every house
// wears, reused by the buildings (part b) and later the Roof Road.
//   kawara-roof  koushi  upper-windows  noren  engawa  timber-frame  namako
//   tea-bench    secret-door  lock-plate
// Lab: labs/machiya (lab 04). Static pieces are plain merged geometry on the
// game's MAT entries or the shared kit bag; the noren cloth is the only live mesh.
import { defineAsset } from '../contract.js?v=20261113a';
import { roofAsset } from './roof.js?v=20261113a';
import { koushiAsset, upperWindowsAsset, norenAsset } from './screens.js?v=20261113a';
import { frameAssets } from './frame.js?v=20261113a';
import { doorAssets } from './door.js?v=20261113a';
import { houseAssets } from './houses.js?v=20261113a';

export const assets = [roofAsset, koushiAsset, upperWindowsAsset, norenAsset, ...frameAssets, ...doorAssets, ...houseAssets].map(defineAsset);
