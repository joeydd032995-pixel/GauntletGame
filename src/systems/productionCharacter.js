import * as THREE from 'three';
import { physicalSurface } from './materials.js';

const FRONT = new THREE.Vector3(0,0,1);

function shadow(mesh){ mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.productionShell=true; return mesh; }
function mark(group){ group.userData.productionShell=true; return group; }
function hideLegacy(node){ for(const c of node.children){ if(c.isMesh&&!c.userData.productionShell)c.visible=false; if(!c.isBone)hideLegacy(c