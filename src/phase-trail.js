import * as THREE from 'three';
const TRAIL_LIFETIME=.4,TRAIL_FADE_DELAY=.06;
export class PhaseTrail {
  constructor(scene){
    this.color=new THREE.Color('#fff1bc');this.samples=[];this.clock=0;
    this.geometry=new THREE.BufferGeometry();this.positions=new Float32Array(128*6);this.colors=new Float32Array(128*6);this.alphas=new Float32Array(128*2);this.rainbows=new Float32Array(128*2);this.uvs=new Float32Array(128*4);
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));this.geometry.setAttribute('fade',new THREE.BufferAttribute(this.alphas,1));this.geometry.setAttribute('rainbow',new THREE.BufferAttribute(this.rainbows,1));this.geometry.setAttribute('uv',new THREE.BufferAttribute(this.uvs,2));
    const indices=[];for(let i=0;i<127;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}this.geometry.setIndex(indices);
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,uniforms:{background:{value:null},resolution:{value:new THREE.Vector2(1,1)},clock:{value:0}},vertexShader:`attribute vec3 color;attribute float fade;attribute float rainbow;varying float prism;varying vec3 tint;varying float alpha;varying vec2 ribbonUV;void main(){tint=color;alpha=fade;prism=rainbow;ribbonUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
      uniform sampler2D background;uniform vec2 resolution;uniform float clock;varying float prism;varying vec3 tint;varying float alpha;varying vec2 ribbonUV;
      void main(){
        float x=ribbonUV.x,y=ribbonUV.y*2.-1.;
        float wave=sin(x*12.-clock*6.)*.18+sin(x*23.+clock*4.)*.08;
        float edge=exp(-pow((y-wave)*1.65,2.))*(1.-smoothstep(.55,1.,abs(y)));
        float tail=smoothstep(0.,.3,x);
        float cap=1.-smoothstep(.55,1.,length(vec2((x-.3)/.3,y)));
        float headCap=1.-smoothstep(.45,1.,length(vec2(max(0.,x-.78)/.22,y)));
        float endFalloff=mix(cap,1.,smoothstep(.18,.32,x))*headCap;
        float mask=edge*alpha*tail*endFalloff;
        vec2 uv=gl_FragCoord.xy/resolution;
        vec2 warp=vec2(sin(x*23.+clock*7.),cos(x*16.-clock*6.))*mask*4./resolution;
        vec2 p=2.4*(1.+.1*smoothstep(.65,1.,x))/resolution;vec2 sampleUV=clamp(uv+warp,p,1.-p);
        vec3 soft=texture2D(background,sampleUV).rgb*.4;
        soft+=(texture2D(background,sampleUV+vec2(p.x,0.)).rgb+texture2D(background,sampleUV-vec2(p.x,0.)).rgb+texture2D(background,sampleUV+vec2(0.,p.y)).rgb+texture2D(background,sampleUV-vec2(0.,p.y)).rgb)*.15;
        float core=exp(-pow((y-wave)*6.,2.));
        float filamentA=exp(-pow((y-wave-sin(x*15.-clock*8.)*.34)*13.,2.));
        float filamentB=exp(-pow((y+wave*.5+sin(x*19.+clock*5.)*.38)*15.,2.));
        float head=exp(-pow((x-.94)*13.,2.)-pow(y*3.,2.));
        vec3 spectrum=.78+.22*cos(6.2831853*(x*1.6+y*.22+vec3(0.,.333,.667)));
        vec3 lightTint=mix(tint,spectrum,prism);
        vec3 glow=lightTint*(.65+core*1.25+filamentA*.7+filamentB*.55+head*1.4);
        gl_FragColor=vec4(soft+glow,mask*.92);
      }`});
    this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.layers.set(3);this.mesh.frustumCulled=false;this.mesh.visible=false;scene.add(this.mesh);
    // Separate additive light from the refracting ribbon so its glow survives
    // after the body becomes transparent, without dimming the scene behind it.
    this.halo=new THREE.Mesh(this.geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,vertexShader:this.material.vertexShader,fragmentShader:`
      varying vec3 tint;varying float alpha;varying float prism;varying vec2 ribbonUV;
      void main(){
        float x=ribbonUV.x,y=ribbonUV.y*2.-1.;
        float wave=sin(x*12.)*.16;
        float feather=1.-smoothstep(.65,1.,abs(y));
        float rim=exp(-pow((abs(y-wave)-.48)*5.,2.));
        float bloom=exp(-pow((y-wave)*1.8,2.));
        vec3 spectrum=.78+.22*cos(6.2831853*(x*1.6+y*.22+vec3(0.,.333,.667)));
        vec3 light=mix(tint,spectrum,prism);
        float cap=1.-smoothstep(.55,1.,length(vec2((x-.3)/.3,y)));
        float headCap=1.-smoothstep(.45,1.,length(vec2(max(0.,x-.78)/.22,y)));
        float endFalloff=mix(cap,1.,smoothstep(.18,.32,x))*headCap;
        gl_FragColor=vec4(light*1.5,(rim*.4+bloom*.2)*feather*smoothstep(0.,.3,x)*endFalloff*pow(max(alpha,0.),.45));
      }`}));this.halo.layers.set(3);this.halo.frustumCulled=false;this.halo.visible=false;this.halo.renderOrder=1;scene.add(this.halo);
    this.side=new THREE.Vector3();this.direction=new THREE.Vector3();this.view=new THREE.Vector3();
    const sparkGeometry=new THREE.BufferGeometry();this.sparkPositions=new Float32Array(240*3);this.sparkColors=new Float32Array(240*3);this.sparkFade=new Float32Array(240);
    sparkGeometry.setAttribute('position',new THREE.BufferAttribute(this.sparkPositions,3));sparkGeometry.setAttribute('color',new THREE.BufferAttribute(this.sparkColors,3));sparkGeometry.setAttribute('fade',new THREE.BufferAttribute(this.sparkFade,1));
    this.sparks=new THREE.Points(sparkGeometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,vertexShader:`attribute vec3 color;attribute float fade;varying vec3 tint;varying float alpha;void main(){tint=color;alpha=fade;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(110./-p.z,2.5,8.);}`,fragmentShader:`varying vec3 tint;varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(tint*2.8,exp(-r*r*5.)*alpha);}`}));this.sparks.layers.set(3);this.sparks.frustumCulled=false;scene.add(this.sparks);this.particles=[];
  }
  reset(){this.samples=[];this.particles=[];this.emission=0;this.mesh.visible=this.halo.visible=false;this.sparks.geometry.setDrawRange(0,0);}
  update(dt,position,active,camera,color=this.color,rainbow=false){
    this.clock+=dt;this.material.uniforms.clock.value=this.clock;
    for(const sample of this.samples)sample.age+=dt;
    this.samples=this.samples.filter(s=>s.age<TRAIL_LIFETIME);
    if(active){
      const start=this.samples.at(-1)?.point??position,count=Math.min(128,Math.max(1,Math.ceil(start.distanceTo(position)/.05))),previousColor=this.samples.at(-1)?.color??color;
      if(!this.samples.length)this.samples.push({point:position.clone(),age:0,rainbow,color:color.clone()});
      else if(start.distanceToSquared(position)>.000025)for(let i=1;i<=count;i++){const point=start.clone().lerp(position,i/count);this.samples.push({point,age:dt*(1-i/count),rainbow,color:previousColor.clone().lerp(color,i/count)});}
      const backward=start.clone().sub(position).normalize();
      if(backward.lengthSq()>0){
        const side=new THREE.Vector3().crossVectors(backward,camera.position.clone().sub(position)).normalize(),up=new THREE.Vector3().crossVectors(side,backward).normalize();
        this.emission=(this.emission??0)+dt*210;const emitted=Math.min(60,Math.floor(this.emission));this.emission-=emitted;
        for(let i=0;i<emitted;i++){
          const angle=Math.random()*Math.PI*2,spread=Math.sqrt(Math.random()),radial=side.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up,Math.sin(angle));
          const speed=.8+Math.random()*1.2;
          this.particles.push({point:start.clone().lerp(position,(i+.5)/emitted).addScaledVector(radial,spread*.055),color:new THREE.Color(1,1,1),age:0,life:.45+Math.random()*.4,drift:backward.clone().multiplyScalar(speed).addScaledVector(radial,speed*spread*.7).add(new THREE.Vector3(0,.12,0))});
        }
      }
    }
    this.samples=this.samples.slice(-128);const samples=this.samples;this.mesh.visible=this.halo.visible=samples.length>1;
    const distances=[0];for(let i=1;i<samples.length;i++)distances[i]=distances[i-1]+samples[i].point.distanceTo(samples[i-1].point);
    const totalDistance=Math.max(.001,distances.at(-1)??0),previousSide=new THREE.Vector3();
    for(let i=0;i<samples.length;i++){
      const sample=samples[i],next=samples[Math.min(i+3,samples.length-1)],prev=samples[Math.max(0,i-3)],fade=1-THREE.MathUtils.smoothstep(sample.age,TRAIL_FADE_DELAY,TRAIL_LIFETIME);
      const along=distances[i]/totalDistance,width=.9*(.45+.85*THREE.MathUtils.smoothstep(along,.25,1))*(1.-.5*THREE.MathUtils.smoothstep(along,.45,1));
      this.direction.subVectors(next.point,prev.point);this.view.subVectors(camera.position,sample.point);this.side.crossVectors(this.direction,this.view).normalize();
      if(this.side.lengthSq()<.001)this.side.copy(previousSide);
      if(i&&this.side.dot(previousSide)<0)this.side.negate();
      if(i)this.side.lerp(previousSide,.35).normalize();previousSide.copy(this.side);
      this.side.multiplyScalar(width*(.7+.3*Math.sqrt(fade)));
      for(let j=0;j<2;j++){const k=i*2+j,sign=j?1:-1;this.positions.set([sample.point.x+this.side.x*sign,sample.point.y+this.side.y*sign,sample.point.z+this.side.z*sign],k*3);this.colors.set(sample.color.toArray(),k*3);this.alphas[k]=fade;this.rainbows[k]=sample.rainbow?1:0;this.uvs.set([along,j],k*2);}
    }
    this.geometry.setDrawRange(0,Math.max(0,samples.length-1)*6);for(const attr of Object.values(this.geometry.attributes))attr.needsUpdate=true;
    this.particles=this.particles.filter(p=>(p.age+=dt)<p.life).slice(-240);this.particles.forEach((p,i)=>{p.point.addScaledVector(p.drift,dt);this.sparkPositions.set(p.point.toArray(),i*3);this.sparkColors.set(p.color.toArray(),i*3);this.sparkFade[i]=(1-p.age/p.life)**2;});this.sparks.geometry.setDrawRange(0,this.particles.length);for(const attr of Object.values(this.sparks.geometry.attributes))attr.needsUpdate=true;
  }
}






