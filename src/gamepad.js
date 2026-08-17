const keyState=new Map();let orbiting=false,lastMode='keyboard';
const bindings={KeyW:false,KeyS:false,KeyA:false,KeyD:false,ShiftLeft:false};
const glyphs={keyboard:['1','2','3','SPACE'],gamepad:['X','Y','B','A']};

function emitKey(code,down){if(keyState.get(code)===down)return;keyState.set(code,down);window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true}));}
function setMode(mode){if(lastMode===mode)return;lastMode=mode;document.documentElement.dataset.input=mode;const labels=document.querySelectorAll('.actionbar kbd'),g=glyphs[mode];labels.forEach((el,i)=>{if(g[i])el.textContent=g[i];});const controls=document.querySelector('.controls');if(controls)controls.innerHTML=mode==='gamepad'?'<span>LS</span> Move <span>RS</span> Orbit <span>RT</span> Sprint <span>ABXY</span> Abilities':'<span>WASD</span> Move <span>SHIFT</span> Sprint <span>RMB</span> Orbit <span>1–3</span> Abilities';}
function buttonPressed(gp,index){return !!gp.buttons[index]?.pressed;}
function axis(v,dead=.2){return Math.abs(v)<dead?0:v;}
function tap(code,pressed,slot){const k=`tap:${slot}`,prev=keyState.get(k)||false;if(pressed&&!prev){window.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));}keyState.set(k,pressed);}

function poll(){
  const pads=navigator.getGamepads?.()||[],gp=[...pads].find(Boolean);
  if(gp){
    const lx=axis(gp.axes[0]||0),ly=axis(gp.axes[1]||0),rx=axis(gp.axes[2]||0,.14),ry=axis(gp.axes[3]||0,.14);
    const active=Math.abs(lx)+Math.abs(ly)+Math.abs(rx)+Math.abs(ry)>0.08||gp.buttons.some(b=>b.pressed);
    if(active)setMode('gamepad');
    emitKey('KeyW',ly<-.22);emitKey('KeyS',ly>.22);emitKey('KeyA',lx<-.22);emitKey('KeyD',lx>.22);emitKey('ShiftLeft',buttonPressed(gp,7));
    tap('Space',buttonPressed(gp,0),0);tap('Digit3',buttonPressed(gp,1),1);tap('Digit1',buttonPressed(gp,2),2);tap('Digit2',buttonPressed(gp,3),3);
    const canvas=document.querySelector('canvas');
    if(canvas&&(rx||ry)){
      if(!orbiting){orbiting=true;canvas.dispatchEvent(new PointerEvent('pointerdown',{button:2,clientX:innerWidth/2,clientY:innerHeight/2,bubbles:true}));}
      window.dispatchEvent(new PointerEvent('pointermove',{clientX:innerWidth/2+rx*22,clientY:innerHeight/2+ry*18,bubbles:true}));
    }else if(orbiting){orbiting=false;window.dispatchEvent(new PointerEvent('pointerup',{button:2,bubbles:true}));}
  }else{
    for(const code of Object.keys(bindings))emitKey(code,false);
    if(orbiting){orbiting=false;window.dispatchEvent(new PointerEvent('pointerup',{button:2,bubbles:true}));}
  }
  requestAnimationFrame(poll);
}

window.addEventListener('keydown',e=>{if(e.isTrusted)setMode('keyboard');},{capture:true});
window.addEventListener('pointermove',e=>{if(e.isTrusted)setMode('keyboard');},{capture:true});
window.addEventListener('gamepadconnected',()=>setMode('gamepad'));
document.documentElement.dataset.input='keyboard';requestAnimationFrame(poll);
