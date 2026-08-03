/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore, globalGameState } from '../store/gameStore';
import { WORLD_SIZE, TURN_SPEED, BOOST_SPEED, BASE_SPEED } from '../shared/types';
import * as THREE from 'three';
import { Sphere, Grid } from '@react-three/drei';

const localCollectedOrbs = new Set<string>();

function SpermCell({ playerId, color, isLocal }: { playerId: string, color: string, isLocal: boolean }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);
  const baseColor = useMemo(() => new THREE.Color(color || '#ffffff'), [color]);
  const currentPositions = useRef<{x: number, y: number}[]>([]);

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;
    
    const player = gs.players[playerId];
    if (!player || player.segments.length === 0) {
      bodyRef.current.count = 0;
      headRef.current.visible = false;
      return;
    }
    
    headRef.current.visible = true;
    const count = player.segments.length;
    bodyRef.current.count = Math.max(0, count - 1);
    
    while (currentPositions.current.length < count) {
      const idx = currentPositions.current.length;
      currentPositions.current.push({ 
        x: player.segments[idx]?.x || 0, 
        y: player.segments[idx]?.y || 0 
      });
    }

    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      let targetX = player.segments[i].x;
      let targetY = player.segments[i].y;
      
      const curr = currentPositions.current[i];
      if (isLocal) {
        curr.x = targetX;
        curr.y = targetY;
      } else {
        const dist = Math.abs(targetX - curr.x) + Math.abs(targetY - curr.y);
        if (dist > 10) {
          curr.x = targetX;
          curr.y = targetY;
        } else {
          const lerpFactor = 15;
          curr.x += (targetX - curr.x) * lerpFactor * delta;
          curr.y += (targetY - curr.y) * lerpFactor * delta;
        }
      }
      
      // Calculate angle pointing along sperm cell spine
      let segAngle = player.currentAngle;
      if (i > 0) {
        const prev = currentPositions.current[i - 1];
        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        if (Math.hypot(dx, dy) > 0.01) {
          segAngle = Math.atan2(dy, dx);
        }
      }

      if (i === 0) {
        // Sperm Cell Head (Oval / Teardrop shape)
        headRef.current.position.set(curr.x, curr.y, 0.5);
        headRef.current.rotation.z = segAngle;
      } else {
        // Flagellum Tail Segments (1 to count-1)
        const segIdx = i; // 1-indexed segment number
        
        // Flagellar Swimming Undulation (Whipping sine wave along tail)
        const waveFreq = player.isBoosting ? 22.0 : 14.0;
        const waveAmp = (segIdx / Math.max(1, count)) * 0.35;
        const waveOffset = Math.sin(time * waveFreq - segIdx * 0.4) * waveAmp;
        
        // Perpendicular offset angle for tail whip
        const perpAngle = segAngle + Math.PI / 2;
        const waveX = curr.x + Math.cos(perpAngle) * waveOffset;
        const waveY = curr.y + Math.sin(perpAngle) * waveOffset;

        dummy.position.set(waveX, waveY, 0.5);
        dummy.rotation.z = segAngle;

        // Smooth tail tapering from thick neck down to micro-thin tail tip
        const taperRatio = Math.pow(Math.max(0, 1.0 - segIdx / count), 1.2);
        let scaleX = 1.0;
        let scaleY = 1.0;
        let scaleZ = 1.0;

        if (segIdx === 1) {
          // Mitochondria Midpiece / Neck (slightly ribbed & thicker)
          scaleX = 0.85;
          scaleY = 0.8;
          scaleZ = 0.8;
        } else {
          // Tapering whip-like flagellum
          const tailScale = Math.max(0.08, taperRatio * 0.75);
          scaleX = tailScale;
          scaleY = tailScale;
          scaleZ = tailScale;
        }

        dummy.scale.set(scaleX, scaleY, scaleZ);
        dummy.updateMatrix();
        bodyRef.current.setMatrixAt(i - 1, dummy.matrix);
        bodyRef.current.setColorAt(i - 1, baseColor);
      }
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor) {
      bodyRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Sperm Cell Oval Head & Acrosome Cap */}
      <group ref={headRef}>
        {/* Main Oval Sperm Head */}
        <Sphere castShadow receiveShadow args={[0.85, 24, 24]} scale={[1.35, 0.9, 0.9]} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={color || '#ffffff'}
            roughness={0.15}
            metalness={0.05}
            toneMapped={false}
            onBeforeCompile={(shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                `
                #include <emissivemap_fragment>
                float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.2);
                totalEmissiveRadiance += vec3(0.9, 0.95, 1.0) * (0.45 + fresnel * 2.8);
                `
              );
            }}
          />
        </Sphere>

        {/* Acrosome Cap Tip */}
        <Sphere args={[0.55, 16, 16]} scale={[1.1, 0.8, 0.8]} position={[0.65, 0, 0]}>
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.1}
            metalness={0.1}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </Sphere>

        {/* Translucent Nucleus Inner Core */}
        <Sphere args={[0.38, 12, 12]} position={[0.05, 0, 0]}>
          <meshStandardMaterial
            color="#e0f2fe"
            roughness={0.3}
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </Sphere>
      </group>

      {/* Sperm Flagellum Tail Segments (Instanced Mesh with Pearlescent Glow) */}
      <instancedMesh ref={bodyRef} args={[undefined, undefined, 2000]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial
          roughness={0.15}
          metalness={0.05}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.5);
              totalEmissiveRadiance += vec3(0.9, 0.95, 1.0) * (0.4 + fresnel * 2.2);
              `
            );
          }}
        />
      </instancedMesh>
    </group>
  );
}

function EggCells() {
  const coreMeshRef = useRef<THREE.InstancedMesh>(null);
  const coronaMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!coreMeshRef.current || !coronaMeshRef.current) return;
    const gs = globalGameState.current;
    if (!gs) return;

    const time = state.clock.getElapsedTime();
    let i = 0;
    for (const orbId in gs.orbs) {
      if (localCollectedOrbs.has(orbId)) continue;
      const orb = gs.orbs[orbId];

      // Subtle egg pulse/float
      const floatZ = 0.5 + Math.sin(time * 2.5 + orb.x * 0.3 + orb.y * 0.3) * 0.15;
      const pulseScale = 1.0 + Math.sin(time * 3.0 + orb.x * 0.5) * 0.08;

      // Inner Cytoplasm Core
      dummy.position.set(orb.x, orb.y, floatZ);
      dummy.scale.set(pulseScale, pulseScale, pulseScale);
      dummy.updateMatrix();
      coreMeshRef.current.setMatrixAt(i, dummy.matrix);

      // Outer Zona Pellucida Corona Shell
      const coronaScale = pulseScale * 1.5;
      dummy.scale.set(coronaScale, coronaScale, coronaScale);
      dummy.updateMatrix();
      coronaMeshRef.current.setMatrixAt(i, dummy.matrix);

      colorObj.set(orb.color || '#fb7185');
      coreMeshRef.current.setColorAt(i, colorObj);
      coronaMeshRef.current.setColorAt(i, colorObj);

      i++;
    }

    coreMeshRef.current.count = i;
    coronaMeshRef.current.count = i;

    coreMeshRef.current.instanceMatrix.needsUpdate = true;
    coronaMeshRef.current.instanceMatrix.needsUpdate = true;
    if (coreMeshRef.current.instanceColor) coreMeshRef.current.instanceColor.needsUpdate = true;
    if (coronaMeshRef.current.instanceColor) coronaMeshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      {/* Outer Corona Radiata / Zona Pellucida Gel Halo */}
      <instancedMesh ref={coronaMeshRef} args={[undefined, undefined, 1000]} frustumCulled={false}>
        <sphereGeometry args={[0.9, 20, 20]} />
        <meshStandardMaterial
          roughness={0.1}
          metalness={0.0}
          transparent
          opacity={0.45}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              // Soft outer halo fresnel glow
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.0);
              totalEmissiveRadiance += vec3(1.0, 0.85, 0.95) * (0.6 + fresnel * 2.5);
              `
            );
          }}
        />
      </instancedMesh>

      {/* Inner Egg Cell Vitellus & Golden Nucleolus Core */}
      <instancedMesh ref={coreMeshRef} args={[undefined, undefined, 1000]} castShadow receiveShadow frustumCulled={false}>
        <sphereGeometry args={[0.6, 20, 20]} />
        <meshStandardMaterial
          roughness={0.25}
          metalness={0.05}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              // Cytoplasm granularity & golden nucleus glow
              float fresnel = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 3.0);
              vec3 nucleusColor = vec3(1.0, 0.92, 0.7); // Warm golden nucleolus
              totalEmissiveRadiance += mix(diffuseColor.rgb * 1.8, nucleusColor * 3.2, fresnel);
              `
            );
          }}
        />
      </instancedMesh>
    </group>
  );
}

export function GameScene() {
  const { gameState, playerId, sendPlayerState, sendCollectOrb } = useGameStore();
  const { camera } = useThree();
  const inputs = useRef({ left: false, right: false, boost: false });
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [lightTarget] = useState(() => new THREE.Object3D());

  const localPlayerRef = useRef<{
    active: boolean;
    segments: {x: number, y: number}[];
    score: number;
    currentAngle: number;
    isBoosting: boolean;
    lastSendTime: number;
    invincibleTime: number;
  }>({
    active: false,
    segments: [],
    score: 10,
    currentAngle: 0,
    isBoosting: false,
    lastSendTime: 0,
    invincibleTime: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { 
        inputs.current.left = true; 
        e.preventDefault();
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { 
        inputs.current.right = true; 
        e.preventDefault();
      }
      if (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') { 
        inputs.current.boost = true; 
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') && inputs.current.left) { inputs.current.left = false; }
      if ((e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') && inputs.current.right) { inputs.current.right = false; }
      if ((e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') && inputs.current.boost) { inputs.current.boost = false; }
    };

    const handleBlur = () => {
      inputs.current = { left: false, right: false, boost: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useFrame((state, delta) => {
    const gs = globalGameState.current;
    if (!gs || !playerId) return;
    
    const serverPlayer = gs.players[playerId];
    if (serverPlayer && serverPlayer.state === 'alive') {
      
      // Initialize or re-sync from server if not active or if new spawn occurred
      const needsInit = !localPlayerRef.current.active || 
                        localPlayerRef.current.segments.length === 0 ||
                        (serverPlayer.segments.length > 0 && 
                         localPlayerRef.current.segments[0] &&
                         Math.hypot(localPlayerRef.current.segments[0].x - serverPlayer.segments[0].x,
                                    localPlayerRef.current.segments[0].y - serverPlayer.segments[0].y) > 25);

      if (needsInit && serverPlayer.segments.length > 0) {
        localPlayerRef.current.active = true;
        localPlayerRef.current.segments = serverPlayer.segments.map(s => ({ x: s.x || 0, y: s.y || 0 }));
        localPlayerRef.current.score = serverPlayer.score || 10;
        const validAngle = typeof serverPlayer.currentAngle === 'number' && !isNaN(serverPlayer.currentAngle)
          ? serverPlayer.currentAngle
          : ((serverPlayer as any).angle || 0);
        localPlayerRef.current.currentAngle = validAngle;
        localPlayerRef.current.invincibleTime = 3.0; // 3 seconds spawn protection
      }

      
      if (!localPlayerRef.current.active || localPlayerRef.current.segments.length === 0) return;

      if (isNaN(localPlayerRef.current.currentAngle)) {
        localPlayerRef.current.currentAngle = 0;
      }
      
      // Decrement invincibility timer
      if (localPlayerRef.current.invincibleTime > 0) {
        localPlayerRef.current.invincibleTime -= delta;
      }

      // Local movement logic
      if (inputs.current.left) localPlayerRef.current.currentAngle += TURN_SPEED * delta;
      if (inputs.current.right) localPlayerRef.current.currentAngle -= TURN_SPEED * delta;
      
      localPlayerRef.current.isBoosting = inputs.current.boost && localPlayerRef.current.score > 10;
      const speed = localPlayerRef.current.isBoosting ? BOOST_SPEED : BASE_SPEED;
      
      const head = { ...localPlayerRef.current.segments[0] };
      if (isNaN(head.x)) head.x = 0;
      if (isNaN(head.y)) head.y = 0;

      head.x += Math.cos(localPlayerRef.current.currentAngle) * speed * delta;
      head.y += Math.sin(localPlayerRef.current.currentAngle) * speed * delta;

      // Boundary check
      const boundary = WORLD_SIZE / 2;
      if (head.x < -boundary) head.x = -boundary;
      if (head.x > boundary) head.x = boundary;
      if (head.y < -boundary) head.y = -boundary;
      if (head.y > boundary) head.y = boundary;

      localPlayerRef.current.segments.unshift(head);

      if (localPlayerRef.current.isBoosting) {
        localPlayerRef.current.score -= 2 * delta;
        if (localPlayerRef.current.score <= 10) {
          localPlayerRef.current.isBoosting = false;
          localPlayerRef.current.score = 10;
        }
      }

      const targetLength = Math.floor(localPlayerRef.current.score);
      while (localPlayerRef.current.segments.length > targetLength) {
        localPlayerRef.current.segments.pop();
      }

      // Check orb collisions
      for (const orbId in gs.orbs) {
        if (localCollectedOrbs.has(orbId)) continue;
        const orb = gs.orbs[orbId];
        const dx = head.x - orb.x;
        const dy = head.y - orb.y;
        if (dx * dx + dy * dy < 4) {
          localPlayerRef.current.score += orb.value;
          localCollectedOrbs.add(orbId);
          delete gs.orbs[orbId]; // predict locally
          sendCollectOrb(orbId);
        }
      }

      // Cleanup localCollectedOrbs occasionally
      if (Math.random() < 0.05) {
        for (const id of localCollectedOrbs) {
          if (!gs.orbs[id]) localCollectedOrbs.delete(id);
        }
      }

      // Check player collisions
      if (localPlayerRef.current.invincibleTime <= 0) {
      let collided = false;
      for (const otherId in gs.players) {
        if (otherId === playerId) continue;
        const other = gs.players[otherId];
        if (other.state !== 'alive' || !other.segments) continue;
        for (const seg of other.segments) {
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          if (dx * dx + dy * dy < 2.0) {
            collided = true;
            break;
          }
        }
        if (collided) break;
      }

      if (collided) {
        localPlayerRef.current.active = false;
        if (gs.players[playerId]) {
          gs.players[playerId].state = 'dead';
        }
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'dead'
        });
        return;
        }
      }

      // Overwrite global state for local rendering
      gs.players[playerId].segments = localPlayerRef.current.segments;
      gs.players[playerId].score = localPlayerRef.current.score;
      gs.players[playerId].currentAngle = localPlayerRef.current.currentAngle;
      gs.players[playerId].isBoosting = localPlayerRef.current.isBoosting;

      // Send state to server at 20Hz
      const now = Date.now();
      if (now - localPlayerRef.current.lastSendTime > 50) {
        sendPlayerState({
          segments: localPlayerRef.current.segments,
          score: localPlayerRef.current.score,
          currentAngle: localPlayerRef.current.currentAngle,
          isBoosting: localPlayerRef.current.isBoosting,
          state: 'alive'
        });
        localPlayerRef.current.lastSendTime = now;
      }

      const targetZ = Math.min(45, Math.max(20, 20 + localPlayerRef.current.score * 0.2));
      
      // Smooth camera follow predicted head
      camera.position.x += (head.x - camera.position.x) * 10 * delta;
      camera.position.y += (head.y - camera.position.y) * 10 * delta;
      camera.position.z += (targetZ - camera.position.z) * 4 * delta;
      camera.lookAt(camera.position.x, camera.position.y, 0);

      // Make the directional light follow the camera to keep shadows crisp
      if (lightRef.current) {
        lightRef.current.position.set(camera.position.x + 10, camera.position.y - 10, 30);
        lightTarget.position.set(camera.position.x, camera.position.y, 0);
      }
    } else {
      localPlayerRef.current.active = false;
    }
  });

  if (!gameState) return null;

  return (
    <>
      <ambientLight intensity={0.65} color="#ffd1dc" />
      
      <directionalLight
        ref={lightRef}
        target={lightTarget}
        castShadow
        intensity={2.2}
        color="#fff0f5"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-bias={-0.001}
      />
      <primitive object={lightTarget} />

      {/* Organic Pink Mucosal Tissue Floor */}
      <mesh receiveShadow position={[0, 0, -0.2]}>
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE, 64, 64]} />
        <meshStandardMaterial
          color="#9f1239"
          roughness={0.15}
          metalness={0.05}
          toneMapped={false}
          onBeforeCompile={(shader) => {
            shader.vertexShader = `
              varying vec3 vWorldPos;
              ${shader.vertexShader}
            `.replace(
              '#include <worldpos_vertex>',
              `
              #include <worldpos_vertex>
              vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
              `
            );

            shader.fragmentShader = `
              varying vec3 vWorldPos;
              ${shader.fragmentShader}
            `.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              // Organic mucosal rugae folds & moist tissue texture
              vec2 st = vWorldPos.xy * 0.12;
              float rugae1 = sin(st.x * 1.5 + sin(st.y * 0.9)) * 0.5 + 0.5;
              float rugae2 = cos(st.y * 1.6 - sin(st.x * 1.1)) * 0.5 + 0.5;
              float organicFold = pow(rugae1 * rugae2, 0.75);

              // Deep velvet-pink and rich rose mucosal shading
              vec3 deepMucosa = vec3(0.52, 0.05, 0.22);
              vec3 brightMucosa = vec3(0.95, 0.22, 0.48);
              vec3 tissueColor = mix(deepMucosa, brightMucosa, organicFold);

              // Glistening wet specular highlights
              float wetSpot = pow(max(0.0, sin(st.x * 2.8) * cos(st.y * 2.8)), 8.0);
              vec3 wetSheen = vec3(1.0, 0.85, 0.95) * wetSpot * 0.6;

              totalEmissiveRadiance += tissueColor * 0.65 + wetSheen;
              `
            );
          }}
        />
      </mesh>

      <Grid
        position={[0, 0, -0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[WORLD_SIZE, WORLD_SIZE]}
        cellSize={1}
        cellThickness={0.35}
        cellColor="#f43f5e"
        sectionSize={10}
        sectionThickness={0.9}
        sectionColor="#be123c"
        fadeDistance={100}
        fadeStrength={0.7}
      />

      <EggCells />

      {Object.values(gameState.players).map((player) => {
        if (player.state !== 'alive' || player.segments.length === 0) return null;
        return (
          <SpermCell
            key={player.id}
            playerId={player.id}
            color={player.color}
            isLocal={player.id === playerId}
          />
        );
      })}
    </>
  );
}
