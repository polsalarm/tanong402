import * as THREE from 'three';

const silver = new THREE.MeshPhysicalMaterial({ color: 0xaab5c5, metalness: 0.08, roughness: 0.46, clearcoat: 0.28, clearcoatRoughness: 0.36, sheen: 0.35, sheenColor: 0xe8edf6 });
const faceMat = new THREE.MeshPhysicalMaterial({ color: 0xd8e0ec, metalness: 0.025, roughness: 0.54, clearcoat: 0.12 });
const bellyMat = new THREE.MeshPhysicalMaterial({ color: 0x9eabbd, metalness: 0.05, roughness: 0.61, sheen: 0.5, sheenColor: 0xdfe6f1 });
const blue = new THREE.MeshPhysicalMaterial({ color: 0x8fb3ff, metalness: 0.14, roughness: 0.26, clearcoat: 0.55, clearcoatRoughness: 0.18 });
const sclera = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.09 });
const irisMat = new THREE.MeshPhysicalMaterial({ color: 0x7199ef, metalness: 0.12, roughness: 0.24, clearcoat: 0.6 });
const pupilMat = new THREE.MeshPhysicalMaterial({ color: 0x141c2b, roughness: 0.11, clearcoat: 1, clearcoatRoughness: 0.06 });
const beakMat = new THREE.MeshPhysicalMaterial({ color: 0xb8c8e4, roughness: 0.3, clearcoat: 0.35 });
const darkSilver = new THREE.MeshPhysicalMaterial({ color: 0xaeb8c8, roughness: 0.55, metalness: 0.08 });

function ball(parent, material, pos, scale, seg=28) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.floor(seg * .7)), material);
  mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function roundedBox(parent, material, pos, scale, radius=.1) {
  const shape = new THREE.Shape(); const w=scale[0], h=scale[1], r=Math.min(radius,w/2,h/2);
  shape.moveTo(-w/2+r,-h/2); shape.lineTo(w/2-r,-h/2); shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r); shape.lineTo(w/2,h/2-r); shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2); shape.lineTo(-w/2+r,h/2); shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); shape.lineTo(-w/2,-h/2+r); shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geo = new THREE.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:10}); geo.center();
  const m=new THREE.Mesh(geo,material); m.position.set(...pos); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
function tube(parent, points, material, radius=.035) {
  const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 12, false), material); mesh.castShadow=true; parent.add(mesh); return mesh;
}

export function createKuwago(scene) {
  const root=new THREE.Group(); root.name='Kuwago'; scene.add(root);
  const torso=new THREE.Group(); torso.name='Body'; root.add(torso);
  // A softly pear-shaped, continuous-feeling body built from a high-resolution sphere.
  const bodyGeo=new THREE.SphereGeometry(1,56,40); const p=bodyGeo.attributes.position;
  for(let i=0;i<p.count;i++){ const y=p.getY(i); const k=1-.14*y; p.setX(i,p.getX(i)*k); p.setZ(i,p.getZ(i)*k); }
  bodyGeo.computeVertexNormals(); const body=new THREE.Mesh(bodyGeo,silver); body.name='Pearl silver body'; body.position.set(0,.04,0); body.scale.set(.73,.94,.62); body.castShadow=true; body.receiveShadow=true; torso.add(body);
  ball(torso, bellyMat,[0,-.29,.505],[.5,.49,.13]);

  const headPivot=new THREE.Group(); headPivot.name='Head pivot'; headPivot.position.set(0,.53,.06); torso.add(headPivot);
  ball(headPivot,silver,[0,.15,0],[.76,.71,.61],40);
  // Face disc, eyes and all facial elements sit just forward of the head.
  ball(headPivot,faceMat,[0,.12,.525],[.61,.51,.115],40);
  const eyes=[],gazes=[];
  for(const side of [-1,1]){
    const eyeGroup=new THREE.Group(); eyeGroup.position.set(side*.245,.18,.638); eyeGroup.scale.x=.97; headPivot.add(eyeGroup); eyes.push(eyeGroup);
    ball(eyeGroup,sclera,[0,0,0],[.18,.216,.092],36);
    const gaze=new THREE.Group(); gaze.name='Iris gaze pivot'; eyeGroup.add(gaze); gazes.push(gaze);
    ball(gaze,irisMat,[.018,-.005,.074],[.119,.142,.05],32);
    ball(gaze,pupilMat,[.024,.003,.112],[.079,.103,.035],32);
    ball(gaze,new THREE.MeshBasicMaterial({color:0xffffff}),[-.012,.055,.145],[.032,.038,.015],24);
    ball(gaze,new THREE.MeshBasicMaterial({color:0xdce8ff}),[.069,-.045,.139],[.015,.018,.009],20);
  }
  // Soft brows keep the gaze friendly and readable at small sizes.
  for(const side of [-1,1]) tube(headPivot,[[side*.13,.44,.64],[side*.25,.47,.65],[side*.36,.43,.63]],silver,.025);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.11,.17,3),beakMat); beak.name='Beak'; beak.position.set(0,-.105,.78); beak.rotation.x=Math.PI/2; beak.scale.set(.78,1,.72); beak.castShadow=true; headPivot.add(beak);
  // Gentle smiling crease, rendered as a shallow curve.
  tube(headPivot,[[-.13,-.25,.651],[-.06,-.28,.678],[0,-.29,.684],[.06,-.28,.678],[.13,-.25,.651]],darkSilver,.012);

  // Ear tufts: short pill-like feather shapes, not sharp horns.
  for(const side of [-1,1]){ const tuft=ball(headPivot,silver,[side*.53,.64,.015],[.17,.29,.16],40); tuft.rotation.z=side*.48; }
  // Distinct question-mark curl with a separate dot.
  tube(headPivot,[[-.08,1.05,.01],[.05,1.12,.02],[.19,1.08,.02],[.23,.98,.02],[.18,.9,.02],[.08,.86,.02],[.015,.77,.02]],blue,.052);
  ball(headPivot,blue,[.015,.65,.03],[.06,.06,.06],32);

  const wings=[];
  for(const side of [-1,1]){
    const pivot=new THREE.Group(); pivot.name=side<0?'Left shoulder pivot':'Right shoulder pivot'; pivot.position.set(side*.62,.02,.0); torso.add(pivot); wings.push(pivot);
    const wing=ball(pivot,silver,[side*.20,-.06,.02],[.25,.43,.22],48); wing.rotation.z=side*.34; wing.name=side<0?'Left wing':'Right wing';
    // Three quiet feather tips on the outer lower edge.
    for(let i=0;i<3;i++) ball(pivot,faceMat,[side*(.25+i*.035),-.26-i*.02,.2],[.055,.12,.035],24).rotation.z=side*.22;
  }
  const legs=[];
  for(const side of [-1,1]){
    const hip=new THREE.Group(); hip.name=side<0?'Left hip pivot':'Right hip pivot'; hip.position.set(side*.27,-.73,.02); torso.add(hip); legs.push(hip);
    ball(hip,darkSilver,[0,-.09,.04],[.075,.19,.075],28);
    const foot=ball(hip,faceMat,[0,-.23,.17],[.16,.085,.21],32); foot.name=side<0?'Left foot':'Right foot';
    for(let i=-1;i<=1;i++) ball(hip,faceMat,[i*.075,-.25,.31],[.07,.045,.115],24);
  }
  return {root,torso,headPivot,wings,legs,eyes,gazes};
}

export function addProp(scene, kind) {
  const group=new THREE.Group(); group.name=kind; scene.add(group);
  const gold=new THREE.MeshPhysicalMaterial({color:0xdce5f5,metalness:.65,roughness:.24,clearcoat:.7});
  if(kind==='ticket'){
    roundedBox(group,faceMat,[0,0,0],[.62,.39,.08],.08);
    const stripe=roundedBox(group,blue,[0,0,.07],[.08,.3,.04],.025); stripe.position.x=-.19;
    for(let i=0;i<3;i++) roundedBox(group,darkSilver,[.055,.09-i*.09,.065],[.23,.025,.025],.012);
  } else if(kind==='book'){
    roundedBox(group,blue,[-.19,0,0],[.39,.33,.075],.045); roundedBox(group,blue,[.19,0,0],[.39,.33,.075],.045);
    roundedBox(group,faceMat,[-.19,0,.048],[.34,.28,.018],.025); roundedBox(group,faceMat,[.19,0,.048],[.34,.28,.018],.025);
    tube(group,[[0,-.15,.07],[0,0,.08],[0,.15,.07]],darkSilver,.012);
    for(let s of [-1,1]) for(let i=0;i<3;i++) tube(group,[[s*.07,.07-i*.07,.069],[s*.17,.07-i*.07,.069],[s*.27,.07-i*.07,.069]],darkSilver,.006);
  } else if(kind==='coin'){
    const coin=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.07,64),gold); coin.rotation.x=Math.PI/2; coin.castShadow=true; group.add(coin);
    ball(group,blue,[0,0,.046],[.105,.105,.012],32);
    tube(group,[[0,-.065,.06],[0,.07,.06]],faceMat,.012);
  } else if(kind==='moon'){
    const moon=ball(group,blue,[0,0,0],[.21,.21,.065],48); const cut=ball(group,new THREE.MeshBasicMaterial({color:0x07090f}),[.10,.06,.06],[.17,.18,.07],40); cut.material.transparent=true; cut.material.opacity=0;
    // Crescent made from a curved blue tube so it stays clean and visible.
    tube(group,[[-.08,-.16,.03],[-.19,-.04,.03],[-.13,.12,.03],[0,.2,.03],[.14,.12,.03]],blue,.055); moon.visible=false;
  }
  return group;
}
