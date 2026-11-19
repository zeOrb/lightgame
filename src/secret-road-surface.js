import * as THREE from 'three';

// Render-only subdivision: support queries retain their original triangles.
export function subdivideRoadSurface(source,segments,indicesPerSegment,divisions=8){
  const attributes=Object.entries(source.attributes),values=Object.fromEntries(attributes.map(([name])=>[name,[]]));
  const index=source.index;
  const vertex=(a,b,c,u,v)=>{
    for(const [name,attribute] of attributes)for(let k=0;k<attribute.itemSize;k++){
      const data=attribute.array,stride=attribute.itemSize;
      values[name].push(data[a*stride+k]*(1-u-v)+data[b*stride+k]*u+data[c*stride+k]*v);
    }
  };
  for(let offset=0;offset<index.count;offset+=3){
    const a=index.getX(offset),b=index.getX(offset+1),c=index.getX(offset+2);
    const top=offset<segments*indicesPerSegment&&offset%indicesPerSegment<6;
    const n=top?divisions:1;
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
      vertex(a,b,c,i/n,j/n);vertex(a,b,c,(i+1)/n,j/n);vertex(a,b,c,i/n,(j+1)/n);
      if(j<n-i-1){vertex(a,b,c,(i+1)/n,j/n);vertex(a,b,c,(i+1)/n,(j+1)/n);vertex(a,b,c,i/n,(j+1)/n);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  for(const [name,attribute] of attributes)geometry.setAttribute(name,new THREE.Float32BufferAttribute(values[name],attribute.itemSize));
  geometry.normalizeNormals();geometry.computeBoundingSphere();geometry.boundingSphere.radius+=1.8;
  return {geometry,indicesPerSegment:indicesPerSegment+6*(divisions*divisions-1)};
}
