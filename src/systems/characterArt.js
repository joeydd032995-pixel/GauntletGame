import { buildHeroProductionShell, buildEnemyProductionShell, updateProductionCharacterLOD } from './productionCharacter.js';
import { assertProductionCharacter } from './characterQuality.js';

export function applyHeroArtPass(rig){const shell=buildHeroProductionShell(rig);shell.audit=assertProductionCharacter(rig.group,'Vanguard');return shell;}
export function applyEnemyArtPass(rig){const shell=buildEnemyProductionShell(rig);shell.audit=assertProductionCharacter(rig.group,'Dread Warden');return shell;}
export { updateProductionCharacterLOD };
