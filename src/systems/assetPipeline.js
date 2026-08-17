import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class CharacterAssetPipeline{
  constructor(renderer,{dracoPath='/decoders/draco/',basisPath='/decoders/basis/'}={}){
    this.renderer=renderer;this.manager=new THREE.LoadingManager();this.draco=new DRACOLoader(this.manager).setDecoderPath(dracoPath).setWorkerLimit(2);this.ktx2=new KTX2Loader(this.manager).setTranscoderPath(basisPath).setWorkerLimit(2).detectSupport(renderer);this.loader=new GLTFLoader(this.manager).setDRACOLoader(this.draco).setKTX2Loader(this.ktx2).setMeshoptDecoder(MeshoptDecoder);
  }
  async loadCharacter(url,{requiredBones=['Hips','Spine','Head','LeftFoot','RightFoot'],clipAliases={},maxMaterials=12,requireNormalMaps=true}={}){
    const gltf=await this.loader.loadAsync(url),root=gltf.scene;root.updateMatrixWorld(true);const report={url,meshes:0,skinnedMeshes:0,triangles:0,materials:new Set(),missingNormalMaps:[],missingBones:[],animations:gltf.animations.map(a=>a.name),warnings:[]};
    root.traverse(o=>{if(!o.isMesh)return;report.meshes++;if(o.isSkinnedMesh)report.skinnedMeshes++;const geo=o.geometry;if(geo?.index)report.triangles+=geo.index.count/3;else if(geo?.attributes?.position)report.triangles+=geo.attributes.position.count/3;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!m)continue;report.materials.add(m.uuid);if(requireNormalMaps&&m.isMeshStandardMaterial&&!m.normalMap)report.missingNormalMaps.push(`${o.name||'mesh'}:${m.name||m.type}`);if(m.map)m.map.anisotropy=Math.max(m.map.anisotropy||1,8);if(m.normalMap)m.normalMap.anisotropy=Math.max(m.normalMap.anisotropy||1,8);m.needsUpdate=true;}o.castShadow=true;o.receiveShadow=true;});
    for(const boneName of requiredBones)if(!root.getObjectByName(boneName))report.missingBones.push(boneName);
    if(report.skinnedMeshes===0)report.warnings.push('No SkinnedMesh found');if(report.materials.size>maxMaterials)report.warnings.push(`Material count ${report.materials.size} exceeds budget ${maxMaterials}`);if(report.missingBones.length)report.warnings.push(`Missing required bones: ${report.missingBones.join(', ')}`);if(requireNormalMaps&&report.missingNormalMaps.length)report.warnings.push(`${report.missingNormalMaps.length} standard materials lack normal maps`);
    const clips={};for(const clip of gltf.animations){const key=this.#canonicalClipName(clip.name,clipAliases);if(!clips[key])clips[key]=clip;}
    return{root,clips,gltf,report:{...report,materials:report.materials.size},valid:report.skinnedMeshes>0&&report.missingBones.length===0};
  }
  replaceRuntimeRig({placeholder,loaded,scene,position,rotation,scale=1}){if(!loaded?.valid)throw new Error(`Character asset rejected: ${loaded?.report?.warnings?.join('; ')||'invalid asset'}`);loaded.root.position.copy(position||placeholder.position);loaded.root.quaternion.copy(rotation||placeholder.quaternion);loaded.root.scale.setScalar(scale);scene.add(loaded.root);placeholder.removeFromParent();return loaded.root;}
  #canonicalClipName(name,aliases){const normalized=name.toLowerCase().replace(/[^a-z0-9]+/g,'');for(const[key,values]of Object.entries(aliases))if(values.some(v=>normalized.includes(v.toLowerCase().replace(/[^a-z0-9]+/g,''))))return key;if(/idle/.test(normalized))return'idle';if(/walk/.test(normalized))return'walk';if(/run|jog/.test(normalized))return'run';if(/sprint/.test(normalized))return'sprint';if(/attack|slash|strike/.test(normalized))return'attack';if(/dodge|roll|evade/.test(normalized))return'dodge';if(/hit|react/.test(normalized))return'hit';if(/death|die/.test(normalized))return'death';return name;}
  dispose(){this.draco.dispose();this.ktx2.dispose();}
}
