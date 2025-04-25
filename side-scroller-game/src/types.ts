// src/types.ts

export type Vec2 = { x: number; y: number };

export type GameObject = {
  pos: Vec2;
  size: Vec2;
  color: string;
  velocity?: Vec2;
  alive?: boolean;
  type?: string;
  capColor?: string;
  stemColor?: string;
  dotColor?: string;
  speed?: number;
  health?: number;
};
