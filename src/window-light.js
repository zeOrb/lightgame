import * as THREE from 'three';
import { ROUTE_RADIUS, SHELF_HALF_ANGLE, SHELF_OUTER_RADIUS, shelfInnerRadius } from './game.js';

export const SUN_RAY_DIRECTION = new THREE.Vector3(15,-22,25).normalize();

export function paneBeam(pane) {
  pane.updateWorldMatrix(true,false);
  const {width,height,depth}=pane.geometry.parameters;
  const origin=new THREE.Vector3(0,0,-depth/2-.025).applyMatrix4(pane.matrixWorld);
  const direction=new THREE.Vector3(-origin.x,-Math.hypot(origin.x,origin.z)*.65,-origin.z).normalize();
  const length=Math.hypot(origin.x,origin.z)/Math.hypot(direction.x,direction.z);
  const localCorners=[[-width/2,-height/2], [width/2,-height/2], [width/2,height/2], [-width/2,height/2]];
  const corners=localCorners
    .map(([x,y])=>new THREE.Vector3(x,y,-depth/2-.025).applyMatrix4(pane.matrixWorld));
  // Copy UVs from the actual inward-facing glass face, rather than rotating
  // the floor texture independently of the pane geometry.
  const attributes=pane.geometry.attributes;
  const sourceUV=localCorners.flatMap(([x,y])=>{
    for(let i=0;i<attributes.position.count;i++)if(attributes.normal.getZ(i)<-.99&&Math.abs(attributes.position.getX(i)-x)<1e-5&&Math.abs(attributes.position.getY(i)-y)<1e-5)return [attributes.uv.getX(i),attributes.uv.getY(i)];
    return [0,0];
  });
  return {origin,corners,sourceUV,length,direction,color:(pane.material.userData.beamColor??pane.material.color).clone()};
}

export function createWindowLight(panes,floors,reservedShelves = new Set()) {
  const group=new THREE.Group(),materials=[],floorMaterials=[],zones=[],windows=new Map();
  const arenaMask={arenaEnabled:{value:false},arenaY:{value:0},arenaRadius:{value:0},solidDepth:{value:null},bufferSize:{value:new THREE.Vector2(1,1)},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()}};
  for(const pane of panes){
    const beam=paneBeam(pane),window=pane.parent;
    if(!windows.has(window)){
      const origin=window?window.getWorldPosition(new THREE.Vector3()):beam.origin.clone();
      const angle=Math.atan2(origin.z,origin.x);
      let floor=null;
      for(const candidate of floors){
        if(reservedShelves.has(candidate.userData.s))continue;
        const delta=Math.atan2(Math.sin(candidate.userData.theta-angle),Math.cos(candidate.userData.theta-angle));
        if(Math.abs(delta)<SHELF_HALF_ANGLE&&candidate.userData.y<origin.y-1&&(!floor||candidate.userData.y>floor.userData.y))floor=candidate;
      }
      const targetAngle=floor?floor.userData.theta:angle;
      const radial=new THREE.Vector3(Math.cos(targetAngle),0,Math.sin(targetAngle)),tangent=new THREE.Vector3(-Math.sin(targetAngle),0,Math.cos(targetAngle));
      const sourceTangent=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
      const center=floor?radial.clone().multiplyScalar(ROUTE_RADIUS+.55).setY(floor.userData.y+.035):new THREE.Vector3(0,Math.max(2,origin.y-9),0);
      const patch=new THREE.Group();group.add(patch);
      const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
      for(const sibling of panes)if(sibling.parent===window)for(const corner of paneBeam(sibling).corners){
        const offset=corner.clone().sub(origin),x=offset.dot(sourceTangent);
        bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);bounds.minY=Math.min(bounds.minY,offset.y);bounds.maxY=Math.max(bounds.maxY,offset.y);
      }
      // A full-size projection: one world unit of glass becomes one unit of floor.
      const scaleX=1,scaleY=1;
      const midX=(bounds.minX+bounds.maxX)/2,midY=(bounds.minY+bounds.maxY)/2;
      const data={origin,radial,tangent,sourceTangent,center,patch,floor,scaleX,scaleY,midX,midY,window,panes:[],beams:[],replaced:[],extinguished:false};windows.set(window,data);
      if(floor){data.zone={s:floor.userData.s,lane:0,o:patch,taken:false,center:center.clone(),radial:radial.clone(),tangent:tangent.clone(),width:(bounds.maxX-bounds.minX)*scaleX,length:(bounds.maxY-bounds.minY)*scaleY,palette:pane.material.userData.glowPalette??[beam.color],extinguished:false};zones.push(data.zone);}
    }
    const data=windows.get(window);
    data.panes.push(pane);
    // Refract the entire pane mosaic into a compact horizontal carpet.
    const endCorners=beam.corners.map(point=>{
      const offset=point.clone().sub(data.origin);
      return data.center.clone().addScaledVector(data.tangent,(offset.dot(data.sourceTangent)-data.midX)*data.scaleX).addScaledVector(data.radial,-(offset.y-data.midY)*data.scaleY);
    });
    const positions=[],uvs=[],indices=[];
    for(let face=0;face<4;face++){
      const a=beam.corners[face],b=beam.corners[(face+1)%4];
      const endA=endCorners[face],endB=endCorners[(face+1)%4];
      for(const p of [a,b,endB,endA])positions.push(p.x,p.y,p.z);
      uvs.push(0,0,1,0,1,1,0,1);const k=face*4;indices.push(k,k+1,k+2,k,k+2,k+3);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
    const baseOpacity=.052*(.35+.65*THREE.MathUtils.clamp(beam.origin.y/106,0,1));
    const material=new THREE.ShaderMaterial({
      uniforms:{beamColor:{value:beam.color},strength:{value:baseOpacity},...arenaMask},
      vertexShader:'varying vec2 beamUV; void main(){beamUV=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform vec3 beamColor;uniform float strength;varying vec2 beamUV;
        uniform bool arenaEnabled;uniform float arenaY,arenaRadius;uniform sampler2D solidDepth;uniform vec2 bufferSize;uniform mat4 inverseProjection,cameraWorld;
        void main(){
          if(arenaEnabled){
            vec2 screen=gl_FragCoord.xy/bufferSize;float depth=texture2D(solidDepth,screen).r;
            vec4 view=inverseProjection*vec4(screen*2.-1.,depth*2.-1.,1.);view/=view.w;
            vec3 surface=(cameraWorld*view).xyz;
            float maskRadius=abs(surface.y-arenaY)<.06?arenaRadius+.03:arenaRadius-.65;
            if(depth<.99999&&length(surface.xz)<=maskRadius&&surface.y>=arenaY-.4&&surface.y<=arenaY+4.2)discard;
          }
          float edge=pow(max(0.0,sin(3.14159265*beamUV.x)),.65);float fade=.35+.65*pow(1.0-beamUV.y,.8);gl_FragColor=vec4(beamColor,strength*edge*fade);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    });
    material.userData.baseOpacity=baseOpacity;materials.push(material);
    material.userData.windowData=data;
    const beamMesh=new THREE.Mesh(geometry,material);group.add(beamMesh);data.beams.push(beamMesh);
    if(data.floor){
      const floorGeometry=new THREE.BufferGeometry();floorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(endCorners.flatMap(p=>[p.x,p.y,p.z]),3));floorGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(beam.sourceUV,2));floorGeometry.setIndex([0,1,2,0,2,3]);
      const floorMaterial=new THREE.ShaderMaterial({
        uniforms:{beamColor:{value:beam.color},glassMap:{value:pane.material.map??null},hasGlassMap:{value:!!pane.material.map},strength:{value:.8},clock:{value:0},floorAngle:{value:data.floor.userData.theta},floorBounds:{value:new THREE.Vector3(shelfInnerRadius(data.floor.userData.s)+.012,SHELF_OUTER_RADIUS-.012,SHELF_HALF_ANGLE-.001)},projectionDepth:{value:null},depthResolution:{value:new THREE.Vector2(1,1)},depthRange:{value:new THREE.Vector2(.1,240)},depthEnabled:{value:false}},
        vertexShader:'varying vec2 tileUV; varying vec3 tileWorld; void main(){tileUV=uv;tileWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`uniform vec3 beamColor;uniform sampler2D glassMap;uniform bool hasGlassMap;uniform float strength;uniform float clock;uniform float floorAngle;uniform vec3 floorBounds;uniform sampler2D projectionDepth;uniform vec2 depthResolution;uniform vec2 depthRange;uniform bool depthEnabled;varying vec2 tileUV;varying vec3 tileWorld;
          void main(){float r=length(tileWorld.xz);float angle=atan(tileWorld.z,tileWorld.x)-floorAngle;angle=atan(sin(angle),cos(angle));if(r<floorBounds.x||r>floorBounds.y||abs(angle)>floorBounds.z)discard;
          float surfaceMask=1.0;
          if(depthEnabled){
            float depth=texture2D(projectionDepth,gl_FragCoord.xy/depthResolution).r;
            float solidDistance=depthRange.x*depthRange.y/(depthRange.y-depth*(depthRange.y-depthRange.x));
            float decalDistance=depthRange.x*depthRange.y/(depthRange.y-gl_FragCoord.z*(depthRange.y-depthRange.x));
            surfaceMask=1.0-smoothstep(.08,.22,abs(solidDistance-decalDistance));
            if(depth>.99999||surfaceMask<.001)discard;
          }
          vec2 q=tileUV-.5;float border=smoothstep(0.0,.07,min(min(tileUV.x,1.0-tileUV.x),min(tileUV.y,1.0-tileUV.y)));
          float diamond=abs(q.x)+abs(q.y);float lead=1.0-smoothstep(.012,.035,abs(diamond-.36));float star=pow(max(0.0,1.0-length(q)*2.4),5.0);float pulse=.92+.08*sin(clock*1.8+tileWorld.x*.6);
          vec3 color=hasGlassMap?texture2D(glassMap,tileUV).rgb:beamColor;
          gl_FragColor=vec4(color*(1.3+star*.4),strength*border*.85*pulse*surfaceMask);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.NormalBlending,polygonOffset:true,polygonOffsetFactor:-1,
      });
      floorMaterial.userData.baseOpacity=.8;materials.push(floorMaterial);floorMaterials.push(floorMaterial);data.patch.add(new THREE.Mesh(floorGeometry,floorMaterial));
      floorMaterial.userData.windowData=data;
    }
  }
  return {group,zones,
    extinguish(zone){
      const data=[...windows.values()].find(item=>item.zone===zone);if(!data||data.extinguished)return;
      data.extinguished=true;data.fadeAge=0;zone.extinguished=true;zone.lightStrength=1;
      const glass=new Set(data.panes);
      data.window?.traverse(object=>{if(object.isMesh&&object.material?.isMeshBasicMaterial&&object.material.map)glass.add(object);});
      for(const pane of glass){const original=pane.material,dim=original.clone();dim.onBeforeCompile=original.onBeforeCompile;dim.customProgramCacheKey=original.customProgramCacheKey;data.replaced.push({pane,original});pane.material=dim;}
    },
    reset(){for(const data of windows.values()){data.extinguished=false;data.fadeAge=0;if(data.zone){data.zone.extinguished=false;data.zone.lightStrength=1;}data.patch.visible=true;data.beams.forEach(beam=>beam.visible=true);for(const {pane,original} of data.replaced){pane.material.dispose();pane.material=original;}data.replaced=[];}},
    sampleLight(position,jumpHeight=0){
      if(jumpHeight>3.5)return null;
      for(const zone of zones){
        if(Math.abs(position.y-zone.center.y)>.36)continue;
        const radius=Math.hypot(position.x,position.z);
        const angle=Math.atan2(position.z,position.x)-Math.atan2(zone.radial.z,zone.radial.x);
        if(radius<shelfInnerRadius(zone.s)+.012||radius>SHELF_OUTER_RADIUS-.012||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>SHELF_HALF_ANGLE-.001)continue;
        const offset=position.clone().sub(zone.center);
        if(Math.abs(offset.dot(zone.tangent))<zone.width*.5&&Math.abs(offset.dot(zone.radial))<zone.length*.5)return zone;
      }
      return null;
    },
    setArenaMask(arena,camera){arenaMask.arenaEnabled.value=!!arena;arenaMask.arenaY.value=arena?.y??0;arenaMask.arenaRadius.value=arena?.radius??0;camera.updateMatrixWorld();arenaMask.inverseProjection.value.copy(camera.projectionMatrixInverse);arenaMask.cameraWorld.value.copy(camera.matrixWorld);},
    setDepthSource(texture,resolution,range){arenaMask.solidDepth.value=texture;arenaMask.bufferSize.value=resolution;for(const material of floorMaterials){material.uniforms.projectionDepth.value=texture;material.uniforms.depthResolution.value=resolution;material.uniforms.depthRange.value=range;material.uniforms.depthEnabled.value=true;}},
    update(daylight,time=0){
      const dt=Math.max(0,time-(group.userData.lastLightTime??time));group.userData.lastLightTime=time;
      for(const data of windows.values())if(data.extinguished){
        data.fadeAge=Math.min(.5,data.fadeAge+dt);const t=data.fadeAge/.5,fade=t*t*(3-2*t);data.zone.lightStrength=1-fade;
        data.patch.visible=fade<1;data.beams.forEach(beam=>beam.visible=fade<1);
        for(const {pane,original} of data.replaced){pane.material.color.copy(original.color).lerp(new THREE.Color('#302a26'),fade);if(pane.material.emissive){pane.material.emissive.copy(original.emissive);pane.material.emissiveIntensity=original.emissiveIntensity*(1-fade);}}
      }
      for(const material of materials){material.uniforms.strength.value=material.userData.baseOpacity*daylight*(material.userData.windowData.zone?.lightStrength??1)*(floorMaterials.includes(material)&&material.userData.windowData.floor?.parent.visible===false?0:1);if(material.uniforms.clock)material.uniforms.clock.value=time;}
    }};
}
