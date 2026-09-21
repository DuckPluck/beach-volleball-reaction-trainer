import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { theme } from "./theme";
import {
  cameraHeight,
  type Player,
  type Scenario,
  type TestSettings,
} from "./model";

function buildScene() {
  const scene = new T.Scene();
  scene.background = new T.Color(theme("scene-sky"));
  scene.fog = new T.Fog(theme("scene-sky"), 25, 80);
  scene.add(
    new T.HemisphereLight(
      theme("scene-light"),
      theme("scene-ground-light"),
      2.4,
    ),
  );
  const sun = new T.DirectionalLight(theme("scene-sun"), 3);
  sun.position.set(-8, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
  });
  sun.shadow.bias = -0.001;
  scene.add(sun);
  const sand = new T.Mesh(
    new T.PlaneGeometry(200, 200),
    new T.MeshStandardMaterial({ color: theme("scene-sand"), roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.receiveShadow = true;
  scene.add(sand);
  const lineMaterial = new T.MeshBasicMaterial({ color: theme("scene-lines") });
  for (const x of [-4, 4]) {
    const line = new T.Mesh(new T.BoxGeometry(0.05, 0.012, 16), lineMaterial);
    line.position.set(x, 0.018, 0);
    scene.add(line);
  }
  for (const z of [-8, 8]) {
    const line = new T.Mesh(new T.BoxGeometry(8, 0.012, 0.05), lineMaterial);
    line.position.set(0, 0.018, z);
    scene.add(line);
  }
  const water = new T.Mesh(
    new T.PlaneGeometry(200, 70),
    new T.MeshBasicMaterial({ color: theme("scene-water") }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.01, -65);
  scene.add(water);
  return scene;
}
function createPlayer(
  p: Player,
  target: { x: number; z: number },
  partner = false,
) {
  const root = new T.Group(),
    group = new T.Group(),
    upper = new T.Group();
  root.position.set(p.x, 0, p.z);
  root.add(group);
  group.add(upper);
  const skin = new T.MeshStandardMaterial({
    color: partner ? theme("scene-partner-skin") : theme("scene-skin"),
    roughness: 1,
  });
  const jersey = new T.MeshStandardMaterial({
    color: partner ? theme("scene-partner") : theme("scene-opponent"),
    roughness: 1,
  });
  const shorts = new T.MeshStandardMaterial({
    color: theme("scene-shorts"),
    roughness: 1,
  });
  const mesh = (
    geometry: T.BufferGeometry,
    material: T.Material,
    x: number,
    y: number,
    z: number,
    parent = group,
  ) => {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const limb = (
    a: number[],
    b: number[],
    r: number,
    material: T.Material,
    parent = group,
  ) => {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const m = mesh(
      new T.CylinderGeometry(r, r * 0.85, start.distanceTo(end), 7),
      material,
      ...(start.clone().add(end).multiplyScalar(0.5).toArray() as [
        number,
        number,
        number,
      ]),
      parent,
    );
    m.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      end.sub(start).normalize(),
    );
  };
  const blocking = p.pose === "block",
    running = p.pose.startsWith("run"),
    lift = blocking ? 0.55 : 0,
    headY = (running ? 1.64 : 1.58) + lift,
    upperBody = running ? upper : group;
  mesh(new T.SphereGeometry(0.14, 12, 8), skin, 0, headY, 0, upperBody);
  mesh(
    new T.SphereGeometry(0.035, 8, 6),
    skin,
    0,
    headY - 0.01,
    0.135,
    upperBody,
  );
  for (const side of [-1, 1])
    mesh(
      new T.SphereGeometry(0.018, 7, 5),
      shorts,
      side * 0.05,
      headY + 0.025,
      0.135,
      upperBody,
    );
  const torso = mesh(
    new T.CylinderGeometry(0.23, 0.17, 0.52, 8),
    jersey,
    0,
    (running ? 1.27 : 1.2) + lift,
    0,
    upperBody,
  );
  torso.rotation.x = running ? 0 : blocking ? 0 : 0.1;
  torso.rotation.z = running ? 0.08 : 0;
  mesh(new T.BoxGeometry(0.4, 0.24, 0.24), shorts, 0, 0.88 + lift, 0);
  for (const side of [-1, 1]) {
    const hip = [side * 0.14, 0.84 + lift, 0];
    const knee = blocking
      ? [side * 0.21, 0.52 + lift, 0.1]
      : running
        ? side < 0
          ? [side * 0.2, 0.48, -0.18]
          : [side * 0.2, 0.62, 0.38]
        : [side * 0.25, 0.5, 0.18];
    const foot = blocking
      ? [side * 0.24, 0.08 + lift, 0.02]
      : running
        ? side < 0
          ? [side * 0.27, 0.08, -0.48]
          : [side * 0.27, 0.38, 0.12]
        : [side * 0.34, 0.08, 0.06];
    limb(hip, knee, 0.08, skin);
    limb(knee, foot, 0.065, skin);
    mesh(
      new T.BoxGeometry(0.13, 0.09, 0.27),
      skin,
      foot[0],
      foot[1],
      foot[2] + 0.08,
    );
    const elbow = blocking
      ? [side * 0.3, 1.88 + lift, 0.04]
      : running
        ? [side * 0.34, 1.23, side < 0 ? -0.2 : 0.2]
        : [side * 0.35, 1.09, 0.18];
    const hand = blocking
      ? [side * 0.26, 2.27 + lift, 0.1]
      : running
        ? [side * 0.25, 1.08, side < 0 ? -0.43 : 0.43]
        : [side * 0.23, 0.97, 0.41];
    limb(
      [side * 0.22, (running ? 1.43 : 1.39) + lift, 0],
      elbow,
      0.06,
      skin,
      upperBody,
    );
    limb(elbow, hand, 0.05, skin, upperBody);
    mesh(
      new T.SphereGeometry(0.07, 8, 6),
      skin,
      ...(hand as [number, number, number]),
      upperBody,
    );
  }
  const dx = p.target
      ? p.target.x - p.x
      : p.pose === "runLeft"
        ? -1
        : p.pose === "runRight"
          ? 1
          : target.x - p.x,
    dz = p.target
      ? p.target.z - p.z
      : running
        ? partner
          ? -0.65
          : 0.65
        : target.z - p.z;
  if (running) {
    upper.children.forEach((part) => (part.position.y -= 0.88));
    upper.position.y = 0.88;
    upper.rotation.x = Math.PI / 4;
  }
  root.rotation.y = Math.atan2(dx, dz);
  return root;
}
function disposeObject(object: T.Object3D) {
  object.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.LineSegments) {
      o.geometry.dispose();
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      materials.forEach((m) => m.dispose());
    }
  });
}
function details(s: Scenario, settings: TestSettings) {
  const group = new T.Group(),
    height = settings.net / 100;
  const material = new T.MeshStandardMaterial({
    color: theme("scene-tape"),
    roughness: 0.8,
  });
  for (const x of [-4.35, 4.35]) {
    const pole = new T.Mesh(
      new T.CylinderGeometry(0.065, 0.065, height + 0.18, 10),
      new T.MeshStandardMaterial({ color: theme("scene-pole") }),
    );
    pole.position.set(x, (height + 0.18) / 2, 0);
    pole.castShadow = true;
    group.add(pole);
  }
  for (const y of [height, height - 1]) {
    const tape = new T.Mesh(new T.BoxGeometry(8.5, 0.07, 0.028), material);
    tape.position.y = y;
    group.add(tape);
  }
  const points: number[] = [];
  for (let x = -4.2; x <= 4.21; x += 0.2)
    points.push(x, height - 1, 0, x, height, 0);
  for (let y = height - 1; y < height; y += 0.2)
    points.push(-4.25, y, 0, 4.25, y, 0);
  group.add(
    new T.LineSegments(
      new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(points, 3),
      ),
      new T.LineBasicMaterial({
        color: theme("scene-mesh"),
        transparent: true,
        opacity: 0.6,
      }),
    ),
  );
  for (const x of [-4, 4]) {
    const antenna = new T.Mesh(
      new T.CylinderGeometry(0.018, 0.018, 0.8, 6),
      new T.MeshBasicMaterial({ color: theme("scene-antenna") }),
    );
    antenna.position.set(x, height + 0.4, 0);
    group.add(antenna);
  }
  s.opponents.forEach((p) => group.add(createPlayer(p, s.camera)));
  group.add(createPlayer(s.partner, { x: 0, z: -4 }, true));
  return group;
}
export function CourtScene({
  scenario,
  settings,
  onReady,
  onError,
  className = "",
}: {
  scenario: Scenario;
  settings: TestSettings;
  onReady?: () => void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<
      | {
          renderer: T.WebGLRenderer;
          scene: T.Scene;
          camera: T.PerspectiveCamera;
          details?: T.Group;
        }
      | undefined
    >(undefined),
    callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };
  const [error, setError] = useState("");
  useEffect(() => {
    const element = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    } catch {
      const message =
        "3D недоступен. Попробуй браузер с поддержкой WebGL или включи аппаратное ускорение.";
      setError(message);
      callbacks.current.onError?.(message);
      return;
    }
    const scene = buildScene(),
      camera = new T.PerspectiveCamera(65, 1, 0.05, 150);
    engine.current = { renderer, scene, camera };
    element.append(renderer.domElement);
    const resize = () => {
      const w = element.clientWidth,
        h = element.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = Math.max(
        70,
        T.MathUtils.radToDeg(
          2 * Math.atan(Math.tan(T.MathUtils.degToRad(60)) / camera.aspect),
        ),
      );
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const lost = (e: Event) => {
      e.preventDefault();
      const message = "Отрисовка поля прервана. Вернись в меню и начни снова.";
      setError(message);
      callbacks.current.onError?.(message);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      engine.current = undefined;
    };
  }, []);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    if (e.details) {
      e.scene.remove(e.details);
      disposeObject(e.details);
    }
    e.details = details(scenario, settings);
    e.scene.add(e.details);
    e.camera.position.set(
      scenario.camera.x,
      cameraHeight(settings, scenario.view),
      scenario.camera.z,
    );
    e.camera.lookAt(
      scenario.mode === "block" ? scenario.opponents[0].x : 0,
      0.65,
      -4.2,
    );
    const element = host.current!;
    e.renderer.setSize(element.clientWidth, element.clientHeight);
    e.camera.aspect = element.clientWidth / element.clientHeight;
    e.camera.fov = Math.max(
      70,
      T.MathUtils.radToDeg(
        2 * Math.atan(Math.tan(T.MathUtils.degToRad(60)) / e.camera.aspect),
      ),
    );
    e.camera.updateProjectionMatrix();
    e.renderer.render(e.scene, e.camera);
    let next = 0;
    const frame = requestAnimationFrame(() => {
      next = requestAnimationFrame(() => callbacks.current.onReady?.());
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(next);
    };
  }, [scenario, settings]);
  return (
    <div
      className={`court-scene ${className}`}
      ref={host}
      role="img"
      aria-label="Поле с позиции игрока: два соперника за сеткой"
    >
      {error && <div className="scene-error">{error}</div>}
    </div>
  );
}
