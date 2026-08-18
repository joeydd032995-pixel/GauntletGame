import { buildHeroProductionShell, buildEnemyProductionShell, updateProductionCharacterLOD } from './productionCharacter.js';
import { assertProductionCharacter } from './characterQuality.js';
import { addWardenProductionDetails } from './characterDetail.js';
import { addSkinnedUndersuit } from './skinnedUndersuit.js';

function finalize(shell,rig,label){shell.audit=assertProductionCharacter(rig.group,label);shell.quality={...shell.quality,audit:shell.audit,skinnedUnderlayer:true};return shell;}
export function applyHeroArtPass(rig){const shell=buildHeroProductionShell(rig);shell.undersuit=addSkinnedUndersuit(rig,shell.materials.cloth);return finalize(shell,rig,'Vanguard');}
export function applyEnemyArtPass(rig){const shell=buildEnemyProductionShell(rig);addWardenProductionDetails(rig,shell.materials);shell.undersuit=addSkinnedUndersuit(rig,shell.materials.cloth,{enemy:true});return finalize(shell,rig,'Dread Warden');}
export { updateProductionCharacterLOD };
