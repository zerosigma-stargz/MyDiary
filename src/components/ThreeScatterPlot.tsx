import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DiaryEntry } from '../types/diary';
import { getEmotionByEmoji } from '../constants/emotions';
import {
  RotateCcw,
  Share2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Lightbulb,
  BookOpen,
  Compass,
  Sparkles,
} from 'lucide-react';

interface ThreeScatterPlotProps {
  entries: DiaryEntry[];
  selectedDate: string;
  onSelectEntry: (entry: DiaryEntry) => void;
  onOpenEditorForDate: (date: string) => void;
}

type FilterMode = 'all' | 'recent7' | 'positive' | 'ideas';

export const ThreeScatterPlot: React.FC<ThreeScatterPlotProps> = ({
  entries,
  selectedDate,
  onSelectEntry,
  onOpenEditorForDate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showConnections, setShowConnections] = useState<boolean>(true);
  const [isHudCollapsed, setIsHudCollapsed] = useState<boolean>(false);
  const [inspectedEntry, setInspectedEntry] = useState<DiaryEntry | null>(null);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nodesGroupRef = useRef<THREE.Group | null>(null);
  const linesGroupRef = useRef<THREE.Group | null>(null);
  const nodeMeshMap = useRef<Map<THREE.Object3D, DiaryEntry>>(new Map());
  const hoveredObjectRef = useRef<THREE.Group | null>(null);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterMode === 'all') return true;
      if (filterMode === 'recent7') {
        const d = new Date(entry.date);
        const refD = new Date('2026-11-08');
        const diffDays = Math.abs((refD.getTime() - d.getTime()) / (1000 * 3600 * 24));
        return diffDays <= 7;
      }
      if (filterMode === 'positive') {
        const val = entry.aiAnalysis?.valence ?? 0.5;
        return val > 0.3;
      }
      if (filterMode === 'ideas') {
        return (entry.ideas && entry.ideas.length > 0) || (entry.aiAnalysis?.ideationDepth ?? 0) > 0.6;
      }
      return true;
    });
  }, [entries, filterMode]);

  useEffect(() => {
    if (inspectedEntry) {
      const updated = entries.find((e) => e.id === inspectedEntry.id);
      if (updated) setInspectedEntry(updated);
    }
  }, [entries]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Initialize serene porcelain-white scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Clean calm oyster white
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.016);
    sceneRef.current = scene;

    // Camera - Responsive initial distance based on screen aspect
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;
    const isMobileAspect = width < 640 || width / height < 1.0;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, isMobileAspect ? 4.5 : 3.5, isMobileAspect ? 24 : 18);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Environment reflection using RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // OrbitControls centered directly at the nodes' center (0, 0.5, 0)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 45;
    controls.minDistance = 6;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    // Studio Daylight Lighting Rig (Warm soft key + cool ambient sky + rim)
    const keyLight = new THREE.DirectionalLight(0xfffdfa, 2.0);
    keyLight.position.set(12, 22, 16);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 1.4);
    scene.add(hemiLight);

    const softFill = new THREE.DirectionalLight(0xf1f5f9, 0.8);
    softFill.position.set(-10, 10, -10);
    scene.add(softFill);

    // Delicate clean grid for architectural spatial orientation
    const gridHelper = new THREE.GridHelper(30, 15, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = -4;
    scene.add(gridHelper);

    // Subtle atmospheric dust (soft warm grey particles)
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 180;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 40;
      starPositions[i + 1] = (Math.random() - 0.5) * 22;
      starPositions[i + 2] = (Math.random() - 0.5) * 30;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.1,
      transparent: true,
      opacity: 0.35,
    });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // Node & Lines groups
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    const linesGroup = new THREE.Group();
    scene.add(linesGroup);
    linesGroupRef.current = linesGroup;

    // Raycasting for interactive node inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children, true);

      if (intersects.length > 0) {
        let rootObj = intersects[0].object;
        while (rootObj.parent && rootObj.parent !== nodesGroup) {
          rootObj = rootObj.parent;
        }

        if (hoveredObjectRef.current !== rootObj) {
          if (hoveredObjectRef.current) {
            hoveredObjectRef.current.scale.set(1, 1, 1);
          }
          hoveredObjectRef.current = rootObj as THREE.Group;
          hoveredObjectRef.current.scale.set(1.2, 1.2, 1.2);
          renderer.domElement.style.cursor = 'pointer';
        }
      } else {
        if (hoveredObjectRef.current) {
          hoveredObjectRef.current.scale.set(1, 1, 1);
          hoveredObjectRef.current = null;
        }
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children, true);

      if (intersects.length > 0) {
        let rootObj = intersects[0].object;
        while (rootObj.parent && rootObj.parent !== nodesGroup) {
          rootObj = rootObj.parent;
        }
        const matched = nodeMeshMap.current.get(rootObj);
        if (matched) {
          setInspectedEntry(matched);
          onSelectEntry(matched);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    window.addEventListener('resize', handleResize);

    // Responsive ResizeObserver for smooth mobile/desktop layout switches & split panel resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && camera && renderer) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Render Loop with modern THREE.Timer (replacing deprecated THREE.Clock)
    let frameId = 0;
    const timer = new (THREE as any).Timer();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      timer.update();
      const elapsedTime = timer.getElapsed();

      // Subtle rotation for calming presence
      nodesGroup.children.forEach((groupObj, idx) => {
        const aura = groupObj.getObjectByName('aura');
        if (aura) {
          aura.rotation.x = elapsedTime * 0.5 + idx * 0.4;
          aura.rotation.y = elapsedTime * 0.4 + idx * 0.2;
        }
        const satellites = groupObj.getObjectByName('satellites');
        if (satellites) {
          satellites.rotation.y = elapsedTime * 0.8 + idx;
        }
      });

      starPoints.rotation.y = elapsedTime * 0.01;

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
    };
  }, []);

  // Re-build 3D Scatter Nodes & Connecting Resonance Lines
  useEffect(() => {
    const nodesGroup = nodesGroupRef.current;
    const linesGroup = linesGroupRef.current;
    if (!nodesGroup || !linesGroup) return;

    while (nodesGroup.children.length > 0) {
      const obj = nodesGroup.children[0];
      nodesGroup.remove(obj);
      if (obj instanceof THREE.Group) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material?.dispose();
          }
        });
      }
    }

    while (linesGroup.children.length > 0) {
      const obj = linesGroup.children[0];
      linesGroup.remove(obj);
      if (obj instanceof THREE.Line || obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if ('material' in obj && obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    }

    nodeMeshMap.current.clear();
    if (filteredEntries.length === 0) return;

    const nodePositions: { entry: DiaryEntry; pos: THREE.Vector3; color: THREE.Color }[] = [];

    // Calculate dynamic day bounds to center the scatter plot cluster perfectly at origin X = 0
    const dayNumbers = filteredEntries.map((e) => {
      const parts = e.date.split('-');
      return parseInt(parts[2] || '1', 10);
    });
    const minDay = dayNumbers.length > 0 ? Math.min(...dayNumbers) : 1;
    const maxDay = dayNumbers.length > 0 ? Math.max(...dayNumbers) : 8;
    const avgDay = (minDay + maxDay) / 2;
    const daySpan = Math.max(maxDay - minDay, 1);
    // Spacing spreads entries harmoniously across the centered field
    const xSpacing = Math.min(1.5, 13 / daySpan);

    filteredEntries.forEach((entry) => {
      const dateParts = entry.date.split('-');
      const dayNum = parseInt(dateParts[2] || '1', 10);
      const posX = (dayNum - avgDay) * xSpacing;

      const valence = entry.aiAnalysis?.valence ?? 0.5;
      const energy = entry.aiAnalysis?.energy ?? 0.6;
      const posY = valence * 2.8 + (energy - 0.5) * 1.2;

      const ideationDepth = entry.aiAnalysis?.ideationDepth ?? (entry.ideas?.length ? 0.75 : 0.3);
      const posZ = (ideationDepth - 0.5) * 7;

      const emotionDef = getEmotionByEmoji(entry.primaryMood);
      const baseColor = new THREE.Color(emotionDef.color);

      // Composite Procedural Node (Ceramic / Frosted Glass Aesthetic)
      const nodeComposite = new THREE.Group();
      nodeComposite.position.set(posX, posY, posZ);

      // Part 1: Crystalline Porcelain Pearl Core
      const coreGeo = new THREE.IcosahedronGeometry(0.55, 1);
      const coreMat = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.15,
        roughness: 0.18,
        metalness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.name = 'core';
      coreMesh.castShadow = true;
      nodeComposite.add(coreMesh);

      // Part 2: Delicate Calming Halo Ring
      const auraGeo = new THREE.TorusGeometry(0.85, 0.025, 12, 36);
      const auraMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(emotionDef.color).lerp(new THREE.Color(0xffffff), 0.5),
        roughness: 0.3,
        metalness: 0.4,
      });
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      auraMesh.name = 'aura';
      nodeComposite.add(auraMesh);

      // Part 3: Dual Satellite Pearls
      const satellitesGroup = new THREE.Group();
      satellitesGroup.name = 'satellites';

      const satGeo1 = new THREE.SphereGeometry(0.1, 12, 12);
      const satMat1 = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.3,
      });
      const satMesh1 = new THREE.Mesh(satGeo1, satMat1);
      satMesh1.position.set(1.05, 0.15, 0);
      satellitesGroup.add(satMesh1);

      const satGeo2 = new THREE.OctahedronGeometry(0.09, 0);
      const satMesh2 = new THREE.Mesh(satGeo2, satMat1);
      satMesh2.position.set(-1.0, -0.2, 0.3);
      satellitesGroup.add(satMesh2);
      nodeComposite.add(satellitesGroup);

      // Part 4: Soft Ground Contact Shadow
      const shadowGeo = new THREE.RingGeometry(0.1, 0.8, 24);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = Math.PI / 2;
      shadowMesh.position.y = -0.7;
      nodeComposite.add(shadowMesh);

      // Active Date Beacon indicator
      if (entry.date === selectedDate) {
        const beaconGeo = new THREE.RingGeometry(1.15, 1.3, 32);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: 0x2563eb,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.rotation.x = Math.PI / 2;
        nodeComposite.add(beacon);
      }

      nodesGroup.add(nodeComposite);
      nodeMeshMap.current.set(nodeComposite, entry);
      nodePositions.push({ entry, pos: new THREE.Vector3(posX, posY, posZ), color: baseColor });
    });

    // Part 5: Procedural Serene Filament Connections
    if (showConnections && nodePositions.length > 1) {
      for (let i = 0; i < nodePositions.length; i++) {
        for (let j = i + 1; j < nodePositions.length; j++) {
          const a = nodePositions[i];
          const b = nodePositions[j];

          const sameMood = a.entry.primaryMood === b.entry.primaryMood;
          const bothHaveIdeas = (a.entry.ideas?.length || 0) > 0 && (b.entry.ideas?.length || 0) > 0;
          const dist = a.pos.distanceTo(b.pos);

          if ((sameMood || bothHaveIdeas) && dist < 14) {
            const mid = new THREE.Vector3().addVectors(a.pos, b.pos).multiplyScalar(0.5);
            mid.y += (Math.random() - 0.2) * 1.2;

            const curve = new THREE.CatmullRomCurve3([a.pos, mid, b.pos]);
            const points = curve.getPoints(24);
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

            const lineColor = sameMood ? a.color : new THREE.Color(0x64748b);
            const lineMat = new THREE.LineBasicMaterial({
              color: lineColor,
              transparent: true,
              opacity: sameMood ? 0.35 : 0.2,
              linewidth: 1,
            });

            const line = new THREE.Line(lineGeo, lineMat);
            linesGroup.add(line);
          }
        }
      }
    }
  }, [filteredEntries, showConnections, selectedDate]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const container = mountRef.current;
    const isMobileAspect = !container || container.clientWidth < 640 || container.clientWidth / container.clientHeight < 1.0;
    cameraRef.current.position.set(0, isMobileAspect ? 4.5 : 3.5, isMobileAspect ? 24 : 18);
    controlsRef.current.target.set(0, 0.5, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full min-h-[460px] lg:min-h-full flex flex-col bg-[#f8fafc] overflow-hidden select-none">
      {/* 3D Scene Viewport (100% Unobstructed Center) */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top Left Spec Badge — Sleek & Compact Porcelain Badge */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 pointer-events-auto flex flex-col gap-1.5">
        <div className="bg-white/95 text-slate-800 border border-slate-200/90 rounded-2xl px-3 py-2 shadow-xs max-w-[240px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-700"></span>
            <h3 className="text-xs font-bold tracking-tight text-slate-900">
              Jejak Riwayat 3D Bulanan
            </h3>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
            X: Waktu • Y: Emosi • Z: Ide
          </p>
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
            <span className="font-semibold text-slate-700">{filteredEntries.length} Simpul</span>
            <span>•</span>
            <span>{showConnections ? 'Resonansi Aktif' : 'Resonansi Hening'}</span>
          </div>
        </div>
      </div>

      {/* Top Right Reset Camera Button */}
      <div className="absolute top-4 right-4 z-10 pointer-events-auto flex items-center gap-2">
        <button
          onClick={handleResetCamera}
          title="Kembali ke Sudut Awal"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
          <span>Reset Sudut</span>
        </button>
      </div>

      {/* Inspected Node Card — Clean White Editorial Card */}
      {inspectedEntry && (
        <div className="absolute top-20 right-4 max-w-sm w-[90%] sm:w-84 z-20 pointer-events-auto bg-white/98 border border-slate-200 text-slate-800 rounded-3xl p-4 shadow-xl animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> {inspectedEntry.date}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                {inspectedEntry.title || 'Catatan Harian'}
              </h4>
            </div>
            <button
              onClick={() => setInspectedEntry(null)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-xs font-bold transition"
            >
              ✕
            </button>
          </div>

          {/* Primary Mood & Percentages */}
          <div className="mt-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold text-slate-800">
                <span className="text-xl">{inspectedEntry.primaryMood}</span>
                <span>{inspectedEntry.primaryMoodLabel}</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-600">
                {inspectedEntry.emotionPercentages?.[inspectedEntry.primaryMoodLabel] || 70}%
              </span>
            </div>

            {/* Emotional Breakdown Bar */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {Object.entries(inspectedEntry.emotionPercentages || {}).map(([emotionName, pct]) => (
                <span
                  key={emotionName}
                  className="text-[10px] bg-white text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded-full font-medium"
                >
                  {emotionName}: {pct}%
                </span>
              ))}
            </div>
          </div>

          {/* AI Insights & Affirmations */}
          {inspectedEntry.aiAnalysis && (
            <div className="mt-3 text-xs space-y-2">
              <div className="bg-[#faf5ff] border border-purple-100 rounded-2xl p-3">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                  Afirmasi Perasaan
                </span>
                <p className="text-[11px] text-purple-900 italic mt-1 leading-relaxed line-clamp-2">
                  "{inspectedEntry.aiAnalysis.affirmation}"
                </p>
              </div>

              <div className="bg-[#f0fdfa] border border-teal-100 rounded-2xl p-3">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                  Pemaknaan Ide & Gagasan
                </span>
                <p className="text-[11px] text-slate-700 mt-1 leading-relaxed line-clamp-2">
                  {inspectedEntry.aiAnalysis.ideaMeaning}
                </p>
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="mt-3.5 pt-2 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                onOpenEditorForDate(inspectedEntry.date);
                setInspectedEntry(null);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buka di Lembar Diary</span>
            </button>
          </div>
        </div>
      )}

      {/* Unified Ergonomic Bottom Control Dock — Clean White Porcelain Surface */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-[820px] pointer-events-auto transition-transform duration-300">
        <div className="flex flex-col items-center">
          {/* Collapsible toggle tab */}
          <button
            onClick={() => setIsHudCollapsed(!isHudCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/95 hover:bg-slate-50 text-slate-600 border border-slate-200 border-b-0 rounded-t-xl text-[11px] font-semibold shadow-sm transition"
          >
            {isHudCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                <span>Tampilkan Panel 3D</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span>Sembunyikan Panel (Mode Luas)</span>
              </>
            )}
          </button>

          {/* Main Horizontal Dock */}
          {!isHudCollapsed && (
            <div className="w-full bg-white/98 border border-slate-200/90 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 text-slate-700">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline uppercase tracking-wider">
                  Filter:
                </span>
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    filterMode === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Semua Bulan (Nov)
                </button>
                <button
                  onClick={() => setFilterMode('recent7')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    filterMode === 'recent7'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  7 Hari Terakhir
                </button>
                <button
                  onClick={() => setFilterMode('positive')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterMode === 'positive'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>🌟</span>
                  <span>Positif & Berenergi</span>
                </button>
                <button
                  onClick={() => setFilterMode('ideas')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterMode === 'ideas'
                      ? 'bg-indigo-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <span>💡</span>
                  <span>Ide & Gagasan</span>
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConnections(!showConnections)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    showConnections
                      ? 'bg-slate-100 border-slate-300 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Jejaring Keterhubungan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
