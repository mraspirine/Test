"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/domain/types";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { TaskList } from "@/components/TaskList";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="grid-2">
        <CreateTaskForm onCreated={load} />
        <div className="panel">
          <h2>Tasks</h2>
          <TaskList tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
