"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlarmClockCheck,
  Bell,
  BookOpenText,
  Boxes,
  CheckSquare,
  Clock3,
  LaptopMinimal,
  LoaderCircle,
  Settings,
} from "lucide-react";

import { AG_COLLECTION } from "@/lib/agendamentoConfig";
import {
  getClickUpAssigneesText,
  getClickUpPriorityText,
  getClickUpStatusText,
  getClickUpTaskDescription,
} from "@/lib/clickup";
import { pb } from "@/lib/pocketbase";

type Task = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | { status?: string; type?: string; color?: string } | null;
  priority?: {
    priority?: string;
    color?: string;
  } | null;
  assignees?: Array<{
    id?: number | string;
    username?: string;
    email?: string;
  }>;
  date_created?: string;
  date_updated?: string;
  list?: { name?: string };
};

type ClickUpResponse = {
  tasks?: Task[];
  todo?: Task[];
  inProgress?: Task[];
  doing?: Task[];
};

type Agendamento = {
  id: string;
  data: string;
  inicio: number;
  fim: number;
  status?: string;
  expand?: {
    usuario?: {
      name?: string;
      email?: string;
    };
  };
};

type Emprestimo = {
  id: string;
  status?: string;
  agendamento?: string;
  agendamentos?: string;
  entrada_em?: string;
  devolvido_em?: string;
  created?: string;
};

const SCREEN_DURATION_SECONDS = 60;

function getLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKeyFromPocketBase(value?: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function currentMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function normalizeText(value?: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function splitTaskBuckets(data: ClickUpResponse) {
  const directTodo = Array.isArray(data.todo) ? data.todo : [];
  const directDoing = Array.isArray(data.inProgress)
    ? data.inProgress
    : Array.isArray(data.doing)
      ? data.doing
      : [];

  if (directTodo.length || directDoing.length) {
    return {
      todo: directTodo,
      doing: directDoing,
    };
  }

  const allTasks = Array.isArray(data.tasks) ? data.tasks : [];

  return allTasks.reduce(
    (acc, task) => {
      const status = normalizeText(getClickUpStatusText(task.status));

      if (
        status.includes("andamento") ||
        status.includes("progress") ||
        status.includes("doing") ||
        status.includes("in progress") ||
        status.includes("em andamento")
      ) {
        acc.doing.push(task);
      } else {
        acc.todo.push(task);
      }

      return acc;
    },
    { todo: [] as Task[], doing: [] as Task[] }
  );
}

export default function DashboardView() {
  const [now, setNow] = useState<Date | null>(null);
  const [activeScreen, setActiveScreen] = useState<"tasks" | "schedule">("tasks");
  const [secondsRemaining, setSecondsRemaining] = useState(SCREEN_DURATION_SECONDS);
  const [todoTasks, setTodoTasks] = useState<Task[]>([]);
  const [doingTasks, setDoingTasks] = useState<Task[]>([]);
  const [diary, setDiary] = useState<Task[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    const initialTimer = window.setTimeout(updateClock, 0);
    const intervalTimer = window.setInterval(updateClock, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, []);

  useEffect(() => {
    const switchTimer = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          setActiveScreen((screen) => (screen === "tasks" ? "schedule" : "tasks"));
          return SCREEN_DURATION_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(switchTimer);
  }, []);

  useEffect(() => {
    async function loadAgendamentosData() {
      const collectionNames = Array.from(new Set([AG_COLLECTION, "agendamentos", "agendamentos_tmp"]));
      const results = await Promise.allSettled(
        collectionNames.map((collectionName) =>
          pb.collection(collectionName).getFullList<Agendamento>({
            expand: "usuario",
            sort: "data,inicio",
          })
        )
      );

      const merged = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      );

      return Array.from(new Map(merged.map((item) => [item.id, item])).values());
    }

    async function loadDashboard() {
      try {
        const [tasksResult, diaryResult, agendamentosResult, emprestimosResult] =
          await Promise.allSettled([
            fetch("/api/tasks", { cache: "no-store" }).then((response) =>
              response.json() as Promise<ClickUpResponse>
            ),
            fetch("/api/diary", { cache: "no-store" }).then((response) =>
              response.json() as Promise<ClickUpResponse>
            ),
            loadAgendamentosData(),
            pb.collection("emprestimos").getFullList<Emprestimo>({
              sort: "-created",
            }),
          ]);

        if (tasksResult.status === "fulfilled") {
          const buckets = splitTaskBuckets(tasksResult.value);
          setTodoTasks(buckets.todo);
          setDoingTasks(buckets.doing);
        }

        if (diaryResult.status === "fulfilled") {
          setDiary(Array.isArray(diaryResult.value.tasks) ? diaryResult.value.tasks : []);
        }

        if (agendamentosResult.status === "fulfilled") {
          setAgendamentos(agendamentosResult.value);
        }

        if (emprestimosResult.status === "fulfilled") {
          setEmprestimos(emprestimosResult.value);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      }
    }

    loadDashboard();
    const refresh = window.setInterval(loadDashboard, 120000);

    return () => window.clearInterval(refresh);
  }, []);

  const todayIso = now ? getLocalIsoDate(now) : null;
  const todayMinutes = now ? currentMinutes(now) : null;

  const agendamentosHoje = useMemo(
    () =>
      agendamentos
        .filter(
          (item) =>
            (!todayIso || getDateKeyFromPocketBase(item.data) === todayIso) &&
            item.status !== "cancelado"
        )
        .sort((a, b) => a.inicio - b.inicio),
    [agendamentos, todayIso]
  );

  const emprestimosEmUso = useMemo(
    () => emprestimos.filter((item) => item.status === "em_uso"),
    [emprestimos]
  );

  const agendamentosComStatus = useMemo(
    () =>
      agendamentosHoje.map((agendamento) => {
        const emprestimosDoAgendamento = emprestimosEmUso.filter((emprestimo) => {
          return (
            emprestimo.agendamento === agendamento.id || emprestimo.agendamentos === agendamento.id
          );
        });

        const hasPendingReturn = emprestimosDoAgendamento.length > 0;
        const isRunning =
          todayMinutes !== null &&
          todayMinutes >= agendamento.inicio &&
          todayMinutes <= agendamento.fim;
        const isLate = todayMinutes !== null && todayMinutes > agendamento.fim && hasPendingReturn;

        return {
          ...agendamento,
          hasPendingReturn,
          isRunning,
          isLate,
          emprestimosAtivos: emprestimosDoAgendamento.length,
        };
      }),
    [agendamentosHoje, emprestimosEmUso, todayMinutes]
  );

  const totalTasks = todoTasks.length + doingTasks.length;
  const lateCount = agendamentosComStatus.filter((item) => item.isLate).length;
  const inUseCount = agendamentosComStatus.filter((item) => item.hasPendingReturn).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.26),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#1b1430_0%,_#0f1a2b_48%,_#0c1d2a_100%)] px-3 py-4 text-white lg:px-4">
      <div className="mx-auto grid max-w-[1880px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="grid gap-4">
          <SidebarCard
            title="Status das Tarefas"
            icon={<CheckSquare className="h-5 w-5" />}
          >
            <SidebarStatRow
              label="A Fazer"
              value={todoTasks.length}
              accent="magenta"
              icon={<AlarmClockCheck className="h-5 w-5" />}
            />
            <SidebarStatRow
              label="Em Andamento"
              value={doingTasks.length}
              accent="cyan"
              icon={<LoaderCircle className="h-5 w-5" />}
            />
            <SidebarStatRow
              label="Total Geral"
              value={totalTasks}
              accent="violet"
              icon={<Boxes className="h-5 w-5" />}
            />
          </SidebarCard>

          <SidebarCard
            title="Diario de Bordo"
            icon={<BookOpenText className="h-5 w-5" />}
            className="min-h-[520px]"
          >
            <div className="max-h-[690px] space-y-4 overflow-auto pr-2">
              {diary.length > 0 ? (
                diary.map((item, index) => (
                  <DiaryTimelineCard key={item.id || `diary-${index}`} item={item} />
                ))
              ) : (
                <EmptyState text="Nenhum registro no diario do dia anterior." />
              )}
            </div>
          </SidebarCard>
        </aside>

        <section className="grid gap-4">
          <header className="rounded-[34px] border border-white/12 bg-slate-900/45 px-6 py-4 shadow-[0_30px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-4 w-4 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500 shadow-[0_0_14px_rgba(217,70,239,0.9)]" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-slate-400">
                    {activeScreen === "tasks" ? "Painel de Operacoes" : "Controle de Chromebooks"}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    {activeScreen === "tasks"
                      ? "Visao das tarefas do ClickUp"
                      : "Visao dos agendamentos de hoje"}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3">
                  <div className="flex items-center gap-3 text-cyan-300">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-sm font-semibold">{secondsRemaining}s</span>
                  </div>
                </div>

                <AvatarGroup />

                <button className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-slate-300">
                  <Bell className="h-5 w-5" />
                </button>
                <button className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-slate-300">
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>

          {activeScreen === "tasks" ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <SectionHeader
                  title="A Fazer"
                  badge={`${todoTasks.length} tasks`}
                  tone="magenta"
                />
                <div className="space-y-4">
                  {todoTasks.length > 0 ? (
                    todoTasks.map((item, index) => (
                      <TaskCard key={item.id || `todo-${index}`} item={item} accent="magenta" />
                    ))
                  ) : (
                    <EmptyState text="Nenhuma tarefa em A fazer." />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <SectionHeader
                  title="Em Andamento"
                  badge={`${doingTasks.length} tasks`}
                  tone="cyan"
                />
                <div className="space-y-4">
                  {doingTasks.length > 0 ? (
                    doingTasks.map((item, index) => (
                      <TaskCard key={item.id || `doing-${index}`} item={item} accent="cyan" />
                    ))
                  ) : (
                    <EmptyState text="Nenhuma tarefa em andamento." />
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <SectionHeader
                title="Agendamentos Chromebooks"
                badge={`${inUseCount} em uso`}
                secondaryBadge={`${lateCount} atrasados`}
                tone="cyan"
              />
              <div className="space-y-4">
                {agendamentosComStatus.length > 0 ? (
                  agendamentosComStatus.map((item) => (
                    <ScheduleCard key={item.id} item={item} />
                  ))
                ) : (
                  <EmptyState text="Nenhum agendamento encontrado para hoje." />
                )}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function SidebarCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,36,112,0.66),rgba(25,35,59,0.84))] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.18)] ${className}`}
    >
      <div className="mb-6 flex items-center gap-4">
        <div className="rounded-2xl bg-fuchsia-500/10 p-3 text-fuchsia-400">{icon}</div>
        <h2 className="text-[1.05rem] font-semibold text-slate-100 md:text-[1.2rem]">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SidebarStatRow({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent: "magenta" | "cyan" | "violet";
}) {
  const accentClass =
    accent === "cyan"
      ? "before:bg-cyan-400 text-cyan-300"
      : accent === "violet"
        ? "before:bg-violet-500 text-violet-300"
        : "before:bg-fuchsia-500 text-fuchsia-300";

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-white/10 px-5 py-5 before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${accentClass}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/6 p-4">{icon}</div>
          <p className="text-[1.05rem] font-semibold text-slate-200">{label}</p>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  badge,
  secondaryBadge,
  tone,
}: {
  title: string;
  badge: string;
  secondaryBadge?: string;
  tone: "magenta" | "cyan";
}) {
  const badgeClass =
    tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
      : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";

  return (
    <div className="flex flex-wrap items-center gap-3 px-3">
      <h3 className="text-[1.7rem] font-semibold uppercase tracking-[0.08em] text-slate-300">
        {title}
      </h3>
      <span className={`rounded-lg border px-3 py-1 text-sm font-semibold uppercase ${badgeClass}`}>
        {badge}
      </span>
      {secondaryBadge && (
        <span className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-sm font-semibold uppercase text-rose-300">
          {secondaryBadge}
        </span>
      )}
    </div>
  );
}

function TaskCard({
  item,
  accent,
}: {
  item: Task;
  accent: "magenta" | "cyan";
}) {
  const accentClass =
    accent === "cyan"
      ? "from-slate-700/95 to-cyan-950/55"
      : "from-[#493b6f]/95 to-slate-800/80";

  const priority = getClickUpPriorityText(item);
  const assignees = getClickUpAssigneesText(item);
  const description = getClickUpTaskDescription(item);
  const initials = assignees
    ? assignees
        .split(",")
        .map((name) => name.trim().charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "T";

  return (
    <article
      className={`rounded-[34px] border border-white/10 bg-gradient-to-r ${accentClass} px-7 py-6 shadow-[0_20px_40px_rgba(0,0,0,0.14)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-[78%]">
          <h4 className="text-[1.15rem] font-semibold text-white md:text-[1.35rem]">{item.name}</h4>
          {description && (
            <p className="mt-4 line-clamp-4 text-base leading-7 text-slate-300">{description}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {priority && <Chip label={`Prioridade ${priority}`} tone={accent} />}
            {assignees && <Chip label={`Responsavel ${assignees}`} tone="slate" />}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <div className="text-slate-500">•••</div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">
              {initials}
            </div>
            <span className="text-sm font-semibold uppercase text-slate-400">{assignees || "Sem responsavel"}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ScheduleCard({
  item,
}: {
  item: Agendamento & {
    hasPendingReturn: boolean;
    isRunning: boolean;
    isLate: boolean;
    emprestimosAtivos: number;
  };
}) {
  const tone = item.isLate
    ? "from-[#4b2941]/95 to-[#27384e]/90"
    : item.isRunning
      ? "from-[#4a3a71]/95 to-[#234558]/90"
      : "from-slate-700/95 to-[#24485a]/85";

  return (
    <article
      className={`rounded-[30px] border border-white/10 bg-gradient-to-r ${tone} px-6 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.14)]`}
    >
      <div className="grid items-center gap-4 md:grid-cols-[72px_minmax(0,1fr)_190px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/8 text-cyan-300">
          <LaptopMinimal className="h-6 w-6" />
        </div>

        <div>
          <h4 className="text-[1.15rem] font-semibold text-white md:text-[1.3rem]">
            {item.expand?.usuario?.name || item.expand?.usuario?.email || "Professor"}
          </h4>
          <p className="mt-1 text-sm uppercase tracking-[0.18em] text-slate-400">
            Quantidade: {item.emprestimosAtivos || 0}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 md:justify-end">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Horario</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{minutesToTime(item.inicio)}</p>
          </div>
          <span
            className={`rounded-full border px-5 py-3 text-sm font-semibold uppercase ${
              item.isLate
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
            }`}
          >
            {item.isLate ? "Atrasado" : item.hasPendingReturn ? "Em uso" : "Programado"}
          </span>
        </div>
      </div>
    </article>
  );
}

function DiaryTimelineCard({ item }: { item: Task }) {
  const description = getClickUpTaskDescription(item);
  const assignees = getClickUpAssigneesText(item);

  return (
    <div className="relative pl-7">
      <span className="absolute left-[6px] top-2 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.85)]" />
      <span className="absolute left-[11px] top-6 h-[calc(100%+12px)] w-px bg-white/10" />
      <div className="pb-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-lg font-semibold uppercase tracking-[0.12em] text-cyan-300">
            Diario anterior
          </p>
          <p className="text-sm text-slate-400">{assignees || "Equipe"}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
          <p className="text-sm leading-8 text-slate-300">
            {description || item.name || "Sem texto adicional no diario."}
          </p>
        </div>
      </div>
    </div>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "magenta" | "cyan" | "slate";
}) {
  const className =
    tone === "cyan"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
      : tone === "magenta"
        ? "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300"
        : "border-white/10 bg-white/8 text-slate-300";

  return <span className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase ${className}`}>{label}</span>;
}

function AvatarGroup() {
  return (
    <div className="flex items-center">
      {[
        ["E", "from-violet-600 to-fuchsia-500"],
        ["M", "from-cyan-500 to-blue-500"],
        ["G", "from-fuchsia-500 to-pink-500"],
      ].map(([label, gradient], index) => (
        <div
          key={label}
          className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-900 bg-gradient-to-br ${gradient} text-sm font-bold text-white first:ml-0`}
          style={{ zIndex: 5 - index }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-slate-950/35 px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
