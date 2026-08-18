import { buildHeroProductionShell, buildEnemyProductionShell, updateProductionCharacterLOD as updateGeneratedCharacterLOD } from './productionCharacter.js';
import { assertProductionCharacter } from './characterQuality.js';
import { addWardenProductionDetails } from './characterDetail.js';
import { addSkinnedUndersuit } from './skinnedUndersuit.js';
import { finalizeGeneratedCharacter } from './characterFinalize.js';
import { elevateHeroPresentation, elevateEnemyPresentation } from './characterPresentation.js';

function finalize(shell,rig,label,generation,presentation){shell.audit=assertProductionCharacter(rig.group,label);shell.quality={...shell.quality,audit:shell.audit,skinnedUnderlayer:true,generationFinalization:generation,presentation};return shell;}
export function applyHeroArtPass(rig){const shell=buildHeroProductionShell(rig),generation=finalizeGeneratedCharacter(rig.group);shell.undersuit=addSkinnedUndersuit(rig,shell.materials.cloth);const presentation=elevateHeroPresentation(rig,shell);return finalize(shell,rig,'Vanguard',generation,presentation);}
export function applyEnemyArtPass(rig){const shell=buildEnemyProductionShell(rig);addWardenProductionDetails(rig,shell.materials);const generation=finalizeGeneratedCharacter(rig.group);shell.undersuit=addSkinnedUndersuit(rig,shell.materials.cloth,{enemy:true});const presentation=elevateEnemyPresentation(rig,shell);return finalize(shell,rig,'Dread Warden',generation,presentation);}
export function updateProductionCharacterLOD(root,camera){
  updateGeneratedCharacterLOD(root,camera);
  root.traverse(o=>{if(o.isMesh&&o.userData?.hiddenByAuthoredCharacter)o.visible=false;});
}
