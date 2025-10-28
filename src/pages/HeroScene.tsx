import React, { useEffect, useRef } from 'react';
import * as BABYLON from '@babylonjs/core';

interface HeroSceneProps {
  isCompressing?: boolean;
  isTitleHovered?: boolean;
}

export const HeroScene: React.FC<HeroSceneProps> = ({
  isCompressing = false,
  isTitleHovered = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    const createScene = (): BABYLON.Scene => {
      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(0.015, 0.04, 0.075, 1);

      const camera = new BABYLON.ArcRotateCamera(
        'camera',
        -4.558687357801138,
        1.2100111172390577,
        20,
        new BABYLON.Vector3(9, 0, 3),
        scene
      );
      camera.lowerRadiusLimit = 15;
      camera.upperRadiusLimit = 30;
      camera.attachControl(canvas, true);

      const mousewheel = camera.inputs.attached['mousewheel'];
      if (mousewheel) {
        mousewheel.detachControl();
      }

      const pointers = camera.inputs.attached['pointers'] as
        | BABYLON.ArcRotateCameraPointersInput
        | undefined;
      if (pointers) {
        pointers.buttons = [1, 2];
      }

      const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0.5), scene);
      light.intensity = 0.8;

      const pointLight = new BABYLON.PointLight('pointLight', new BABYLON.Vector3(0, 5, 0), scene);
      pointLight.intensity = 0.6;
      pointLight.diffuse = new BABYLON.Color3(0.4, 0.5, 0.9);

      new BABYLON.AxesViewer(scene, 5);

      const axisLinesMaterial = new BABYLON.StandardMaterial('axisLinesMat', scene);
      axisLinesMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.5, 1);
      axisLinesMaterial.alpha = 0.3;

      const axisLines: { line: BABYLON.LinesMesh; axis: string; offset: number }[] = [];

      const createAxisLine = (axis: string, color: BABYLON.Color3): void => {
        const points = [];
        const length = 100;

        if (axis === 'x') {
          points.push(new BABYLON.Vector3(-length, 0, 0));
          points.push(new BABYLON.Vector3(length, 0, 0));
        } else if (axis === 'y') {
          points.push(new BABYLON.Vector3(0, -length, 0));
          points.push(new BABYLON.Vector3(0, length, 0));
        } else {
          points.push(new BABYLON.Vector3(0, 0, -length));
          points.push(new BABYLON.Vector3(0, 0, length));
        }

        const line = BABYLON.MeshBuilder.CreateLines(`${axis}AxisLine`, { points }, scene);
        line.color = color;
        line.alpha = 0.008;
        axisLines.push({ line, axis, offset: Math.random() * Math.PI * 2 });
      };

      createAxisLine('x', new BABYLON.Color3(0.1, 0.12, 0.15));
      createAxisLine('y', new BABYLON.Color3(0.1, 0.12, 0.15));
      createAxisLine('z', new BABYLON.Color3(0.1, 0.12, 0.15));

      const cube = BABYLON.MeshBuilder.CreateBox('cube', { size: 4 }, scene);
      cube.position = new BABYLON.Vector3(3, 0, 3);
      cube.rotation = new BABYLON.Vector3(0, 0, 0);

      const cubeMaterial = new BABYLON.StandardMaterial('cubeMat', scene);
      cubeMaterial.alpha = 0;
      cube.material = cubeMaterial;

      cube.enableEdgesRendering();
      cube.edgesWidth = 5.0;
      cube.edgesColor = new BABYLON.Color4(1, 1, 1, 0.9);
      cube.isPickable = true;

      const frostShaderMaterial = new BABYLON.ShaderMaterial(
        'frostShader',
        scene,
        {
          vertex: 'custom',
          fragment: 'custom',
        },
        {
          attributes: ['position', 'normal', 'uv'],
          uniforms: ['world', 'worldView', 'worldViewProjection', 'view', 'projection', 'time'],
        }
      );

      BABYLON.Effect.ShadersStore['customVertexShader'] = `
        precision highp float;
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUV;
        void main(void) {
          gl_Position = worldViewProjection * vec4(position, 1.0);
          vPosition = vec3(world * vec4(position, 1.0));
          vNormal = normalize(vec3(world * vec4(normal, 0.0)));
          vUV = uv;
        }
      `;

      BABYLON.Effect.ShadersStore['customFragmentShader'] = `
        precision highp float;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec2 vUV;
        uniform float time;

        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float voronoi(vec2 st) {
          vec2 i_st = floor(st);
          vec2 f_st = fract(st);
          float minDist = 1.0;

          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 neighbor = vec2(float(x), float(y));
              vec2 point = random(i_st + neighbor) * vec2(1.0, 1.0);
              vec2 diff = neighbor + point - f_st;
              float dist = length(diff);
              minDist = min(minDist, dist);
            }
          }

          return minDist;
        }

        void main(void) {
          vec2 pos = vUV * 12.0;

          float slowTime = time * 0.08;
          float fastTime = time * 0.4;

          float vor1 = voronoi(pos + slowTime);
          float vor2 = voronoi(pos * 2.0 - slowTime * 0.5);
          float crystalPattern = vor1 * 0.6 + vor2 * 0.4;

          float n1 = noise(pos * 3.0 + fastTime);
          float n2 = noise(pos * 6.0 - fastTime * 0.7);
          float sparkle = n1 * 0.6 + n2 * 0.4;

          float distFromCenter = length(vUV - 0.5);
          float edgeFade = smoothstep(0.5, 0.35, distFromCenter);

          vec3 deepIce = vec3(0.4, 0.65, 0.95);
          vec3 lightIce = vec3(0.75, 0.9, 1.0);
          vec3 sparkleColor = vec3(0.95, 0.98, 1.0);

          vec3 baseColor = mix(deepIce, lightIce, crystalPattern);
          baseColor = mix(baseColor, sparkleColor, sparkle * 0.3);

          float glow = sin(time * 1.5) * 0.5 + 0.5;
          baseColor += vec3(0.15, 0.25, 0.4) * glow * edgeFade * 0.4;

          float alpha = (0.15 + crystalPattern * 0.2 + sparkle * 0.15) * edgeFade;

          gl_FragColor = vec4(baseColor, alpha);
        }
      `;

      const icyMPQPlanes: BABYLON.Mesh[] = [];
      const iceCrystals: BABYLON.InstancedMesh[] = [];

      const create3DLetter = (
        letter: string,
        xOffset: number,
        parent: BABYLON.TransformNode
      ): BABYLON.Mesh[] => {
        const meshes: BABYLON.Mesh[] = [];
        const depth = 0.25;
        const width = 0.35;
        const height = 0.6;
        const thickness = 0.12;

        if (letter === 'M') {
          const left = BABYLON.MeshBuilder.CreateBox(
            'M_left',
            { width: thickness, height, depth },
            scene
          );
          left.position.x = xOffset - width / 2;
          left.setParent(parent);
          meshes.push(left);

          const right = BABYLON.MeshBuilder.CreateBox(
            'M_right',
            { width: thickness, height, depth },
            scene
          );
          right.position.x = xOffset + width / 2;
          right.setParent(parent);
          meshes.push(right);

          const diagLeft = BABYLON.MeshBuilder.CreateBox(
            'M_diagL',
            { width: thickness, height: height * 0.6, depth },
            scene
          );
          diagLeft.position.x = xOffset - width / 4;
          diagLeft.position.y = height / 6;
          diagLeft.rotation.z = -0.4;
          diagLeft.setParent(parent);
          meshes.push(diagLeft);

          const diagRight = BABYLON.MeshBuilder.CreateBox(
            'M_diagR',
            { width: thickness, height: height * 0.6, depth },
            scene
          );
          diagRight.position.x = xOffset + width / 4;
          diagRight.position.y = height / 6;
          diagRight.rotation.z = 0.4;
          diagRight.setParent(parent);
          meshes.push(diagRight);
        } else if (letter === 'P') {
          const stem = BABYLON.MeshBuilder.CreateBox(
            'P_stem',
            { width: thickness, height, depth },
            scene
          );
          stem.position.x = xOffset - width / 3;
          stem.setParent(parent);
          meshes.push(stem);

          const top = BABYLON.MeshBuilder.CreateBox(
            'P_top',
            { width: width * 0.55, height: thickness, depth },
            scene
          );
          top.position.x = xOffset + thickness;
          top.position.y = height / 3;
          top.setParent(parent);
          meshes.push(top);

          const arc = BABYLON.MeshBuilder.CreateTorus(
            'P_arc',
            { diameter: width * 0.5, thickness: thickness, tessellation: 16 },
            scene
          );
          arc.position.x = xOffset + thickness;
          arc.position.y = height / 3;
          arc.rotation.y = Math.PI / 2;
          arc.scaling.y = 0.8;
          arc.setParent(parent);
          meshes.push(arc);

          const bottom = BABYLON.MeshBuilder.CreateBox(
            'P_bottom',
            { width: width * 0.4, height: thickness, depth },
            scene
          );
          bottom.position.x = xOffset + thickness / 2;
          bottom.position.y = height / 3 - height * 0.27;
          bottom.setParent(parent);
          meshes.push(bottom);
        } else if (letter === 'Q') {
          const circle = BABYLON.MeshBuilder.CreateTorus(
            'Q_circle',
            { diameter: width * 0.9, thickness: thickness, tessellation: 32 },
            scene
          );
          circle.position.x = xOffset;
          circle.rotation.y = Math.PI / 2;
          circle.setParent(parent);
          meshes.push(circle);

          const tail = BABYLON.MeshBuilder.CreateBox(
            'Q_tail',
            { width: thickness, height: height * 0.35, depth },
            scene
          );
          tail.position.x = xOffset + width / 4;
          tail.position.y = -height / 4;
          tail.rotation.z = 0.5;
          tail.setParent(parent);
          meshes.push(tail);
        }

        return meshes;
      };

      const createTextMesh = (text: string, faceIndex: number): BABYLON.Mesh => {
        const parent = new BABYLON.TransformNode(`textParent${faceIndex}`, scene);

        const mat = new BABYLON.StandardMaterial(`textMat${faceIndex}`, scene);
        mat.diffuseColor = new BABYLON.Color3(0.95, 0.98, 1);
        mat.emissiveColor = new BABYLON.Color3(0.6, 0.8, 1);
        mat.specularColor = new BABYLON.Color3(1, 1, 1);
        mat.specularPower = 64;

        const letterSpacing = 0.5;
        const totalWidth = text.length * letterSpacing;
        let currentX = -totalWidth / 2 + letterSpacing / 2;

        for (const letter of text) {
          const letterMeshes = create3DLetter(letter, currentX, parent);
          letterMeshes.forEach((mesh) => {
            mesh.material = mat;
          });
          currentX += letterSpacing;
        }

        return parent as unknown as BABYLON.Mesh;
      };

      const facePositions = [
        { pos: new BABYLON.Vector3(0, 0, 2.05), rot: new BABYLON.Vector3(0, 0, 0) },
        { pos: new BABYLON.Vector3(0, 0, -2.05), rot: new BABYLON.Vector3(0, Math.PI, 0) },
        { pos: new BABYLON.Vector3(2.05, 0, 0), rot: new BABYLON.Vector3(0, Math.PI / 2, 0) },
        { pos: new BABYLON.Vector3(-2.05, 0, 0), rot: new BABYLON.Vector3(0, -Math.PI / 2, 0) },
        { pos: new BABYLON.Vector3(0, 2.05, 0), rot: new BABYLON.Vector3(-Math.PI / 2, 0, 0) },
        { pos: new BABYLON.Vector3(0, -2.05, 0), rot: new BABYLON.Vector3(Math.PI / 2, 0, 0) },
      ];

      const iceCrystalMaster = BABYLON.MeshBuilder.CreatePolyhedron(
        'iceCrystal',
        { type: 1, size: 0.03 },
        scene
      );
      iceCrystalMaster.isVisible = false;

      const getTextEdgePoints = (letterCount: number): BABYLON.Vector3[] => {
        const points: BABYLON.Vector3[] = [];
        const letterSpacing = 0.5;
        const totalWidth = letterCount * letterSpacing;
        const letters = ['M', 'P', 'Q'];

        letters.forEach((letter, idx) => {
          const xOffset = -totalWidth / 2 + letterSpacing / 2 + idx * letterSpacing;
          const width = 0.35;
          const height = 0.6;

          if (letter === 'M') {
            for (let i = 0; i < 8; i++) {
              points.push(
                new BABYLON.Vector3(xOffset - width / 2, -height / 2 + (i * height) / 8, 0.15)
              );
              points.push(
                new BABYLON.Vector3(xOffset + width / 2, -height / 2 + (i * height) / 8, 0.15)
              );
            }
          } else if (letter === 'P') {
            for (let i = 0; i < 6; i++) {
              points.push(
                new BABYLON.Vector3(xOffset - width / 3, -height / 2 + (i * height) / 6, 0.15)
              );
            }
            for (let i = 0; i < 4; i++) {
              const angle = (Math.PI * i) / 3;
              points.push(
                new BABYLON.Vector3(
                  xOffset + Math.cos(angle) * width * 0.25,
                  height / 3 + Math.sin(angle) * width * 0.2,
                  0.15
                )
              );
            }
          } else if (letter === 'Q') {
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12;
              points.push(
                new BABYLON.Vector3(
                  xOffset + Math.cos(angle) * width * 0.45,
                  Math.sin(angle) * width * 0.45,
                  0.15
                )
              );
            }
          }
        });

        return points;
      };

      facePositions.forEach((faceData, i) => {
        const textMesh = createTextMesh('MPQ', i);
        textMesh.position = cube.position.add(faceData.pos);
        textMesh.rotation = faceData.rot;
        textMesh.setParent(cube as BABYLON.Node);
        icyMPQPlanes.push(textMesh);

        const frostPlane = BABYLON.MeshBuilder.CreatePlane(`frost${i}`, { size: 2.2 }, scene);
        frostPlane.position = cube.position.add(faceData.pos.scale(0.97));
        frostPlane.rotation = faceData.rot;
        frostPlane.setParent(cube as BABYLON.Node);
        const frostMat = frostShaderMaterial.clone(`frostMat${i}`);
        frostPlane.material = frostMat as unknown as BABYLON.Material;

        const edgePoints = getTextEdgePoints(3);

        edgePoints.forEach((localPoint, j) => {
          const instance = iceCrystalMaster.createInstance(`crystal${i}_${j}`);

          const rotatedPoint = localPoint.clone();
          if (Math.abs(faceData.pos.z) > 1) {
            instance.position = cube.position.add(
              new BABYLON.Vector3(
                faceData.pos.x + rotatedPoint.x,
                faceData.pos.y + rotatedPoint.y,
                faceData.pos.z > 0 ? faceData.pos.z + 0.15 : faceData.pos.z - 0.15
              )
            );
          } else if (Math.abs(faceData.pos.x) > 1) {
            instance.position = cube.position.add(
              new BABYLON.Vector3(
                faceData.pos.x > 0 ? faceData.pos.x + 0.15 : faceData.pos.x - 0.15,
                faceData.pos.y + rotatedPoint.y,
                faceData.pos.z + rotatedPoint.x
              )
            );
          } else {
            instance.position = cube.position.add(
              new BABYLON.Vector3(
                faceData.pos.x + rotatedPoint.x,
                faceData.pos.y > 0 ? faceData.pos.y + 0.15 : faceData.pos.y - 0.15,
                faceData.pos.z + rotatedPoint.y
              )
            );
          }

          instance.position.x += (Math.random() - 0.5) * 0.04;
          instance.position.y += (Math.random() - 0.5) * 0.04;
          instance.position.z += (Math.random() - 0.5) * 0.04;

          instance.setParent(cube as BABYLON.Node);
          instance.scaling = new BABYLON.Vector3(0.8 + Math.random() * 0.6, 1 + Math.random(), 0.8);
          instance.rotation = new BABYLON.Vector3(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );

          const crystalMat = new BABYLON.StandardMaterial(`crystalMat${i}_${j}`, scene);
          crystalMat.diffuseColor = new BABYLON.Color3(0.6, 0.85, 1);
          crystalMat.emissiveColor = new BABYLON.Color3(0.3, 0.5, 0.8);
          crystalMat.alpha = 0.7 + Math.random() * 0.2;
          crystalMat.specularPower = 128;
          instance.material = crystalMat;

          iceCrystals.push(instance);
        });
      });

      const sphere = BABYLON.MeshBuilder.CreateSphere(
        'sphere',
        { diameter: 3, segments: 128 },
        scene
      );
      sphere.position = new BABYLON.Vector3(3, 0, 3);

      const sphereMaterial = new BABYLON.StandardMaterial('sphereMat', scene);
      sphereMaterial.diffuseColor = new BABYLON.Color3(1, 0.15, 0.15);
      sphereMaterial.emissiveColor = new BABYLON.Color3(0.9, 0.05, 0.05);
      sphereMaterial.specularColor = new BABYLON.Color3(1, 0.4, 0.4);
      sphereMaterial.alpha = 0.92;
      sphereMaterial.specularPower = 32;
      sphere.material = sphereMaterial;
      sphere.isPickable = true;

      const positions = sphere.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      const originalPositions = positions ? Float32Array.from(positions) : new Float32Array();
      const normals = sphere.getVerticesData(BABYLON.VertexBuffer.NormalKind);

      interface SphereData {
        mesh: BABYLON.Mesh;
        velocity: BABYLON.Vector3;
        baseColor: BABYLON.Color3;
        isHovered: boolean;
      }

      const floatingSpheres: SphereData[] = [];
      const sphereColors = [
        new BABYLON.Color3(0.3, 0.7, 1),
        new BABYLON.Color3(1, 0.8, 0.3),
        new BABYLON.Color3(0.5, 1, 0.5),
        new BABYLON.Color3(1, 0.5, 0.8),
        new BABYLON.Color3(0.7, 0.3, 1),
        new BABYLON.Color3(0.4, 1, 0.8),
        new BABYLON.Color3(1, 0.6, 0.3),
        new BABYLON.Color3(0.6, 0.8, 1),
        new BABYLON.Color3(1, 1, 0.4),
        new BABYLON.Color3(0.8, 0.5, 1),
      ];

      for (let i = 0; i < 10; i++) {
        const floatSphere = BABYLON.MeshBuilder.CreateSphere(
          `floatSphere${i}`,
          { diameter: 0.4 },
          scene
        );
        const angle = (Math.PI * 2 * i) / 10;
        floatSphere.position = new BABYLON.Vector3(
          Math.cos(angle) * 6,
          Math.sin(i * 1.5) * 2,
          Math.sin(angle) * 6
        );

        const color = sphereColors[i] ?? new BABYLON.Color3(1, 1, 1);
        const floatMaterial = new BABYLON.StandardMaterial(`floatMat${i}`, scene);
        floatMaterial.diffuseColor = color;
        floatMaterial.emissiveColor = color.scale(0.5);
        floatMaterial.alpha = 0.8;
        floatSphere.material = floatMaterial;

        floatSphere.isPickable = true;

        floatingSpheres.push({
          mesh: floatSphere,
          velocity: new BABYLON.Vector3(0, 0, 0),
          baseColor: color,
          isHovered: false,
        });
      }

      let compressionProgress = 0;
      let targetCompression = 0;
      let scenarioTimer = 0;
      let scenarioState = 0;

      let cursorPosition: BABYLON.Vector3 | null = null;
      let draggedSphere: SphereData | null = null;
      let dragOffset = new BABYLON.Vector3(0, 0, 0);
      let previousCursorPosition: BABYLON.Vector3 | null = null;

      let isCubeHovered = false;
      let cubeSqueezeProgress = 0;
      let cubeClickImpact = 0;

      let isSphereHovered = false;
      let sphereSqueezeProgress = 0;
      let sphereClickImpact = 0;

      const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, scene);
      ground.position.y = 0;
      ground.isVisible = false;

      scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
          const groundPick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
            return mesh === ground;
          });

          if (groundPick?.hit && groundPick.pickedPoint) {
            cursorPosition = groundPick.pickedPoint.clone();

            if (draggedSphere !== null) {
              draggedSphere.mesh.position.x = cursorPosition.x + dragOffset.x;
              draggedSphere.mesh.position.z = cursorPosition.z + dragOffset.z;
            }
          }

          const spherePick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
            return floatingSpheres.some((data) => data.mesh === mesh);
          });

          floatingSpheres.forEach((sphereData) => {
            sphereData.isHovered =
              spherePick?.hit === true && spherePick.pickedMesh === sphereData.mesh;
          });

          const cubePick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
            return mesh === cube;
          });
          isCubeHovered = cubePick?.hit ?? false;

          const spherePick2 = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
            return mesh === sphere;
          });
          isSphereHovered = spherePick2?.hit ?? false;
        } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
          if (pointerInfo.event.button !== 0) return;

          const pickResult = scene.pick(scene.pointerX, scene.pointerY);

          if (pickResult?.hit && pickResult.pickedMesh === cube) {
            cubeClickImpact = 1;
          } else if (pickResult?.hit && pickResult.pickedMesh === sphere) {
            sphereClickImpact = 1;
          } else if (pickResult?.hit && pickResult.pickedMesh) {
            const pickedSphere = floatingSpheres.find(
              (data) => data.mesh === pickResult.pickedMesh
            );

            if (pickedSphere) {
              draggedSphere = pickedSphere;
              const groundPick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
                return mesh === ground;
              });
              if (groundPick?.hit && groundPick.pickedPoint) {
                cursorPosition = groundPick.pickedPoint.clone();
                previousCursorPosition = cursorPosition.clone();
                dragOffset = new BABYLON.Vector3(
                  pickedSphere.mesh.position.x - cursorPosition.x,
                  0,
                  pickedSphere.mesh.position.z - cursorPosition.z
                );
                pickedSphere.velocity.scaleInPlace(0);
              }
            }
          }
        } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
          if (pointerInfo.event.button !== 0) return;

          if (draggedSphere && cursorPosition && previousCursorPosition) {
            const throwVelocity = cursorPosition.subtract(previousCursorPosition).scale(15);
            throwVelocity.y = 0;
            draggedSphere.velocity = throwVelocity;
            draggedSphere = null;
          }
        }
      });

      scene.registerBeforeRender(() => {
        const time = performance.now() * 0.001;

        cube.rotation.y = time * 0.2;
        cube.rotation.x = Math.sin(time * 0.3) * 0.1;

        const targetCubeSqueezeFromHover = isCubeHovered || isTitleHovered ? 0.3 : 0;
        cubeSqueezeProgress += (targetCubeSqueezeFromHover - cubeSqueezeProgress) * 0.02;

        cubeClickImpact *= 0.92;

        targetCompression = isCompressing ? 1 : 0;
        compressionProgress += (targetCompression - compressionProgress) * 0.05;

        const breathingCube = Math.sin(time * 0.8) * 0.08;
        const totalSqueeze = cubeSqueezeProgress + cubeClickImpact * 0.6;
        const cubeBaseScale = (4 - compressionProgress * 2) / 4;
        const cubeScaleX = cubeBaseScale * (1 - totalSqueeze * 0.3 + breathingCube * 0.5);
        const cubeScaleY = cubeBaseScale * (1 - totalSqueeze * 0.5 - breathingCube);
        const cubeScaleZ = cubeBaseScale * (1 - totalSqueeze * 0.3 + breathingCube * 0.5);

        cube.scaling = new BABYLON.Vector3(cubeScaleX, cubeScaleY, cubeScaleZ);

        const targetSphereSqueezeFromHover = isSphereHovered ? 0.7 : 0;
        sphereSqueezeProgress += (targetSphereSqueezeFromHover - sphereSqueezeProgress) * 0.04;

        sphereClickImpact *= 0.8;

        const totalSphereSqueeze = sphereSqueezeProgress + sphereClickImpact * 1.2;

        const cubeCorners = [
          new BABYLON.Vector3(2 * cubeScaleX, 2 * cubeScaleY, 2 * cubeScaleZ),
          new BABYLON.Vector3(2 * cubeScaleX, 2 * cubeScaleY, -2 * cubeScaleZ),
          new BABYLON.Vector3(2 * cubeScaleX, -2 * cubeScaleY, 2 * cubeScaleZ),
          new BABYLON.Vector3(2 * cubeScaleX, -2 * cubeScaleY, -2 * cubeScaleZ),
          new BABYLON.Vector3(-2 * cubeScaleX, 2 * cubeScaleY, 2 * cubeScaleZ),
          new BABYLON.Vector3(-2 * cubeScaleX, 2 * cubeScaleY, -2 * cubeScaleZ),
          new BABYLON.Vector3(-2 * cubeScaleX, -2 * cubeScaleY, 2 * cubeScaleZ),
          new BABYLON.Vector3(-2 * cubeScaleX, -2 * cubeScaleY, -2 * cubeScaleZ),
        ];

        const cubeFaces = [
          { normal: new BABYLON.Vector3(0, 0, 1), distance: 2 * cubeScaleZ },
          { normal: new BABYLON.Vector3(0, 0, -1), distance: 2 * cubeScaleZ },
          { normal: new BABYLON.Vector3(1, 0, 0), distance: 2 * cubeScaleX },
          { normal: new BABYLON.Vector3(-1, 0, 0), distance: 2 * cubeScaleX },
          { normal: new BABYLON.Vector3(0, 1, 0), distance: 2 * cubeScaleY },
          { normal: new BABYLON.Vector3(0, -1, 0), distance: 2 * cubeScaleY },
        ];

        if (positions) {
          const newPositions = new Float32Array(originalPositions);

          for (let i = 0; i < newPositions.length; i += 3) {
            const vertexPos = new BABYLON.Vector3(
              originalPositions[i],
              originalPositions[i + 1],
              originalPositions[i + 2]
            );

            const totalPush = new BABYLON.Vector3(0, 0, 0);

            cubeCorners.forEach((corner) => {
              const toCorner = corner.subtract(vertexPos);
              const dist = toCorner.length();
              const influenceRadius = 2.8;
              if (dist < influenceRadius) {
                const falloff = Math.pow(1 - dist / influenceRadius, 3);
                const influence = falloff * totalSphereSqueeze * 0.8;
                const push = toCorner.normalize().scale(influence);
                totalPush.addInPlace(push);
              }
            });

            cubeFaces.forEach((face) => {
              const distToFace = Math.abs(BABYLON.Vector3.Dot(vertexPos, face.normal));
              const penetration = Math.max(0, distToFace - face.distance);
              if (penetration > 0 && distToFace > face.distance - 0.5) {
                const squishInfluence = Math.min(1, penetration / 0.5);
                const flatPush = face.normal.scale(-squishInfluence * totalSphereSqueeze * 0.3);
                totalPush.addInPlace(flatPush);
              }
            });

            const baseSqueeze = 1 - totalSphereSqueeze * 0.55;
            if (newPositions[i] !== undefined)
              newPositions[i] = (vertexPos.x + totalPush.x) * baseSqueeze;
            if (newPositions[i + 1] !== undefined)
              newPositions[i + 1] = (vertexPos.y + totalPush.y) * baseSqueeze;
            if (newPositions[i + 2] !== undefined)
              newPositions[i + 2] = (vertexPos.z + totalPush.z) * baseSqueeze;
          }

          sphere.updateVerticesData(BABYLON.VertexBuffer.PositionKind, newPositions);

          if (normals) {
            BABYLON.VertexData.ComputeNormals(newPositions, sphere.getIndices() ?? [], normals);
            sphere.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
          }
        }

        sphere.position.y = Math.sin(time * 2) * (0.1 - totalSphereSqueeze * 0.08);

        const redIntensity = Math.min(1.5, 0.9 + totalSphereSqueeze * 3.5);
        const redDarkness = Math.max(0.02, 0.05 - totalSphereSqueeze * 0.08);
        const sphereMat = sphere.material as BABYLON.StandardMaterial | null;
        if (sphereMat) {
          sphereMat.emissiveColor = new BABYLON.Color3(redIntensity, redDarkness, redDarkness);
          sphereMat.diffuseColor = new BABYLON.Color3(
            Math.min(1, 1 + totalSphereSqueeze * 0.5),
            Math.max(0.05, 0.15 - totalSphereSqueeze * 0.15),
            Math.max(0.05, 0.15 - totalSphereSqueeze * 0.15)
          );
        }

        const deltaTime = (scene.deltaTime ?? 16) / 1000;
        previousCursorPosition = cursorPosition ? cursorPosition.clone() : null;

        floatingSpheres.forEach((sphereData, i) => {
          const sphere = sphereData.mesh;

          if (draggedSphere === sphereData) {
            return;
          }

          const returnRadius = 8 + (i % 3) * 1.5;
          const orbitSpeed = 0.3 + (i % 5) * 0.1;
          const returnAngle = time * orbitSpeed + (Math.PI * 2 * i) / 10;
          const homePos = new BABYLON.Vector3(
            Math.cos(returnAngle) * returnRadius,
            1 + Math.sin(time * 0.8 + i) * 1.5,
            Math.sin(returnAngle) * returnRadius
          );

          if (cursorPosition) {
            const toCursor = cursorPosition.subtract(sphere.position);
            const distance = toCursor.length();

            if (draggedSphere) {
              const orbitRadius = 2 + i * 0.3;
              const orbitSpeedFast = 2 + i * 0.1;
              const angle = time * orbitSpeedFast + (Math.PI * 2 * i) / 10;

              const targetPos = cursorPosition.clone();
              targetPos.x += Math.cos(angle) * orbitRadius;
              targetPos.z += Math.sin(angle) * orbitRadius;
              targetPos.y += Math.sin(time * 1.5 + i) * 0.5;

              const toTarget = targetPos.subtract(sphere.position);
              sphereData.velocity.addInPlace(toTarget.scale(3 * deltaTime));
            } else if (distance < 6) {
              const fleeForce = toCursor.normalize().scale(-6 / Math.max(distance, 0.5));
              sphereData.velocity.addInPlace(fleeForce.scale(deltaTime));
            } else {
              const toHome = homePos.subtract(sphere.position);
              const homeDistance = toHome.length();
              const clusterForce = toHome.normalize().scale(Math.min(homeDistance * 0.8, 3));
              sphereData.velocity.addInPlace(clusterForce.scale(deltaTime));
            }
          } else {
            const toHome = homePos.subtract(sphere.position);
            const homeDistance = toHome.length();
            const clusterForce = toHome.normalize().scale(Math.min(homeDistance * 0.8, 3));
            sphereData.velocity.addInPlace(clusterForce.scale(deltaTime));
          }

          sphereData.velocity.scaleInPlace(0.96);

          sphere.position.addInPlace(sphereData.velocity.scale(deltaTime));

          if (sphere.position.y < -1) {
            sphere.position.y = -1;
            sphereData.velocity.y = Math.abs(sphereData.velocity.y) * 0.5;
          }
          if (sphere.position.y > 10) {
            sphere.position.y = 10;
            sphereData.velocity.y = -Math.abs(sphereData.velocity.y) * 0.5;
          }

          const maxRadius = 12;
          const distFromCenter = Math.sqrt(
            sphere.position.x * sphere.position.x + sphere.position.z * sphere.position.z
          );
          if (distFromCenter > maxRadius) {
            const toCenter = new BABYLON.Vector3(-sphere.position.x, 0, -sphere.position.z)
              .normalize()
              .scale(2);
            sphereData.velocity.addInPlace(toCenter.scale(deltaTime * 5));
          }

          floatingSpheres.forEach((otherSphereData, j) => {
            if (j <= i) return;

            const otherSphere = otherSphereData.mesh;
            const toOther = otherSphere.position.subtract(sphere.position);
            const distance = toOther.length();
            const minDistance = 0.4;

            if (distance < minDistance && distance > 0) {
              const normal = toOther.normalize();
              const overlap = minDistance - distance;

              sphere.position.addInPlace(normal.scale(-overlap * 0.5));
              otherSphere.position.addInPlace(normal.scale(overlap * 0.5));

              const relativeVelocity = sphereData.velocity.subtract(otherSphereData.velocity);
              const velocityAlongNormal = BABYLON.Vector3.Dot(relativeVelocity, normal);

              if (velocityAlongNormal < 0) {
                const restitution = 0.8;
                const impulse = normal.scale(-(1 + restitution) * velocityAlongNormal * 0.5);

                sphereData.velocity.addInPlace(impulse);
                otherSphereData.velocity.subtractInPlace(impulse);
              }
            }
          });

          const material = sphere.material as BABYLON.StandardMaterial | null;
          if (material !== null) {
            const brightness = sphereData.isHovered || draggedSphere !== null ? 1.5 : 1;
            material.emissiveColor = sphereData.baseColor.scale(0.5 * brightness);
            material.diffuseColor = sphereData.baseColor.scale(brightness);
          }
        });

        axisLines.forEach((axisLine) => {
          const pulse = Math.sin(time * 0.3 + axisLine.offset) * 0.5 + 0.5;
          axisLine.line.alpha = 0.008 + pulse * 0.012;
        });

        icyMPQPlanes.forEach((plane) => {
          const mat = plane.material as BABYLON.StandardMaterial | null;
          if (mat) {
            const glow = Math.sin(time * 2) * 0.5 + 0.5;
            mat.emissiveColor = new BABYLON.Color3(0.6, 0.8, 1).scale(0.3 + glow * 0.4);
          }
        });

        iceCrystals.forEach((crystal, idx) => {
          const floatOffset = Math.sin(time * 2 + idx * 0.3) * 0.008;
          crystal.position.y += floatOffset;

          const mat = crystal.material as BABYLON.StandardMaterial | null;
          if (mat) {
            const sparkle = Math.sin(time * 4 + idx * 0.5) * 0.5 + 0.5;
            mat.emissiveColor = new BABYLON.Color3(0.3, 0.5, 0.8).scale(0.5 + sparkle * 0.5);
            mat.alpha = 0.6 + sparkle * 0.3;
          }

          crystal.rotation.y += 0.005;
          crystal.rotation.z += 0.003;
        });

        frostShaderMaterial.setFloat('time', time);

        scenarioTimer += scene.deltaTime ?? 16;
        if (scenarioTimer > 5000) {
          scenarioTimer = 0;
          scenarioState = (scenarioState + 1) % 10;
        }
      });

      return scene;
    };

    const scene = createScene();

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = (): void => {
      engine.resize();
    };

    const cleanupResizeListener = (): void => {
      window.removeEventListener('resize', handleResize);
    };

    window.addEventListener('resize', handleResize);

    return (): void => {
      cleanupResizeListener();
      scene.dispose();
      engine.dispose();
    };
  }, [isCompressing, isTitleHovered]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};
