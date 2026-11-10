import * as THREE from 'three';
import { createVisualRandom } from './visual-random.js';
const random=createVisualRandom('ground-smoke');

export function softShadowMaterial(){
  return new THREE.ShaderMaterial({
    uniforms:{clock:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:'varying vec2 shadowUV;void main(){shadowUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float clock;varying vec2 shadowUV;
      void main(){vec2 q=(shadowUV-.5)*2.0;float a=atan(q.y,q.x);float edge=.89+.035*sin(a*7.0+clock*.35)+.025*sin(a*11.0-clock*.22);float alpha=1.0-smoothstep(.57,edge,length(q));gl_FragColor=vec4(.009,.005,.018,alpha*.94);}`,
  });
}

export class GroundShadowSmoke {
  constructor(scene,sources){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');
    for(let i=0;i<5;i++){
      const x=32+Math.cos(i*2.4)*10,y=32+Math.sin(i*2.4)*10,gradient=ctx.createRadialGradient(x,y,0,x,y,23);
      gradient.addColorStop(0,'rgba(255,255,255,.6)');gradient.addColorStop(.4,'rgba(255,255,255,.25)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    }
    const positions=[],phases=[],lives=[],sizes=[],rises=[];
    let index=0;
    for(const source of sources){
      const count=source.gap?22:13;
      for(let i=0;i<count;i++,index++){
        const a=random()*Math.PI*2,spread=source.gap?1.35:.65;
        positions.push(source.x+Math.cos(a)*spread*(.3+(i%5)*.14),source.y+.03,source.z+Math.sin(a)*spread*(.3+(i%4)*.17));
        phases.push(random());lives.push(4.8+random()*2.6);sizes.push(.38+random()*.36);rises.push(1.7+random()*1.16);
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    for(const [name,data] of Object.entries({phase:phases,life:lives,moteSize:sizes,rise:rises}))geometry.setAttribute(name,new THREE.Float32BufferAttribute(data,1));
    this.material=new THREE.ShaderMaterial({uniforms:{clock:{value:0},pixelHeight:{value:720},cloud:{value:new THREE.CanvasTexture(canvas)}},transparent:true,depthWrite:false,
      vertexShader:`uniform float clock;uniform float pixelHeight;attribute float phase;attribute float life;attribute float moteSize;attribute float rise;varying float alpha;
        void main(){float t=fract(clock/life+phase);vec3 p=position;p.y+=t*rise;p.x+=sin(t*3.0+phase*12.0)*t*.12;p.z+=cos(t*2.0+phase*9.0)*t*.1;vec4 view=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*view;gl_PointSize=clamp(moteSize*(.65+t*.8)*pixelHeight/max(1.0,-view.z),1.0,120.0);alpha=pow(sin(t*3.14159265),.8)*.65;}`,
      fragmentShader:'uniform sampler2D cloud;varying float alpha;void main(){float smoke=texture2D(cloud,gl_PointCoord).a;gl_FragColor=vec4(.003,.002,.007,smoke*alpha);}',
    });
    this.points=new THREE.Points(geometry,this.material);this.points.frustumCulled=false;scene.add(this.points);
  }
  update(time,pixelHeight){this.material.uniforms.clock.value=time;this.material.uniforms.pixelHeight.value=pixelHeight;}
}
