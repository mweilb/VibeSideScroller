// src/constants.ts

import type { Vec2 } from "./types";

export const PLAYER_SIZE: Vec2 = { x: 40, y: 80 };
export const ENEMY_SIZE: Vec2 = { x: 40, y: 40 };
export const PLATFORM_SIZE: Vec2 = { x: 160, y: 20 };
export const GROUND_HEIGHT = 40;
export const BASE_CANVAS_WIDTH = 960 * 5;
export const BASE_CANVAS_HEIGHT = 540;

export const platformData = [
  { x: 240, y: 340 },
  { x: 560, y: 260 },
  { x: 880, y: 340 },
  { x: 1200, y: 180 },
];

export const enemyData = [
  { x: 400, y: 300 },
  { x: 800, y: 220 },
  { x: 1100, y: 300 },
];

export const projectileSpeed = 6;
export const projectileCooldown = 120; // frames

export const FLAGPOLE_WIDTH = 20;
export const FLAGPOLE_HEIGHT = 200;
