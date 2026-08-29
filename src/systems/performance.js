export class PerformanceGovernor {
  constructor({renderer,rendering,targetMs=16.67}){
    this.renderer=renderer;this.rendering=rendering;this.targetMs=targetMs;this.emaMs=targetMs;this.sampleTime=0;this.stableTime=0;this.scale=1.5;this.minScale=.9;this.maxScale=1.5;this.lastAdjust=0;this.frames=0;
    this.metrics={frameMs:targetMs,fps:60,resolutionScale:this.scale,drawCalls:0,triangles:0,points:0,lines:0,textures:0,geometries:0};
  }
  update(dt){
    const ms=dt*1000;this.emaMs=this.emaMs*.94+ms*.06;this.sampleTime+=dt;this.frames++;
    if(this.sampleTime>=1){
      const info=this.renderer.info;this.metrics={frameMs:+this.emaMs.toFixed(2),fps:+(1000/Math.max(1,this.emaMs)).toFixed(1),resolutionScale:this.scale,drawCalls:info.render.calls,triangles:info.render.triangles,points:info.render.points,lines:info.render.lines,textures:info.memory.textures,geometries:info.memory.geometries};window.__GAUNTLET_METRICS__={...this.metrics};this.sampleTime=0;
    }
    this.lastAdjust+=dt;if(this.lastAdjust<2.25)return;this.lastAdjust=0;
    let next=this.scale;
    if(this.emaMs>29)next=Math.max(this.minScale,this.scale-.25);else if(this.emaMs>21)next=Math.max(this.minScale,this.scale-.12);else if(this.emaMs<15.8)next=Math.min(this.maxScale,this.scale+.1);
    if(Math.abs(next-this.scale)>.04){this.scale=+next.toFixed(2);this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.scale));this.rendering.resize(innerWidth,innerHeight);}
  }
}
