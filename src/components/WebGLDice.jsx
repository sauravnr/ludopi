// src/components/WebGLDice.jsx
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
// use example RoundedBoxGeometry for chamfered dice edges
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { gsap } from "gsap";

// cache textures across component mounts
let cachedTextures = [];
const faceOrder = [3, 4, 2, 5, 1, 6];

function getDiceTextures(renderer) {
  if (cachedTextures.length === 0) {
    const DPR = window.devicePixelRatio > 1 ? "512" : "256";
    cachedTextures = faceOrder.map((n) => {
      // create a placeholder canvas that matches the final texture size
      const canvas = document.createElement("canvas");
      canvas.width = parseInt(DPR, 10);
      canvas.height = parseInt(DPR, 10);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        tex.image = img;
        tex.needsUpdate = true;
      };
      img.src = `/dice/dice-${n}-${DPR}.png`;
      return tex;
    });
  }
  const aniso = renderer.capabilities.getMaxAnisotropy();
  cachedTextures.forEach((t) => {
    t.anisotropy = aniso;
  });
  return cachedTextures;
}

export default function WebGLDice({
  onRoll,
  disabled,
  rollingNow,
  forcedFace,
  size = 128,
}) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const cubeRef = useRef(null);
  const spinRef = useRef({ x: 0, y: 0 });
  const rollingRef = useRef(rollingNow);
  const animatingRef = useRef(false);
  const frameRef = useRef(null);
  const startLoopRef = useRef(() => {});

  // keep rollingRef up to date
  useEffect(() => {
    rollingRef.current = rollingNow;
  }, [rollingNow]);

  // click to roll
  const handleClick = () => {
    if (!disabled && !rollingRef.current) {
      onRoll();
    }
  };

  // ─── INIT ───────────────────────────────────────────
  useEffect(() => {
    if (rendererRef.current) return;
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;

    const gl = renderer.getContext();

    // swallow immutable-texture errors
    ["texParameteri", "generateMipmap", "texStorage2D"].forEach((fn) => {
      const orig = gl[fn];
      if (typeof orig !== "function") return;
      const bound = orig.bind(gl);
      gl[fn] = (...args) => {
        try {
          return bound(...args);
        } catch {
          // ignore INVALID_OPERATION
        }
      };
    });

    // patch null infoLog to avoid trim errors
    const origGetShaderInfoLog = gl.getShaderInfoLog.bind(gl);
    gl.getShaderInfoLog = (shader) => {
      const log = origGetShaderInfoLog(shader);
      return log ? log : "";
    };
    const origGetProgramInfoLog = gl.getProgramInfoLog.bind(gl);
    gl.getProgramInfoLog = (program) => {
      const log = origGetProgramInfoLog(program);
      return log ? log : "";
    };

    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.set(0, 0, 2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(5, 5, 5);
    scene.add(dl);

    // prepare face textures (cached across mounts)
    const textures = getDiceTextures(renderer);
    const materials = textures.map((tex) => {
      const mat = new THREE.MeshStandardMaterial({
        transparent: true,
        alphaTest: 0.1,
        map: tex,
      });
      mat.needsUpdate = true;
      return mat;
    });

    const chamfer = 0.2; // rounding radius for beveled edges
    const geometry = new RoundedBoxGeometry(1, 1, 1, chamfer, 8);
    geometry.computeVertexNormals();
    const cube = new THREE.Mesh(geometry, materials);
    // RoundedBoxGeometry already accounts for radius in its dimensions,
    scene.add(cube);
    cubeRef.current = cube;

    // render loop
    const tick = () => {
      if (rollingRef.current) {
        cube.rotation.x += 0.3;
        cube.rotation.y += 0.4;
      } else if (!animatingRef.current) {
        cube.rotation.x = spinRef.current.x;
        cube.rotation.y = spinRef.current.y;
      }
      renderer.render(scene, camera);
      if (rollingRef.current || animatingRef.current) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };

    const startLoop = () => {
      if (frameRef.current == null) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    startLoopRef.current = startLoop;

    if (rollingRef.current || animatingRef.current) {
      startLoop();
    } else {
      renderer.render(scene, camera);
    }

    // cleanup
    return () => {
      const rend = rendererRef.current;
      if (rend) {
        const g = rend.getContext();
        const loseExt = g.getExtension("WEBGL_lose_context");
        if (loseExt) loseExt.loseContext();
        if (frameRef.current != null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        rend.dispose();
        container.removeChild(rend.domElement);
        rendererRef.current = null;
      }
    };
  }, [size]);

  // start the loop when rolling begins (after renderer is ready)
  useEffect(() => {
    if (rollingNow) {
      startLoopRef.current();
    }
  }, [rollingNow]);

  // ─── TWEEN TO FACE ───────────────────────────────────
  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube || forcedFace == null) return;
    startLoopRef.current();
    animatingRef.current = true;
    const rotationMap = {
      1: { x: 0, y: 0 },
      2: { x: Math.PI / 2, y: 0 },
      3: { x: 0, y: -Math.PI / 2 },
      4: { x: 0, y: Math.PI / 2 },
      5: { x: -Math.PI / 2, y: 0 },
      6: { x: 0, y: Math.PI },
    };
    const { x: tx, y: ty } = rotationMap[forcedFace];
    gsap.to(cube.rotation, {
      x: tx + Math.PI * 2,
      y: ty + Math.PI * 2,
      duration: 0.8, // ← faster snap to the final face
      ease: "power3.out",
      onComplete: () => {
        spinRef.current = { x: tx, y: ty };
        animatingRef.current = false;
      },
    });
  }, [forcedFace]);

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      style={{
        width: size,
        height: size,
        cursor: disabled ? "default" : "pointer",
      }}
    />
  );
}
