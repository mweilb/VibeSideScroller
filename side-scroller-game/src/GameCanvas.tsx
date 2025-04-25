// src/GameCanvas.tsx
import React, { useRef, useEffect, useState } from "react";
import yaml from "js-yaml";

// Dynamically import all YAML files in src/
const yamlFiles = import.meta.glob("./*.yaml", { as: "raw" });

import { Vec2, GameObject } from "./types";
import {
  PLAYER_SIZE,
  ENEMY_SIZE,
  PLATFORM_SIZE,
  GROUND_HEIGHT,
  BASE_CANVAS_WIDTH,
  BASE_CANVAS_HEIGHT,
  platformData,
  enemyData,
  projectileSpeed,
  projectileCooldown,
  FLAGPOLE_WIDTH,
  FLAGPOLE_HEIGHT,
} from "./constants";
import { rectsCollide } from "./utils";

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [health, setHealth] = useState(3);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  // State for YAML selection and data
  const [yamlFileNames] = useState(() =>
    Object.keys(yamlFiles).map((path) => path.replace("./", ""))
  );
  // Show base name (without extension) in dropdown
  const yamlBaseNames = yamlFileNames.map((name) => name.replace(/\.yaml$/, ""));
  const [selectedYaml, setSelectedYaml] = useState(yamlFileNames[0]);
  const [gameData, setGameData] = useState<any>(null);
  const [levelIndex, setLevelIndex] = useState(0);

  // Store display names for each YAML file (first level's name)
  const [yamlDisplayNames, setYamlDisplayNames] = useState<string[]>([]);

  // Load all YAML files and extract first level name for dropdown
  useEffect(() => {
    const loadNames = async () => {
      const names: string[] = [];
      for (const fileName of yamlFileNames) {
        try {
          const raw = await yamlFiles[`./${fileName}`]();
          const data = yaml.load(raw) as any;
          // Use first level's name, fallback to file base name
          const levelName = data?.levels?.[0]?.name || fileName.replace(/\.yaml$/, "");
          names.push(levelName);
        } catch {
          names.push(fileName.replace(/\.yaml$/, ""));
        }
      }
      setYamlDisplayNames(names);
    };
    loadNames();
    // Only run when file list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yamlFileNames]);

  // Load YAML file when selection changes
  useEffect(() => {
    if (!selectedYaml) return;
    const loadYaml = async () => {
      const raw = await yamlFiles[`./${selectedYaml}`]();
      setGameData(yaml.load(raw));
      setLevelIndex(0); // Reset level on file change
    };
    loadYaml();
  }, [selectedYaml]);

  useEffect(() => {
    // Load default YAML on mount if not already loaded
    if (!gameData && selectedYaml) {
      const loadYaml = async () => {
        const raw = await yamlFiles[`./${selectedYaml}`]();
        setGameData(yaml.load(raw));
      };
      loadYaml();
    }
  }, [gameData, selectedYaml]);

  // Update currentTime every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleResize() {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Helper: safely run game loop only if ctx is not null
    function safeGameLoop() {
      if (!ctx) return;
      gameLoop();
    }

    // Game objects
    if (!gameData) return;

    // Player from YAML
    const player: GameObject = {
      ...gameData.player,
      pos: {
        x: gameData.player.pos.x,
        y: gameData.player.pos.y,
      },
      size: {
        x: gameData.player.size.x,
        y: gameData.player.size.y,
      },
      velocity: { ...gameData.player.velocity },
    };

    const platforms: GameObject[] = platformData.map((p, i) => ({
      pos: { x: p.x, y: p.y },
      size: i === 3 ? { x: 400, y: PLATFORM_SIZE.y } : { ...PLATFORM_SIZE },
      color: "#a67c52",
    }));

    const ground: GameObject = {
      pos: { x: 0, y: BASE_CANVAS_HEIGHT - GROUND_HEIGHT },
      size: { x: BASE_CANVAS_WIDTH, y: GROUND_HEIGHT },
      color: "#3cb371",
    };

    const flagpole: GameObject = {
      pos: { x: BASE_CANVAS_WIDTH - 80, y: BASE_CANVAS_HEIGHT - GROUND_HEIGHT - FLAGPOLE_HEIGHT },
      size: { x: FLAGPOLE_WIDTH, y: FLAGPOLE_HEIGHT },
      color: "#fff"
    };

    // Enemies from YAML for current level
    const levelEnemies = gameData.levels?.[levelIndex]?.enemies ?? [];
    const enemies: GameObject[] = (levelEnemies as any[]).map((e) => {
      // Find the platform under this enemy's x position
      const plat = platforms.find(
        (p) =>
          e.pos.x + e.size.x > p.pos.x &&
          e.pos.x < p.pos.x + p.size.x
      );
      const y = plat ? plat.pos.y - e.size.y : e.pos.y;
      return {
        ...e,
        type: e.type ?? "mushroom",
        capColor: e.capColor ?? "#d22",
        stemColor: e.stemColor ?? "#fbe7b2",
        dotColor: e.dotColor ?? "#fff",
        speed: e.speed ?? 1.2,
        pos: { x: e.pos.x, y },
        size: { x: e.size.x, y: e.size.y },
        alive: e.alive,
        velocity: { x: e.velocity?.x ?? e.speed ?? 1.2, y: 0 },
      };
    });

    let projectiles: GameObject[] = [];
    const enemyTimers = enemies.map(() =>
      Math.floor(Math.random() * projectileCooldown)
    );

    // Input
    const keys = { left: false, right: false, up: false };
    let isOnGround = false;
    let canJump = true;
    const speed = 4;
    const gravity = 0.6;
    const jumpVel = -12;

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
      if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW")
        keys.up = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
      if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW")
        keys.up = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Game loop
    let animationId: number;
    function gameLoop() {
      if (!ctx) return;
      // Physics
      player.velocity!.x = 0;
      if (keys.left) player.velocity!.x = -speed;
      if (keys.right) player.velocity!.x = speed;

      // Apply gravity
      player.velocity!.y += gravity;

      // Move horizontally
      player.pos.x += player.velocity!.x;

      // Horizontal bounds
      if (player.pos.x < 0) player.pos.x = 0;
      if (player.pos.x + player.size.x > BASE_CANVAS_WIDTH)
        player.pos.x = BASE_CANVAS_WIDTH - player.size.x;

      // Platform collision (vertical)
      isOnGround = false;
      // Ground
      if (
        player.pos.y + player.size.y >= ground.pos.y &&
        player.pos.x + player.size.x > ground.pos.x &&
        player.pos.x < ground.pos.x + ground.size.x
      ) {
        player.pos.y = ground.pos.y - player.size.y;
        player.velocity!.y = 0;
        isOnGround = true;
        canJump = true;
      }
      // Platforms
      for (const plat of platforms) {
        if (
          player.pos.x + player.size.x > plat.pos.x &&
          player.pos.x < plat.pos.x + plat.size.x &&
          player.pos.y + player.size.y <= plat.pos.y + 10 &&
          player.pos.y + player.size.y + player.velocity!.y >= plat.pos.y
        ) {
          player.pos.y = plat.pos.y - player.size.y;
          player.velocity!.y = 0;
          isOnGround = true;
          canJump = true;
        }
      }

      // Jump
      if (keys.up && isOnGround && canJump) {
        player.velocity!.y = jumpVel;
        canJump = false;
      }
      if (!keys.up && isOnGround) {
        canJump = true;
      }

      // Apply vertical velocity
      player.pos.y += player.velocity!.y;

      // Player stomps enemy
      for (const enemy of enemies) {
        if (
          enemy.alive &&
          rectsCollide(player, enemy) &&
          player.velocity!.y > 0 && // falling
          player.pos.y + player.size.y - enemy.pos.y < enemy.size.y * 0.5 // from above
        ) {
          if (enemy.type === "boss") {
            enemy.health = (enemy.health ?? 20) - 1;
            if (enemy.health <= 0) {
              enemy.alive = false;
            }
          } else {
            enemy.alive = false;
          }
          player.velocity!.y = jumpVel * 0.7; // bounce up
        }
      }

      // Enemy movement and firing logic
      enemies.forEach((enemy, i) => {
        if (!enemy.alive) return;
        // Move enemy left/right on platform
        const plat = platforms.find(
          (p) =>
            enemy.pos.x + enemy.size.x > p.pos.x &&
            enemy.pos.x < p.pos.x + p.size.x &&
            Math.abs(enemy.pos.y + enemy.size.y - p.pos.y) < 2
        );
        if (plat) {
          enemy.pos.x += enemy.velocity!.x;
          // Reverse direction at platform edges
          if (
            enemy.pos.x <= plat.pos.x ||
            enemy.pos.x + enemy.size.x >= plat.pos.x + plat.size.x
          ) {
            enemy.velocity!.x *= -1;
            // Clamp to platform
            if (enemy.pos.x < plat.pos.x) enemy.pos.x = plat.pos.x;
            if (enemy.pos.x + enemy.size.x > plat.pos.x + plat.size.x)
              enemy.pos.x = plat.pos.x + plat.size.x - enemy.size.x;
          }
        }
        enemyTimers[i]--;
        if (enemyTimers[i] <= 0) {
          // Fire projectile toward player
          const dirX = player.pos.x + player.size.x / 2 - (enemy.pos.x + enemy.size.x / 2);
          const dirY = player.pos.y + player.size.y / 2 - (enemy.pos.y + enemy.size.y / 2);
          const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
          const vel = { x: (dirX / len) * projectileSpeed, y: (dirY / len) * projectileSpeed };
          projectiles.push({
            pos: { x: enemy.pos.x + enemy.size.x / 2 - 8, y: enemy.pos.y + enemy.size.y / 2 - 8 },
            size: { x: 16, y: 16 },
            color: "#fff",
            velocity: vel,
          });
          enemyTimers[i] = projectileCooldown + Math.floor(Math.random() * 60);
        }
      });

      // Move projectiles and check collision with player
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.pos.x += proj.velocity!.x;
        proj.pos.y += proj.velocity!.y;
        // Remove if out of bounds
        if (
          proj.pos.x < -32 ||
          proj.pos.x > BASE_CANVAS_WIDTH + 32 ||
          proj.pos.y < -32 ||
          proj.pos.y > BASE_CANVAS_HEIGHT + 32
        ) {
          projectiles.splice(i, 1);
          continue;
        }
        // Collision with player
        if (rectsCollide(proj, player)) {
          projectiles.splice(i, 1);
          setHealth((h) => {
            if (h > 1) {
              player.pos.x = 60;
              player.pos.y = BASE_CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE.y;
              player.velocity = { x: 0, y: 0 };
              return h - 1;
            } else {
              player.pos.x = 60;
              player.pos.y = BASE_CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE.y;
              player.velocity = { x: 0, y: 0 };
              return 3;
            }
          });
        }
      }

      // Camera logic: center player unless near edges
      // Horizontal zoom, but vertical always fits viewport
      const ZOOM = 2; // 2x zoom horizontally
      const viewHeight = BASE_CANVAS_HEIGHT;
      const viewWidth = canvasSize.width * (BASE_CANVAS_HEIGHT / canvasSize.height);
      let cameraX = player.pos.x + player.size.x / 2 - viewWidth * 0.25;
      cameraX = Math.max(0, Math.min(cameraX, BASE_CANVAS_WIDTH - viewWidth));

      // Handle scaling for responsive canvas
      canvas!.width = canvasSize.width;
      canvas!.height = canvasSize.height;
      ctx.setTransform(
        canvasSize.width / viewWidth,
        0,
        0,
        canvasSize.height / viewHeight,
        0,
        0
      );
      ctx.clearRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);

      ctx.save();
      ctx.translate(-cameraX, 0);

      // Background
      const themeColor =
        gameData.levels?.[levelIndex]?.themeColor || "#22283a";
      ctx.fillStyle = themeColor;
      ctx.fillRect(cameraX, 0, viewWidth, BASE_CANVAS_HEIGHT);

      // Ground as vertical green strips
      const stripCount = 10;
      const greenStrips = ["#3cb371", "#2e8b57", "#43a047", "#388e3c", "#66bb6a"];
      const stripWidth = ground.size.x / stripCount;
      for (let i = 0; i < stripCount; i++) {
        ctx.fillStyle = greenStrips[i % greenStrips.length];
        ctx.fillRect(
          ground.pos.x + i * stripWidth,
          ground.pos.y,
          stripWidth,
          ground.size.y
        );
      }

      // Platforms
      for (const plat of platforms) {
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.pos.x, plat.pos.y, plat.size.x, plat.size.y);
      }

      // Enemies
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (enemy.type === "mushroom") {
          // Draw mushroom: ellipse cap + rectangle stem + dots, all data-driven
          const capHeight = enemy.size.y * 0.6;
          const stemHeight = enemy.size.y * 0.4;
          // Cap
          ctx.fillStyle = enemy.capColor ?? "#d22";
          ctx.beginPath();
          ctx.ellipse(
            enemy.pos.x + enemy.size.x / 2,
            enemy.pos.y + capHeight / 2,
            enemy.size.x / 2,
            capHeight / 2,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          // Stem
          ctx.fillStyle = enemy.stemColor ?? "#fbe7b2";
          ctx.fillRect(
            enemy.pos.x + enemy.size.x * 0.25,
            enemy.pos.y + capHeight,
            enemy.size.x * 0.5,
            stemHeight
          );
          // Dots
          ctx.fillStyle = enemy.dotColor ?? "#fff";
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(
              enemy.pos.x + enemy.size.x * (0.3 + 0.2 * i),
              enemy.pos.y + capHeight * 0.6,
              enemy.size.x * 0.09,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        } else if (enemy.type === "boss") {
          // Boss rendering: large rectangle + health bar
          ctx.fillStyle = enemy.color ?? "#222";
          ctx.fillRect(enemy.pos.x, enemy.pos.y, enemy.size.x, enemy.size.y);
          // Face
          ctx.fillStyle = "#fff";
          ctx.fillRect(enemy.pos.x + enemy.size.x * 0.25, enemy.pos.y + enemy.size.y * 0.3, 12, 12);
          ctx.fillRect(enemy.pos.x + enemy.size.x * 0.65, enemy.pos.y + enemy.size.y * 0.3, 12, 12);
          ctx.fillStyle = "#f00";
          ctx.fillRect(enemy.pos.x + enemy.size.x * 0.35, enemy.pos.y + enemy.size.y * 0.7, 28, 8);
          // Health bar
          ctx.fillStyle = "#000";
          ctx.fillRect(enemy.pos.x, enemy.pos.y - 16, enemy.size.x, 10);
          ctx.fillStyle = "#0f0";
          const hp = enemy.health ?? 20;
          ctx.fillRect(enemy.pos.x, enemy.pos.y - 16, (enemy.size.x * hp) / 20, 10);
        } else {
          // Default: colored rectangle
          ctx.fillStyle = enemy.color ?? "#e74c3c";
          ctx.fillRect(enemy.pos.x, enemy.pos.y, enemy.size.x, enemy.size.y);
        }
      }

      // Projectiles
      for (const proj of projectiles) {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(
          proj.pos.x + proj.size.x / 2,
          proj.pos.y + proj.size.y / 2,
          proj.size.x / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Flagpole
      ctx.fillStyle = flagpole.color;
      ctx.fillRect(flagpole.pos.x, flagpole.pos.y, flagpole.size.x, flagpole.size.y);
      // Flag
      ctx.fillStyle = "#ff0";
      ctx.beginPath();
      ctx.moveTo(flagpole.pos.x + flagpole.size.x, flagpole.pos.y + 20);
      ctx.lineTo(flagpole.pos.x + flagpole.size.x + 40, flagpole.pos.y + 30);
      ctx.lineTo(flagpole.pos.x + flagpole.size.x, flagpole.pos.y + 40);
      ctx.closePath();
      ctx.fill();

      // Player
      ctx.fillStyle = player.color;
      ctx.fillRect(player.pos.x, player.pos.y, player.size.x, player.size.y);

      ctx.restore();

      // Health UI (fixed to screen)
      ctx.font = "24px Arial";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.fillText(`Health: ${health}`, 20, 40);

      // Check for flagpole collision
      if (rectsCollide(player, flagpole)) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = "48px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText("Level Complete!", canvasSize.width / 2, canvasSize.height / 2);
        ctx.restore();
        return; // Stop the game loop
      }

      animationId = requestAnimationFrame(gameLoop);
    }

    animationId = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameData, health, canvasSize, levelIndex]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 16,
          color: "#fff",
          fontSize: 20,
          fontFamily: "monospace",
          background: "rgba(34, 40, 58, 0.7)",
          padding: "2px 10px",
          borderRadius: 6,
          zIndex: 10,
          pointerEvents: "none",
          userSelect: "none"
        }}
      >
        {currentTime}
      </div>
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 16,
          zIndex: 11,
          background: "rgba(34, 40, 58, 0.9)",
          padding: "4px 10px",
          borderRadius: 6,
        }}
      >
        <label
          htmlFor="game-data-select"
          style={{ color: "#fff", fontFamily: "monospace", marginRight: 8 }}
        >
          Game Data:
        </label>
        <select
          id="game-data-select"
          value={selectedYaml}
          onChange={(e) => setSelectedYaml(e.target.value)}
          style={{ fontSize: 16, fontFamily: "monospace" }}
        >
          {yamlFileNames.map((name, idx) => (
            <option key={name} value={name}>
              {yamlDisplayNames[idx] || yamlBaseNames[idx]}
            </option>
          ))}
        </select>
      </div>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: "block", background: "#22283a", width: "100vw", height: "100vh" }}
        tabIndex={0}
      />
    </div>
  );
};

export default GameCanvas;
