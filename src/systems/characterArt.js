import { buildHeroProductionShell, buildEnemyProductionShell, updateProductionCharacterLOD } from './productionCharacter.js';

export function applyHeroArtPass(rig){return buildHeroProductionShell(rig);}
export function applyEnemyArtPass(rig){return buildEnemyProductionShell(rig);}
export { updateProductionCharacterLOD };
