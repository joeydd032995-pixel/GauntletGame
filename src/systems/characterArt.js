import { buildHeroProductionShell, buildEnemyProductionShell, updateProductionCharacterLOD } from './productionCharacter.js';
import { assertProductionCharacter } from './characterQuality.js';
import { addWardenProductionDetails } from './characterDetail.js';
import { addSkinnedUndersuit } from './skinnedUndersuit.js';
import { finalizeGeneratedCharacter } from './characterFinalize.js';

function finalize(shell,rig,label,generation){shell.audit=assertProductionCharacter(rig.group,label);shell.quality={...shell.quality,audit:shell.audit,skinnedUnderlayer:true,generationFinalization:generation};return shell;}
export function applyHeroArtPass(rig){const shell=buildHeroProductionShell(rig),generation=finalizeGeneratedCharacter(rig.group);shell.undersuit=addSkinnedUndersuit(rig,shell.materials.cloth);return finalize(shell,rig,'Vanguard',generation);}
export function applyEnemyArtPass(rig){const shell=buildEnemyProductionShell(rig);addWardenProductionDetails(rig,shell.materials);const generation=finalizeGeneratedCharacter(rig.group);shell.undersuit=addSkinnedUndersuit(rig,shell.materials.cloth,{enemy:true});return finalize(shell,rig,'Dread Warden',generation);}
export { updateProductionCharacterLOD };
