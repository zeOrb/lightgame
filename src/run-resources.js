// Hold old materials until their replacements acquire the same shader programs.
// Shared cached textures survive; only resources absent from the new world are freed.
export function runResources(root){
  const geometries=new Set(),materials=new Set(),textures=new Set(),instances=new Set();
  const texture=value=>{if(value?.isTexture&&!value.isRenderTargetTexture)textures.add(value);};
  root.traverse(object=>{
    if(object.isInstancedMesh||object.isBatchedMesh)instances.add(object);
    if(object.geometry)geometries.add(object.geometry);
    for(const material of [object.material].flat().filter(Boolean)){
      materials.add(material);for(const value of Object.values(material))texture(value);
      for(const uniform of Object.values(material.uniforms??{}))texture(uniform.value);
    }
  });
  return {geometries,materials,textures,instances};
}
export function releaseRunResources(previous,current){
  for(const key of ['instances','geometries','materials','textures'])for(const resource of previous[key]){
    if(!current[key].has(resource)&&!resource.userData?.persistentRunResource)resource.dispose();
  }
}
