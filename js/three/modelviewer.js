// Mini Three.js viewer for the model showcase inside the Blender window.


import * as THREE from "three";
import { GLTFLoader }      from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls }   from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

import { EffectComposer }  from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass }      from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass }      from "three/addons/postprocessing/OutputPass.js";

export function createModelViewer(canvas, gizmoContainer = null) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  renderer.autoClear = true;

  const scene = new THREE.Scene();


  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  camera.position.set(3.5, 2.2, 3.5);
  camera.lookAt(0, 0.5, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1;
  controls.maxDistance = 8;

  const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc0d0ff, 0.2);
  fill.position.set(-3, 2, -3);
  scene.add(fill);


  // Blender 3D Viewport floor 
 
  const gridGroup = new THREE.Group();
  scene.add(gridGroup);

  const minorGrid = new THREE.GridHelper(40, 400, 0x4a4a4a, 0x4a4a4a);
  minorGrid.material.transparent = true;
  minorGrid.material.opacity = 0.22;
  gridGroup.add(minorGrid);

  const majorGrid = new THREE.GridHelper(40, 40, 0x5a5a5a, 0x5a5a5a);
  majorGrid.material.transparent = true;
  majorGrid.material.opacity = 0.4;
  gridGroup.add(majorGrid);

  const xLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-20, 0.001, 0), new THREE.Vector3(20, 0.001, 0)
    ]),
    new THREE.LineBasicMaterial({ color: 0xc04848, transparent: true, opacity: 0.85 })
  );
  gridGroup.add(xLine);

  const yLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.001, -20), new THREE.Vector3(0, 0.001, 20)
    ]),
    new THREE.LineBasicMaterial({ color: 0x4a8c2a, transparent: true, opacity: 0.85 })
  );
  gridGroup.add(yLine);

  // Showcase backdrop — soft radial gradient sphere, off by default
  const backdropGeom = new THREE.SphereGeometry(20, 32, 16);
  const backdropMat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    color: 0x2a2a2a,
  });
  const backdrop = new THREE.Mesh(backdropGeom, backdropMat);
  backdrop.visible = false;
  scene.add(backdrop);




  const modelRoot = new THREE.Group();
  scene.add(modelRoot);


  const originalMaterials = new Map();
  const solidMaterials    = new Map();

  const edgeOverlays      = new Map();


  let exactWire = null;

  const loader = new GLTFLoader();

  function clearModel() {
    while (modelRoot.children.length) {
      const child = modelRoot.children[0];
      modelRoot.remove(child);
    }
    originalMaterials.clear();

    for (const mat of solidMaterials.values()) mat.dispose();
    for (const ln of edgeOverlays.values()) ln.geometry.dispose();
    edgeOverlays.clear();
    solidMaterials.clear();
    if (exactWire) { exactWire.geometry.dispose(); exactWire = null; }
  }

  function loadModel(url, onStats) {
    clearModel();
    loader.load(
      url,
      (gltf) => {
        const obj = gltf.scene;

        const measureVisibleBox = (root) => {
          root.updateMatrixWorld(true);
          const out = new THREE.Box3();
          root.traverse((n) => {
            if (!n.isMesh || !n.visible) return;
            if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
            const local = n.geometry.boundingBox;
            if (!local) return;
            out.union(local.clone().applyMatrix4(n.matrixWorld));
          });
          return out;
        };

        const box = measureVisibleBox(obj);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 1.5;
        const scale = targetSize / maxDim;
        obj.scale.setScalar(scale);

        const scaledBox = measureVisibleBox(obj);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        const scaledMin = scaledBox.min;
        obj.position.x -= scaledCenter.x;
        obj.position.z -= scaledCenter.z;
        obj.position.y -= scaledMin.y;

        obj.traverse((node) => {
          if (!node.isMesh || !node.material) return;

 
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m) => { m.side = THREE.DoubleSide; });

          originalMaterials.set(node.uuid, node.material);

          const orig = node.material;
          const solid = new THREE.MeshStandardMaterial({
            color: orig.color ? orig.color.clone() : new THREE.Color(0xc8c8c8),
            metalness: 0,
            roughness: 0.7,
            envMapIntensity: 0,   // ignore scene.environment — no IBL contribution
            side: THREE.DoubleSide,
          });

          if (node.isSkinnedMesh) solid.skinning = true;
          solidMaterials.set(node.uuid, solid);


          const edges = new THREE.EdgesGeometry(node.geometry, 1);
          const line  = new THREE.LineSegments(edges, wireLineMat);
          line.visible = false;
          line.renderOrder = 2;
          node.add(line);
          edgeOverlays.set(node.uuid, line);
        });

        // Camera framing 
        const fov = camera.fov * (Math.PI / 180);
        const distance = (targetSize / 2) / Math.tan(fov / 2) * 1.6;
        camera.position.set(distance * 0.85, distance * 0.6, distance * 0.85);
        controls.target.set(0, targetSize * 0.4, 0);
        controls.update();

        modelRoot.add(obj);

        applyShadingMode();

        // Exact Blender wireframe.
        const wireUrl = url.replace(/\.glb(\?.*)?$/i, ".wire.json");
        fetch(wireUrl)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data || !data.positions || obj.parent !== modelRoot) return;
            const g = new THREE.BufferGeometry();
            g.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
            const w = new THREE.LineSegments(g, wireLineMat);
            w.scale.copy(obj.scale);
            w.position.copy(obj.position);
            w.renderOrder = 2;
            w.visible = (shadingMode === "wireframe");
            exactWire = w;
            modelRoot.add(w);
            for (const ln of edgeOverlays.values()) ln.visible = false;
          })
          .catch(() => {});

        //  geometry stats
        if (typeof onStats === "function") {
          let verts = 0, faces = 0;
          const mats = new Set();
          obj.traverse((n) => {
            if (!n.isMesh || !n.geometry) return;
            const pos = n.geometry.attributes?.position?.count || 0;
            verts += pos;
            faces += n.geometry.index ? n.geometry.index.count / 3 : pos / 3;
            if (n.material) mats.add(n.material.uuid);
          });
          onStats({
            vertices:  verts,
            faces:     Math.round(faces),
            materials: mats.size,
          });
        }

        console.log(`[viewer] loaded ${url} (scale ${scale.toFixed(3)})`);
      },
      undefined,
      (err) => console.error(`[viewer] failed to load ${url}:`, err)
    );
  }


  // Shading modes

  let shadingMode = "solid"; 

  // Wireframe material 
  // Wireframe mode
  
  const wireGhostMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  const wireLineMat = new THREE.LineBasicMaterial({ color: 0x8fb5ff });

  function applyShadingMode() {
    modelRoot.traverse((node) => {
      if (!node.isMesh) return;

      if (shadingMode === "wireframe") {
        node.material = wireGhostMat;
      } else if (shadingMode === "solid") {

        const solid = solidMaterials.get(node.uuid);
        if (solid) node.material = solid;
      } else {

        const original = originalMaterials.get(node.uuid);
        if (original) node.material = original;
      }
    });


    const wire = shadingMode === "wireframe";
    if (exactWire) {
      exactWire.visible = wire;
      for (const ln of edgeOverlays.values()) ln.visible = false;
    } else {
      for (const ln of edgeOverlays.values()) ln.visible = wire;
    }


    if (shadingMode === "wireframe") {
      ambient.intensity = 0.6;
      scene.environmentIntensity = 1.0;
    } else if (shadingMode === "solid") {
      ambient.intensity = 0.45;
      scene.environmentIntensity = 1.0;
    } else {
      ambient.intensity = 0.15;
      scene.environmentIntensity = 1.0;
    }
  }

  function setShadingMode(mode) {
    if (!["wireframe", "solid", "material", "rendered"].includes(mode)) return;
    shadingMode = mode;
    applyShadingMode();
  }


  // Mode: Blender vs Showcase 
  let viewMode = "blender";

  function setMode(mode) {
    if (mode !== "blender" && mode !== "showcase") return;
    viewMode = mode;
    if (mode === "blender") {
      gridGroup.visible = true;
      backdrop.visible = false;
      autoRotate = false;
    } else {
      gridGroup.visible = false;
      backdrop.visible = true;
      autoRotate = true;
    }
  }

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.9, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  //  XYZ navigation gizmo (Blender-style)

  const GIZMO_PX = 96;         
  const GIZMO_MARGIN = 6;       

  const gizmoScene = new THREE.Scene();
  // Orthographic camera at distance ~3 looking at origin
  const gizmoCam = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0, 4);
  gizmoCam.position.set(0, 0, 2);
  gizmoCam.lookAt(0, 0, 0);

  const gizmoRoot = new THREE.Group();
  gizmoScene.add(gizmoRoot);


  const AXIS_COLOURS = {
    x: 0xfc4747,   // red
    y: 0x8ec73b,   // green
    z: 0x3f9bff,   // blue
  };


  function makeAxisLine(axis, colour) {
    const points = [new THREE.Vector3(0, 0, 0)];
    const end = new THREE.Vector3();
    end[axis] = 1;
    points.push(end);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.85 });
    return new THREE.Line(geo, mat);
  }
  gizmoRoot.add(makeAxisLine("x", AXIS_COLOURS.x));
  gizmoRoot.add(makeAxisLine("y", AXIS_COLOURS.y));
  gizmoRoot.add(makeAxisLine("z", AXIS_COLOURS.z));


  const gizmoBalls = [];

  function makeLabelTexture(text, bg = "#fff") {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#202020";
    ctx.font = "bold 38px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 32, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function addBall({ axis, sign, colour, label, dir }) {
    const pos = new THREE.Vector3();
    pos[axis] = sign;

    if (sign > 0) {
      const tex = makeLabelTexture(label, "#" + colour.toString(16).padStart(6, "0"));
      const mat = new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.42, 0.42, 1);
      sprite.position.copy(pos);
      sprite.userData = { dir, isGizmoBall: true };
      gizmoRoot.add(sprite);
      gizmoBalls.push(sprite);
    } else {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d");
      ctx.strokeStyle = "#" + colour.toString(16).padStart(6, "0");
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(32, 32, 26, 0, Math.PI * 2);
      ctx.stroke();
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, depthTest: false, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.32, 0.32, 1);
      sprite.position.copy(pos);
      sprite.userData = { dir, isGizmoBall: true };
      gizmoRoot.add(sprite);
      gizmoBalls.push(sprite);
    }
  }

  addBall({ axis: "x", sign: +1, colour: AXIS_COLOURS.x, label: "X", dir: new THREE.Vector3( 1, 0, 0) });
  addBall({ axis: "x", sign: -1, colour: AXIS_COLOURS.x, label: "",  dir: new THREE.Vector3(-1, 0, 0) });
  addBall({ axis: "y", sign: +1, colour: AXIS_COLOURS.y, label: "Y", dir: new THREE.Vector3(0,  1, 0) });
  addBall({ axis: "y", sign: -1, colour: AXIS_COLOURS.y, label: "",  dir: new THREE.Vector3(0, -1, 0) });
  addBall({ axis: "z", sign: +1, colour: AXIS_COLOURS.z, label: "Z", dir: new THREE.Vector3(0, 0,  1) });
  addBall({ axis: "z", sign: -1, colour: AXIS_COLOURS.z, label: "",  dir: new THREE.Vector3(0, 0, -1) });

  
  let camTween = null;  
  function snapCameraTo(axisDir) {
    const distance = camera.position.distanceTo(controls.target);
    const endPos = axisDir.clone().normalize().multiplyScalar(distance).add(controls.target);
    camTween = {
      startPos: camera.position.clone(),
      endPos,
      t: 0,
      duration: 0.4, // seconds
    };
  }

  function updateCamTween(delta) {
    if (!camTween) return;
    camTween.t = Math.min(1, camTween.t + delta / camTween.duration);
    // Ease-in-out cubic
    const k = camTween.t < 0.5
      ? 4 * camTween.t * camTween.t * camTween.t
      : 1 - Math.pow(-2 * camTween.t + 2, 3) / 2;
    camera.position.lerpVectors(camTween.startPos, camTween.endPos, k);
    camera.lookAt(controls.target);
    if (camTween.t >= 1) camTween = null;
  }

  //  Gizmo click handling
  if (gizmoContainer) {
    const raycaster = new THREE.Raycaster();
    raycaster.params.Sprite = { threshold: 0.05 };

    gizmoContainer.addEventListener("pointerdown", (ev) => {
      const rect = gizmoContainer.getBoundingClientRect();
      const nx = ((ev.clientX - rect.left) / rect.width)  *  2 - 1;
      const ny = ((ev.clientY - rect.top)  / rect.height) * -2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), gizmoCam);
      const hits = raycaster.intersectObjects(gizmoBalls, false);
      if (hits.length > 0) {
        snapCameraTo(hits[0].object.userData.dir);
      }
    });
  }


  // Resize
  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    let w = parent.clientWidth;
    let h = parent.clientHeight;
    if (w <= 0 || h <= 0) return;
    if (w > 4096) w = 4096;
    if (h > 4096) h = 4096;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  // Render loop
  let autoRotate = false;
  let stopped = false;
  const clock = new THREE.Clock();
  const _gizmoPrevViewport = new THREE.Vector4();

  function tick() {
    if (stopped) return;
    const delta = clock.getDelta();

    if (autoRotate) modelRoot.rotation.y += 0.005;
    updateCamTween(delta);
    controls.update();

    if (shadingMode === "rendered") {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    //   gizmo render 

    if (gizmoContainer && viewMode === "blender") {
      gizmoRoot.quaternion.copy(camera.quaternion).invert();

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const dpr = renderer.getPixelRatio();
      const px = GIZMO_PX;
      const m = GIZMO_MARGIN;


      const vx = (cw - px - m) * dpr;
      const vy = (ch - px - m) * dpr;
      const vw = px * dpr;
      const vh = px * dpr;

      renderer.getViewport(_gizmoPrevViewport);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.setViewport(vx, vy, vw, vh);
      renderer.render(gizmoScene, gizmoCam);
      renderer.setViewport(
        _gizmoPrevViewport.x, _gizmoPrevViewport.y,
        _gizmoPrevViewport.z, _gizmoPrevViewport.w
      );
      renderer.autoClear = true;
    }

    requestAnimationFrame(tick);
  }
  tick();

  function dispose() {
    stopped = true;
    ro.disconnect();
    pmrem.dispose();
    composer.dispose && composer.dispose();
    renderer.dispose();
  }

  return {
    loadModel,
    clearModel,
    setShadingMode,
    setMode,
    setAutoRotate: (v) => { autoRotate = !!v; },
    dispose,
  };
}