import { buildHeroProductionShell, buildEnemyProductionShell, updateProductionCharacterLOD } from './productionCharacter.js';
import { assertProductionCharacter } from './characterQuality.js';
import { addWardenProductionDetails } from './characterDetail.js';

function finalize(shell,rig,label){shell.audit=assertProductionCharacter(rig.group,label);shell.quality={...shell.quality,audit:shell.audit};return shell;}
export function applyHeroArtPass(rig){return finalize(buildHeroProductionShell(rig),rig,'Vanguard');}
export function applyEnemyArtPass(rig){const shell=buildEnemyProductionShell(rig);addWardenProductionDetails(rig,shell.materials);return finalize(shell,rig,'Dread Warden');}
export { updateProductionCharacterLOD };
