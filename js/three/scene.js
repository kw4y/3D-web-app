// Three.js scene module 
import * as THREE from "three";
import { GLTFLoader }     from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls }  from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass }     from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass }from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass }     from "three/addons/postprocessing/ShaderPass.js";

//  Camera lock 
const USE_LOCKED = true;
const LOCKED_CAMERA = {
  position: { x: 4.275, y: 0.185, z: -4.544 },
  target:   { x: -0.021, y: 0.312, z: -0.163 },
};

//  Sky 
const SKY_TOP    = "#f0f4e8";
const SKY_BOTTOM = "#fbf2d6";
const FOG_COLOR  = 0xf2efe0;


const GrainAndLiftShader = {
  uniforms: {
    tDiffuse:  { value: null },
    uTime:     { value: 0 },
    uGrain:    { value: 0.04 },
    uLift:     { value: 0.22 },
    uVignette: { value: 0.06 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform float uLift;
    uniform float uVignette;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      col.rgb = col.rgb * (1.0 - uLift) + uLift;
      vec2 d = vUv - 0.5;
      float vig = 1.0 - dot(d, d) * uVignette * 2.5;
      col.rgb *= vig;
      float n = rand(vUv * 1024.0 + uTime * 60.0) - 0.5;
      col.rgb += n * uGrain;
      gl_FragColor = col;
    }
  `,
};

// Wind shader patch, barely works sadly
function applyWindShader(mesh, sharedTimeRef) {
  const mat = mesh.material;
  if (!mat) return;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedTimeRef;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;"
      )
      .replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          "float windHeight = clamp(transformed.y, 0.0, 1.5);",
          "float windPhase  = uv.x * 6.283 + uv.y * 3.0;",
          "float gust    = sin(uTime * 1.2 + windPhase) * 0.05;",
          "float ripple  = sin(uTime * 4.5 + windPhase * 2.0) * 0.018;",
          "float sway    = (gust + ripple) * windHeight * windHeight;",
          "transformed.x += sway;",
          "transformed.z += sway * 0.4;",
        ].join("\n")
      );
  };
  mat.needsUpdate = true;
}

// Sky gradient 
function makeSkyTexture() {
  const c = document.createElement("canvas");
  c.width = 2; c.height = 512;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// Main entry
export function initScene() {
  const canvas = document.getElementById("scene-canvas");
  if (!canvas) {
    console.error("[scene] #scene-canvas not found");
    return;
  }

  //  Renderer 
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.7;

  //  Scene 
  const scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(FOG_COLOR, 6.0, 22.0);

  //  Camera 
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 2, 8);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enabled = !USE_LOCKED;

  //  Lights 
  scene.add(new THREE.HemisphereLight(0xfff8e0, 0xdde8b4, 1.8));
  // Sun positioned behind/above camera so the field is front-lit and the green reads
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4);
  sun.position.set(8, 6, -10);
  scene.add(sun);

  const windTime = { value: 0 };

  //  Asset load tracking 
  let pendingLoads = 2;
  let readyFired = false;
  function markLoaded(label) {
    pendingLoads -= 1;
    console.log(`[scene] asset ready: ${label} (${pendingLoads} remaining)`);
    if (pendingLoads <= 0 && !readyFired) {
      readyFired = true;
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          document.dispatchEvent(new CustomEvent("scene:ready"))
        )
      );
    }
  }

  //  Load GLB 
  const loader = new GLTFLoader();
  loader.load(
    "assets/Models/scene.glb",
    (gltf) => {
      scene.add(gltf.scene);

      const grassMatches = (n) => /plane[._]?241/i.test(n || "");
      const isPlaceholderCube = (n) => /^cube(\.|$)/i.test(n || "");
      let grassMesh = null;
      let largestMesh = null;
      let maxVerts = 0;
      gltf.scene.traverse((obj) => {
        if (!obj.isMesh) return;
        if (isPlaceholderCube(obj.name)) {
          obj.visible = false;
          console.log("[scene] hid placeholder cube:", obj.name);
          return;
        }
        if (grassMatches(obj.name)) grassMesh = obj;
        const verts = obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position
          ? obj.geometry.attributes.position.count : 0;
        if (verts > maxVerts) { maxVerts = verts; largestMesh = obj; }
      });
      const target = grassMesh || largestMesh;
      if (target) {
        applyWindShader(target, windTime);
        const matchType = grassMesh ? "name" : "vertex count fallback";
        console.log("[scene] wind applied to \"" + target.name + "\" (matched by " + matchType + ")");
      } else {
        console.warn("[scene] no mesh found to apply wind to");
      }

      if (USE_LOCKED) {
        camera.position.set(LOCKED_CAMERA.position.x, LOCKED_CAMERA.position.y, LOCKED_CAMERA.position.z);
        controls.target.set(LOCKED_CAMERA.target.x, LOCKED_CAMERA.target.y, LOCKED_CAMERA.target.z);
        controls.update();
      }

      markLoaded("scene.glb");
    },
    undefined,
    (err) => {
      console.error("[scene] failed to load scene.glb:", err);
      markLoaded("scene.glb (failed)");
    }
  );

  //  Load character.glb 

  let character = null;

  //  Head-tracking state 

  let headBone = null;
  let headRestRotation = null;
  const mouseNorm = { x: 0, y: 0 };
  const headLerp  = { x: 0, y: 0 };     
  const HEAD_MAX_PITCH = 0.12;           
  const HEAD_MAX_YAW   = 0.15;            
  const HEAD_LERP_SPEED = 0.06;           

  window.addEventListener("pointermove", (e) => {
    mouseNorm.x = (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNorm.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const characterLoader = new GLTFLoader();
  characterLoader.load(
    "assets/Models/character.glb",
    (gltf) => {
      character = gltf.scene;


      character.position.set(2.0, -1.0, -3.0);


      character.scale.setScalar(1.2);
      character.position.set(2.0, -1.0, -3.0);
        character.scale.setScalar(1.2);
      character.rotation.y += Math.PI / 1.5;

      const allBones = [];
      character.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
        if (obj.isBone) allBones.push(obj);
      });

      // Head-bone search.

      const deformBones = allBones.filter(
        (b) => !/^(MCH|WGT)/i.test(b.name || "")
      );
      const findBone = (predicate) =>
        deformBones.find((b) => predicate(b.name || ""));

      let chosen = findBone((n) => /^DEF[-_]?head$/i.test(n));
      if (!chosen) {
        const spines = deformBones
          .filter((b) => /^DEF[-_]?spine[._]?\d+$/i.test(b.name || ""))
          .sort((a, b) => {
            const an = parseInt((a.name.match(/(\d+)$/) || [])[1] || "0", 10);
            const bn = parseInt((b.name.match(/(\d+)$/) || [])[1] || "0", 10);
            return bn - an;
          });
        chosen = spines[0];
      }
      if (!chosen) chosen = findBone((n) => /^DEF.*head/i.test(n));
      if (!chosen) chosen = findBone((n) => /head/i.test(n));

      // Log nearby bones for debugging 
      const nearbyBones = allBones
        .map((b) => b.name)
        .filter((n) => /head|neck|spine/i.test(n));
      console.log("[scene] bones near head:", nearbyBones);

      if (chosen) {
        headBone = chosen;
        headRestRotation = headBone.rotation.clone();
        console.log("[scene] head tracking enabled on bone:", chosen.name);
      } else {
        console.warn("[scene] no head bone found — head tracking disabled.",
                     "all bones:", allBones.map((b) => b.name));
      }

      scene.add(character);
      console.log("[scene] character loaded at", character.position.toArray(),
                  "rotation.y =", character.rotation.y.toFixed(3));

      markLoaded("character.glb");
    },
    undefined,
    (err) => {
      console.error("[scene] failed to load character.glb:", err);
      markLoaded("character.glb (failed)");
    }
  );

  //  Press C to log camera state 
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "c") return;
    const p = camera.position, t = controls.target;
    console.log(JSON.stringify({
      position: { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) },
      target:   { x: +t.x.toFixed(3), y: +t.y.toFixed(3), z: +t.z.toFixed(3) },
    }, null, 2));
  });

  //  Press K to log character transform 
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "k") return;
    if (!character) { console.warn("[scene] character not loaded yet"); return; }
    const p = character.position, r = character.rotation;
    console.log(JSON.stringify({
      position: { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) },
      rotation: { y: +r.y.toFixed(3) },
    }, null, 2));
  });

  //  Post-processing 
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.25, 1.1, 0.7
  );
  composer.addPass(bloom);

  const grainPass = new ShaderPass(GrainAndLiftShader);
  composer.addPass(grainPass);

  //  Resize 
  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  });

  //  Render loop 
  const clock = new THREE.Clock();
  function tick() {
    controls.update();
    const t = clock.getElapsedTime();
    windTime.value = t;
    grainPass.uniforms.uTime.value = t;

    // Head-tracking
    if (headBone && headRestRotation) {
      const targetPitch = -mouseNorm.y * HEAD_MAX_PITCH;
      const targetYaw   =  mouseNorm.x * HEAD_MAX_YAW;
      headLerp.x += (targetPitch - headLerp.x) * HEAD_LERP_SPEED;
      headLerp.y += (targetYaw   - headLerp.y) * HEAD_LERP_SPEED;
      headBone.rotation.x = headRestRotation.x + headLerp.x;
      headBone.rotation.y = headRestRotation.y + headLerp.y;
    }

    composer.render();
    requestAnimationFrame(tick);
  }
  tick();
}