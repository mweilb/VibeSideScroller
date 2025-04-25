// src/utils.ts

import type { GameObject } from "./types";

export function rectsCollide(a: GameObject, b: GameObject): boolean {
  return (
    a.pos.x < b.pos.x + b.size.x &&
    a.pos.x + a.size.x > b.pos.x &&
    a.pos.y < b.pos.y + b.size.y &&
    a.pos.y + a.size.y > b.pos.y
  );
}
