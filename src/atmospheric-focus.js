import * as THREE from 'three';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {createSunsetLUT,SUNSET_LUT_STYLE,SUNSET_LUT_GLSL} from './sunset-lut.js';

// Gaussian gives soft transitions; disk and box remain available for art tuning.
export const BLUR_VARIANTS=Object.freeze({gaussian:0,disk:1,box:2});
export const FOCUS_STYLE=Object.freeze({blurPixels:5.2,blurVariant:'gaussian',backgroundDim:.78,backgroundSaturation:.68});
export class AtmosphericFocus {
  constructor(){
    this.size=new THREE.Vector2();
    this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
    this.graded=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
    // Avoid float-target MSAA stippling. FXAA smooths the final colour instead;
    // the existing solid-surface prepass supplies clean depth independently.
    this.target.resolveDepthBuffer=false;
    this.material=new THREE.ShaderMaterial({depthTest:true,depthWrite:true,depthFunc:THREE.AlwaysDepth,uniforms:{
      sceneColor:{value:this.target.texture},sceneDepth:{value:null},resolution:{value:new THREE.Vector2(1,1)},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},focusPoint:{value:new THREE.Vector3()},daylight:{value:1},arenaMode:{value:0},arenaFloorY:{value:0},arenaRadius:{value:0},blurPixels:{value:FOCUS_STYLE.blurPixels},backgroundDim:{value:FOCUS_STYLE.backgroundDim},backgroundSaturation:{value:FOCUS_STYLE.backgroundSaturation},
      blurVariant:{value:BLUR_VARIANTS[FOCUS_STYLE.blurVariant]},
    },vertexShader:'varying vec2 screenUV;void main(){screenUV=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      uniform sampler2D sceneColor,sceneDepth;uniform vec2 resolution;uniform mat4 inverseProjection,cameraWorld;
      uniform vec3 focusPoint;uniform float daylight,arenaMode,arenaFloorY,arenaRadius,blurPixels,backgroundDim,backgroundSaturation,blurVariant;varying vec2 screenUV;
      vec3 gradeBackground(vec3 color,float floorDistance){
        float luma=dot(color,vec3(.2126,.7152,.0722));
        color=mix(vec3(luma),color,backgroundSaturation)*backgroundDim;
        color/=1.+max(0.,luma-.7)*.12;
        vec3 haze=mix(vec3(.012,.025,.045),vec3(.055,.075,.083),daylight);
        return mix(color,haze,.12+floorDistance*.12);
      }
      void main(){
        float depth=texture2D(sceneDepth,screenUV).r;
        vec4 view=inverseProjection*vec4(screenUV*2.-1.,depth*2.-1.,1.);view/=view.w;
        vec3 world=(cameraWorld*view).xyz;
        float radius=length(world.xz),vertical=abs(world.y-focusPoint.y);
        float floorSurface=1.-smoothstep(.035,.07,abs(world.y-arenaFloorY));
        float arenaFootprint=(1.-smoothstep(arenaRadius-.8,arenaRadius-.6,radius));
        arenaFootprint=max(arenaFootprint,floorSurface*(1.-smoothstep(arenaRadius,arenaRadius+.03,radius)));
        float arenaHeight=smoothstep(arenaFloorY-.4,arenaFloorY-.1,world.y)*(1.-smoothstep(arenaFloorY+3.9,arenaFloorY+4.2,world.y));
        float arenaPixel=arenaMode*arenaFootprint*arenaHeight;
        float wall=smoothstep(13.8,18.5,radius);
        float otherFloors=smoothstep(4.5,22.,vertical);
        float away=1.-smoothstep(1.2,3.2,length(world-focusPoint));
        float background=max(wall,otherFloors*.85)*(1.-away)*(1.-arenaPixel);
        if(depth>.99999)background=1.;
        vec3 sharp=texture2D(sceneColor,screenUV).rgb,color=sharp;
        if(arenaPixel<.5&&background>.015){
          vec2 pixel=vec2(blurPixels*sqrt(background))/resolution;
          vec3 sum=sharp*.1;float total=.1;
          for(int i=0;i<20;i++){
            float r=sqrt((float(i)+.5)/20.),a=float(i)*2.39996323;
            vec2 offset=vec2(cos(a),sin(a))*r;
            if(blurVariant>1.5)offset=vec2(mod(float(i),5.)/2.-1.,floor(float(i)/5.)/1.5-1.);
            vec2 uv=clamp(screenUV+offset*pixel,vec2(0.),vec2(1.));
            float neighbour=texture2D(sceneDepth,uv).r;
            // Do not smear a sharp rabbit or tread into the library behind it.
            float weight=neighbour<depth-.0003?0.:(blurVariant<.5?exp(-r*r*2.)*.1:.06);
            sum+=texture2D(sceneColor,uv).rgb*weight;total+=weight;
          }
          vec3 soft=gradeBackground(sum/total,otherFloors);
          color=mix(sharp,soft,background*.9);
        }
        // Feather only the narrow silhouette of a tread against deeper scenery.
        // The rabbit remains sharp; the shelf interior does not get blurred.
        if(arenaPixel<.5&&radius>9.5&&radius<14.5&&world.y<focusPoint.y-.075){
          vec3 edgeColor=vec3(0.);float edgeWeight=0.;
          for(int i=0;i<4;i++){
            float a=float(i)*1.5707963;vec2 uv=clamp(screenUV+vec2(cos(a),sin(a))*2.1/resolution,vec2(0.),vec2(1.));
            float nd=texture2D(sceneDepth,uv).r;
            if(nd>depth+.00015){
              vec4 nv=inverseProjection*vec4(uv*2.-1.,nd*2.-1.,1.);nv/=nv.w;
              vec3 nw=(cameraWorld*nv).xyz;float below=smoothstep(4.5,22.,abs(nw.y-focusPoint.y));
              if(length(nw.xz)>15.||below>.2){edgeColor+=gradeBackground(texture2D(sceneColor,uv).rgb,below)*.2;edgeWeight+=.2;}
            }
          }
          color=(color+edgeColor)/(1.+edgeWeight);
        }
        // A restrained frame leaves the playable centre unobscured.
        vec2 q=screenUV*2.-1.;float edge=smoothstep(.45,1.35,length(q*vec2(.85,1.)));color*=1.-edge*.16*(1.-arenaPixel);
        gl_FragColor=vec4(color,1.);
        gl_FragDepth=depth;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.scene=new THREE.Scene();this.camera=new THREE.Camera();
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.scene.add(this.quad);
    this.antialias=new THREE.ShaderMaterial({uniforms:{...THREE.UniformsUtils.clone(FXAAShader.uniforms),solidDepth:{value:null},sunsetLUT:{value:createSunsetLUT()},sunsetLUTStrength:{value:SUNSET_LUT_STYLE.strength}},vertexShader:FXAAShader.vertexShader,fragmentShader:SUNSET_LUT_GLSL+'\nuniform sampler2D solidDepth;\n'+FXAAShader.fragmentShader.replace('gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );',`gl_FragColor = ApplyFXAA( tDiffuse, resolution.xy, vUv );
      gl_FragDepth=texture2D(solidDepth,vUv).r;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb=applySunsetLUT(gl_FragColor.rgb);`),depthTest:true,depthWrite:true,depthFunc:THREE.AlwaysDepth});
  }
  render(renderer,scene,camera,focus,daylight,depthTexture,fallDarkness=0,arena=null){
    renderer.getDrawingBufferSize(this.size);
    if(this.target.width!==this.size.x||this.target.height!==this.size.y){this.target.setSize(this.size.x,this.size.y);this.graded.setSize(this.size.x,this.size.y);}
    const previous=renderer.getRenderTarget(),previousAutoClear=renderer.autoClear,previousLayers=camera.layers.mask,previousBackground=scene.background,u=this.material.uniforms;
    u.sceneDepth.value=depthTexture;
    this.antialias.uniforms.tDiffuse.value=this.graded.texture;this.antialias.uniforms.solidDepth.value=depthTexture;this.antialias.uniforms.resolution.value.set(1/this.size.x,1/this.size.y);
    if(!this.lightsReady){scene.traverse(object=>{if(object.isLight)object.layers.enable(2);});this.lightsReady=true;}
    camera.updateMatrixWorld();u.resolution.value.copy(this.size);u.inverseProjection.value.copy(camera.projectionMatrixInverse);u.cameraWorld.value.copy(camera.matrixWorld);u.focusPoint.value.copy(focus);u.daylight.value=daylight;u.arenaMode.value=arena?1:0;u.arenaFloorY.value=arena?.y??0;u.arenaRadius.value=arena?.radius??0;
    try{
      camera.layers.disable(2);renderer.setRenderTarget(this.target);renderer.clear();renderer.render(scene,camera);
      this.quad.material=this.material;renderer.setRenderTarget(this.graded);renderer.render(this.scene,this.camera);
      this.quad.material=this.antialias;renderer.setRenderTarget(previous);renderer.render(this.scene,this.camera);
      // Copy scene depth with the composite, then draw paper in its own colour
      // space after atmospheric grading, still occluded by solid architecture.
      renderer.autoClear=false;scene.background=null;camera.layers.set(2);renderer.render(scene,camera);
      // Apply the fall fade after every scene layer, including the ungraded
      // parchment/catcher pass. Background blur cannot wash it out.
      if(fallDarkness>0){
        this.fallFade??=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{strength:{value:0}},vertexShader:this.material.vertexShader,fragmentShader:'uniform float strength;void main(){gl_FragColor=vec4(.003,.005,.012,strength);}'});
        this.fallFade.uniforms.strength.value=fallDarkness;this.quad.material=this.fallFade;renderer.render(this.scene,this.camera);
      }
    }
    finally{this.quad.material=this.material;scene.background=previousBackground;camera.layers.mask=previousLayers;renderer.autoClear=previousAutoClear;renderer.setRenderTarget(previous);}
  }
}
