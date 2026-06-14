"use client";

import { useEffect, useRef } from "react";
import { useAgentActivity } from "@/game/useAgentActivity";
import { createOfficeScene, type OfficeScene } from "@/game/officeScene";

type Scope = { type: "task"; taskId: string } | { type: "global" };

export default function OfficeGame({ scope }: { scope: Scope }) {
  const url = scope.type === "task" ? `/api/tasks/${scope.taskId}/events` : "/api/events";
  const states = useAgentActivity(url);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OfficeScene | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = mountRef.current;
    if (!el) return;
    createOfficeScene(el).then((scene) => {
      if (cancelled) {
        scene.destroy();
        return;
      }
      sceneRef.current = scene;
    });
    return () => {
      cancelled = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
      if (el) el.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setStates(states);
  }, [states]);

  return (
    <div className="game-wrap">
      <div ref={mountRef} />
    </div>
  );
}
