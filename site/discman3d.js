// Le Discman en 3D, rendu avec three.js (site/vendor/, licence MIT).
// Il imite le dessin SVG #discman : app.js change les classes et la pochette du SVG,
// et ce fichier recopie ces changements sur le modèle 3D.
// Si la 3D n'est pas disponible (vieux navigateur, pas de WebGL), le SVG reste affiché.
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const box = document.getElementById("discman-box");
const svg = document.getElementById("discman");
const svgCover = document.getElementById("cd-cover");
const canvas = document.getElementById("discman-3d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  renderer = null; // pas de WebGL : on garde le dessin SVG
}

if (renderer) start();

function start() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------- La scène, la caméra, la lumière ----------
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // reflets « studio »

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 300);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-6, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.radius = 6;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xdfefff, 0.15));

  // Le sol : invisible, il ne garde que l'ombre
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.22 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- Les matériaux ----------
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0xaeb5bd, metalness: 0.95, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2,
  });
  const metalDark = new THREE.MeshPhysicalMaterial({ color: 0x858c94, metalness: 0.95, roughness: 0.36 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.5, roughness: 0.3 });
  const well = new THREE.MeshStandardMaterial({ color: 0x14325a, metalness: 0.3, roughness: 0.45 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0b1a2e, roughness: 0.6 });
  const screen = new THREE.MeshStandardMaterial({ color: 0xaab8a3, roughness: 0.5, emissive: 0x000000 });
  const discMat = new THREE.MeshPhysicalMaterial({
    color: 0xe3e8ee, metalness: 1, roughness: 0.12,
    iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [120, 700],
  });
  const labelMat = new THREE.MeshStandardMaterial({ color: 0x2a5fd0, roughness: 0.45 });

  const model = new THREE.Group();
  scene.add(model);

  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  // Forme « carré arrondi » (superellipse), comme le contour d'un Discman vu de dessus
  function roundedShape(a, b, n, steps = 160) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const x = a * Math.sign(c) * Math.abs(c) ** (2 / n);
      const y = b * Math.sign(s) * Math.abs(s) ** (2 / n);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    return shape;
  }

  // ---------- Le corps ----------
  const bodyGeo = new THREE.ExtrudeGeometry(roundedShape(6.8, 6.4, 2.6), {
    depth: 1.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 6, curveSegments: 160,
  });
  bodyGeo.rotateX(-Math.PI / 2); // couché à plat : le dessus est vers le haut
  const body = mesh(bodyGeo, metal, 0, 0.25, 0);
  model.add(body);
  const TOP = 2.0; // hauteur du dessus du corps

  // Le creux et son rebord
  model.add(mesh(new THREE.CylinderGeometry(6.0, 6.0, 0.04, 128), well, 0, TOP + 0.01, 0));
  const rim = mesh(new THREE.TorusGeometry(6.05, 0.11, 16, 160), metalDark, 0, TOP + 0.02, 0);
  rim.rotation.x = Math.PI / 2;
  model.add(rim);
  model.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 32), metal, 0, TOP + 0.15, 0)); // l'axe

  // ---------- Le CD ----------
  const cd = new THREE.Group();
  const CD_Y = TOP + 0.12;
  cd.position.y = CD_Y;
  model.add(cd);
  cd.add(mesh(new THREE.CylinderGeometry(5.8, 5.8, 0.06, 160), discMat));
  const label = mesh(new THREE.RingGeometry(1.4, 5.55, 160, 1), labelMat, 0, 0.035, 0);
  label.rotation.x = -Math.PI / 2;
  cd.add(label);
  cd.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.07, 64), plastic));
  cd.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.09, 32), black));

  // ---------- Le couvercle ouvert, avec ses nervures ----------
  const hinge = new THREE.Group();
  hinge.position.set(0, TOP + 0.05, -6.3);
  hinge.rotation.x = -THREE.MathUtils.degToRad(104);
  model.add(hinge);

  const lidGeo = new THREE.ExtrudeGeometry(roundedShape(6.5, 6.3, 2.2), {
    depth: 0.35, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.2, bevelSegments: 5, curveSegments: 160,
  });
  lidGeo.rotateX(-Math.PI / 2);
  const lid = new THREE.Group();
  lid.position.z = 6.3; // le centre du couvercle, à 6,3 de la charnière
  hinge.add(lid);
  lid.add(mesh(lidGeo, metal, 0, 0.15, 0));

  // Les nervures sur la face intérieure (celle qu'on voit quand il est ouvert)
  for (const r of [1.4, 2.8, 4.2, 5.5]) {
    const ring = mesh(new THREE.TorusGeometry(r, 0.07, 10, 120), metalDark, 0, -0.03, 0);
    ring.rotation.x = Math.PI / 2;
    lid.add(ring);
  }
  for (let i = 0; i < 4; i++) {
    const rib = mesh(new THREE.BoxGeometry(11.2, 0.1, 0.12), metalDark, 0, -0.03, 0);
    rib.rotation.y = (i * Math.PI) / 4;
    lid.add(rib);
  }
  lid.add(mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 48), plastic, 0, -0.04, 0));

  // Les charnières
  for (const x of [-2.2, 2.2]) {
    const h = mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 24), metalDark, x, TOP + 0.05, -6.35);
    h.rotation.z = Math.PI / 2;
    model.add(h);
  }

  // ---------- Les boutons et l'écran ----------
  for (const [x, z] of [[-5.6, 3.9], [-4.9, 4.7], [-3.9, 5.4]]) {
    model.add(mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.16, 32), plastic, x, TOP + 0.06, z));
  }
  const FRONT = 6.66;
  const lcd = mesh(new THREE.BoxGeometry(2.8, 0.55, 0.06), screen, 0, 1.05, FRONT);
  model.add(lcd);
  for (const x of [2.4, 3.6]) {
    const key = mesh(new THREE.CapsuleGeometry(0.18, 0.6, 6, 16), plastic, x, 1.05, FRONT - 0.1);
    key.rotation.z = Math.PI / 2;
    model.add(key);
  }
  const round = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32), plastic, -2.4, 1.05, FRONT - 0.02);
  round.rotation.x = Math.PI / 2;
  model.add(round);
  const jack = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 20), black, 6.98, 1.0, 1.2);
  jack.rotation.z = Math.PI / 2;
  model.add(jack);

  // ---------- La pochette imprimée sur le CD ----------
  const loader = new THREE.TextureLoader();
  let coverUrl = null;
  function updateCover() {
    const url = svgCover.getAttribute("href");
    if (url === coverUrl) return;
    coverUrl = url;
    if (!url) {
      labelMat.map = null;
      labelMat.color.set(0x2a5fd0);
      labelMat.needsUpdate = true;
      return;
    }
    loader.load(url, (texture) => {
      if (url !== coverUrl) return; // une autre pochette est arrivée entre-temps
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      labelMat.map = texture;
      labelMat.color.set(0xffffff);
      labelMat.needsUpdate = true;
    });
  }

  // ---------- On suit l'état du SVG, que app.js met à jour ----------
  let playing = false;
  let swapping = false;
  function readState() {
    playing = svg.classList.contains("is-playing");
    swapping = svg.classList.contains("is-swapping");
    screen.emissive.set(playing ? 0x3f8f35 : 0x000000);
    updateCover();
  }
  new MutationObserver(readState).observe(svg, { attributes: true, subtree: true, attributeFilter: ["class", "href"] });
  readState();

  // ---------- Cadrage : la caméra recule juste assez pour voir tout le modèle ----------
  const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
  sphere.center.y -= 0.8; // on vise un peu plus bas : le modèle remonte et l'avant n'est pas coupé
  const viewDirection = new THREE.Vector3(-0.34, 0.5, 0.8).normalize(); // de devant, à gauche, en hauteur

  function frame() {
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance = (sphere.radius * 0.8) / Math.sin(Math.min(vertical, horizontal) / 2);
    camera.position.copy(sphere.center).addScaledVector(viewDirection, distance);
    camera.lookAt(sphere.center);
  }

  // ---------- Taille ----------
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    frame();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // ---------- Animation ----------
  const clock = new THREE.Clock();
  let lift = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;

    if (playing) cd.rotation.y -= dt * 2.6;                      // le CD tourne
    lift += ((swapping ? 1 : 0) - lift) * Math.min(1, dt * 10);  // le CD sort / revient
    cd.position.y = CD_Y + lift * 5;
    cd.scale.setScalar(1 - lift * 0.25);
    if (!reduceMotion) model.rotation.y = Math.sin(t * 0.3) * 0.1; // léger balancement

    renderer.render(scene, camera);
  });

  box.classList.add("is-3d"); // tout est prêt : on cache le dessin SVG
}
