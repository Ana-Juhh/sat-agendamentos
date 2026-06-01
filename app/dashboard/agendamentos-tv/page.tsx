"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  AlertTriangle,
  Beaker,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Laptop,
  LoaderCircle,
  MonitorCheck,
  PackageCheck,
  Wrench,
} from "lucide-react";

import { AG_COLLECTION } from "@/lib/agendamentoConfig";
import { ESPACOS_COLLECTION } from "@/lib/espacoConfig";
import { pb } from "@/lib/pocketbase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Registro = Record<string, any>;

type OrigemAgendamento = "chromebooks" | "maker" | "lab" | "espaco";

type AgendamentoTV = {
  id: string;
  origem: OrigemAgendamento;
  titulo: string;
  recurso: string;
  data: string;
  inicio: number;
  fim: number;
  responsavel: string;
  turma: string;
  detalhes: string;
  statusOriginal?: string;
  statusEntrega?: string;
};

const REFRESH_SECONDS = 60;
const DIAS_FUTUROS = 7;
const DIAS_ATRASO = 7;

function getLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDaysIso(dataISO: string, days: number) {
  const [year, month, day] = dataISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + days);

  return getLocalIsoDate(date);
}

function getDateKey(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDateBR(dataISO: string) {
  if (!dataISO) return "-";

  const [year, month, day] = dataISO.slice(0, 10).split("-");

  if (!year || !month || !day) return dataISO;

  return `${day}/${month}/${year}`;
}

function getWeekdayName(dataISO: string) {
  const [year, month, day] = dataISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  }).format(date);
}

function minutesToHour(minutes: number) {
  const total = Number(minutes || 0);
  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function currentMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function nomeUsuario(registro: Registro) {
  return (
    registro.expand?.usuario?.name ||
    registro.expand?.usuario?.nome ||
    registro.expand?.usuario?.email ||
    registro.usuario_nome ||
    registro.responsavel_nome ||
    registro.email ||
    "-"
  );
}

function turmaClasse(registro: Registro) {
  if (!registro.turma) return "-";
  if (!registro.classe) return registro.turma;

  return `${registro.turma} ${registro.classe}`;
}

function codigosChromebooks(registro: Registro) {
  const codigosExpand =
    registro.expand?.chromebooks
      ?.map((item: Registro) => item.codigo || item.nome || item.name || item.id)
      .filter(Boolean) ?? [];

  if (codigosExpand.length > 0) {
    return codigosExpand.join(", ");
  }

  return Array.isArray(registro.chromebooks)
    ? registro.chromebooks.join(", ")
    : "";
}

function nomeEspaco(tipo?: string) {
  if (tipo === "maker") return "Sala Maker";
  if (tipo === "lab") return "Lab. de Ciências";
  return "Espaço";
}

function origemEspaco(tipo?: string): OrigemAgendamento {
  if (tipo === "maker") return "maker";
  if (tipo === "lab") return "lab";
  return "espaco";
}

function normalizarAgendamentoChromebook(item: Registro): AgendamentoTV {
  const quantidade =
    item.expand?.chromebooks?.length || item.chromebooks?.length || 0;

  return {
    id: `chromebooks-${item.id}`,
    origem: "chromebooks",
    titulo: "Chromebooks",
    recurso: `${quantidade || "-"} Chromebook(s)`,
    data: getDateKey(item.data),
    inicio: Number(item.inicio || 0),
    fim: Number(item.fim || 0),
    responsavel: nomeUsuario(item),
    turma: turmaClasse(item),
    detalhes: codigosChromebooks(item),
    statusOriginal: item.status,
    statusEntrega: item.status_entrega,
  };
}

function normalizarAgendamentoEspaco(item: Registro): AgendamentoTV {
  const origem = origemEspaco(item.tipo);
  const recurso = nomeEspaco(item.tipo);

  return {
    id: `espaco-${item.id}`,
    origem,
    titulo: recurso,
    recurso,
    data: getDateKey(item.data),
    inicio: Number(item.inicio || 0),
    fim: Number(item.fim || 0),
    responsavel: nomeUsuario(item),
    turma: turmaClasse(item),
    detalhes: item.observacoes || item.observacao || "",
    statusOriginal: item.status,
  };
}

function getStatusAgendamento(item: AgendamentoTV, now: Date) {
  const todayISO = getLocalIsoDate(now);
  const nowMinutes = currentMinutes(now);

  const isToday = item.data === todayISO;
  const isPastDay = item.data < todayISO;
  const isFutureDay = item.data > todayISO;

  if (item.origem === "chromebooks") {
    if (item.statusEntrega === "devolvido") {
      return { label: "Devolvido", variant: "done" as const };
    }

    if (item.statusEntrega === "atrasado") {
      return { label: "Atrasado", variant: "late" as const };
    }

    if ((isToday && nowMinutes > item.fim) || isPastDay) {
      return { label: "Atrasado", variant: "late" as const };
    }

    if (isToday && nowMinutes >= item.inicio && nowMinutes <= item.fim) {
      return { label: "Em uso agora", variant: "active" as const };
    }

    if (isFutureDay || (isToday && nowMinutes < item.inicio)) {
      return { label: "Agendado", variant: "scheduled" as const };
    }

    return { label: "Pendente", variant: "scheduled" as const };
  }

  if (isToday && nowMinutes >= item.inicio && nowMinutes <= item.fim) {
    return { label: "Em uso agora", variant: "active" as const };
  }

  if (isPastDay || (isToday && nowMinutes > item.fim)) {
    return { label: "Finalizado", variant: "done" as const };
  }

  return { label: "Reservado", variant: "scheduled" as const };
}

function deveMostrarAgendamento(item: AgendamentoTV, todayISO: string) {
  if (item.data >= todayISO) return true;
  if (item.origem !== "chromebooks") return false;
  return item.statusEntrega !== "devolvido";
}

function resourceIcon(origem: OrigemAgendamento) {
  if (origem === "chromebooks") return <Laptop className="h-5 w-5" />;
  if (origem === "maker") return <Wrench className="h-5 w-5" />;
  if (origem === "lab") return <Beaker className="h-5 w-5" />;
  return <PackageCheck className="h-5 w-5" />;
}

function AutoScrollArea({
  children,
  resetKey,
  speed = 0.5,
  duplicate = true,
  className = "",
  contentClassName = "space-y-4",
}: {
  children: ReactNode;
  resetKey: string;
  speed?: number;
  duplicate?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const firstBlockRef = useRef<HTMLDivElement | null>(null);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (viewport) {
      viewport.scrollTop = 0;
    }
  }, [resetKey]);

  useEffect(() => {
    let frame = 0;
    let lastTime = performance.now();

    function animate(time: number) {
      const viewport = viewportRef.current;
      const firstBlock = firstBlockRef.current;

      if (!viewport || !firstBlock) {
        frame = requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(40, time - lastTime);
      lastTime = time;

      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      const firstBlockHeight = firstBlock.scrollHeight;
      const cycleHeight = firstBlockHeight + 16;

      if (maxScroll > 1 && time >= pauseUntilRef.current) {
        const movement = speed * (delta / 16.67);

        viewport.scrollTop += movement;

        if (duplicate && cycleHeight > 0) {
          if (viewport.scrollTop >= cycleHeight) {
            viewport.scrollTop -= cycleHeight;
          }
        } else if (viewport.scrollTop >= maxScroll - 2) {
          viewport.scrollTop = 0;
        }
      }

      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [speed, duplicate]);

  function pauseAutoScroll() {
    pauseUntilRef.current = performance.now() + 6000;
  }

  const copies = duplicate ? 8 : 1;

  return (
    <div
      ref={viewportRef}
      onWheel={pauseAutoScroll}
      onMouseDown={pauseAutoScroll}
      onTouchStart={pauseAutoScroll}
      className={`relative min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {Array.from({ length: copies }).map((_, index) => (
        <div
          key={`scroll-copy-${index}`}
          ref={index === 0 ? firstBlockRef : undefined}
          aria-hidden={index > 0}
          className={`${contentClassName} ${index > 0 ? "pt-4" : ""}`}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export default function AgendamentosTvPage() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  const [isMounted, setIsMounted] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(REFRESH_SECONDS);
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<AgendamentoTV[]>([]);

  const irParaTarefasAgora = useCallback(() => {
    if (hasNavigatedRef.current) return;

    hasNavigatedRef.current = true;
    setIsLeaving(true);

    window.setTimeout(() => {
      router.replace("/dashboard/view");
    }, 520);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMounted(true), 40);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateClock = () => setNow(new Date());

    updateClock();

    const interval = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) return 0;
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      irParaTarefasAgora();
    }
  }, [secondsRemaining, irParaTarefasAgora]);

  useEffect(() => {
    async function carregarAgendamentos() {
      try {
        setLoading(true);

        const hoje = getLocalIsoDate(new Date());
        const inicioBusca = addDaysIso(hoje, -DIAS_ATRASO);
        const limite = addDaysIso(hoje, DIAS_FUTUROS);

        const filtro =
          `data >= "${inicioBusca}" && ` +
          `data <= "${limite}" && ` +
          `status = "ativo"`;

        const [chromebooksResult, espacosResult] = await Promise.allSettled([
          pb.collection(AG_COLLECTION).getFullList<Registro>({
            filter: filtro,
            sort: "+data,+inicio",
            expand: "usuario,chromebooks",
            requestKey: null,
          }),

          pb.collection(ESPACOS_COLLECTION).getFullList<Registro>({
            filter: filtro,
            sort: "+data,+inicio",
            expand: "usuario",
            requestKey: null,
          }),
        ]);

        const chromebooks =
          chromebooksResult.status === "fulfilled"
            ? chromebooksResult.value.map(normalizarAgendamentoChromebook)
            : [];

        const espacos =
          espacosResult.status === "fulfilled"
            ? espacosResult.value.map(normalizarAgendamentoEspaco)
            : [];

        const todos = [...chromebooks, ...espacos]
          .filter((item) => deveMostrarAgendamento(item, hoje))
          .sort((a, b) => {
            if (a.data !== b.data) return a.data.localeCompare(b.data);
            return a.inicio - b.inicio;
          });

        setAgendamentos(todos);
      } catch (error) {
        console.error("Erro ao carregar agendamentos da TV:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarAgendamentos();

    const interval = window.setInterval(
      carregarAgendamentos,
      REFRESH_SECONDS * 1000
    );

    return () => window.clearInterval(interval);
  }, []);

  const safeNow = now || new Date();

  const agendamentosUnicos = useMemo(() => {
    return Array.from(
      new Map(agendamentos.map((item) => [item.id, item])).values()
    );
  }, [agendamentos]);

  const chromebooks = agendamentosUnicos.filter(
    (item) => item.origem === "chromebooks"
  );

  const maker = agendamentosUnicos.filter((item) => item.origem === "maker");
  const lab = agendamentosUnicos.filter((item) => item.origem === "lab");

  const atrasados = agendamentosUnicos.filter(
    (item) => getStatusAgendamento(item, safeNow).variant === "late"
  );

  const emUso = agendamentosUnicos.filter(
    (item) => getStatusAgendamento(item, safeNow).variant === "active"
  );

  const total = agendamentosUnicos.length;
  const lateCount = atrasados.length;
  const inUseCount = emUso.length;

  const chromebooksKey = chromebooks.map((item) => item.id).join("|");
  const makerKey = maker.map((item) => item.id).join("|");
  const labKey = lab.map((item) => item.id).join("|");
  const atrasadosKey = atrasados.map((item) => item.id).join("|");

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.26),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#1b1430_0%,_#0f1a2b_48%,_#0c1d2a_100%)] px-3 py-4 text-white lg:px-4">
      <div
        className={`mx-auto grid h-[calc(100vh-2rem)] max-w-[1880px] gap-4 transition-all duration-700 ease-in-out xl:grid-cols-[420px_minmax(0,1fr)] ${
          isMounted && !isLeaving
            ? "opacity-100 scale-100 blur-0"
            : "opacity-0 scale-[0.985] blur-[2px]"
        }`}
      >
        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4">
          <SidebarCard
            title="Status dos Agendamentos"
            icon={<MonitorCheck className="h-5 w-5" />}
            className="p-5"
            compactHeader
          >
            <div className="grid grid-cols-3 gap-3">
              <SidebarMiniStat
                label="Total"
                value={total}
                accent="violet"
                icon={<CalendarDays className="h-5 w-5" />}
              />

              <SidebarMiniStat
                label="Em uso"
                value={inUseCount}
                accent="cyan"
                icon={<LoaderCircle className="h-5 w-5" />}
              />

              <SidebarMiniStat
                label="Atraso"
                value={lateCount}
                accent="red"
                icon={<AlertTriangle className="h-5 w-5" />}
              />
            </div>
          </SidebarCard>

          <SidebarCard
            title="Alertas de Atraso"
            icon={<Bell className="h-5 w-5" />}
            className="min-h-0"
          >
            {atrasados.length > 0 ? (
              <AutoScrollArea
                resetKey={atrasadosKey}
                speed={0.5}
                duplicate={false}
                className="h-full min-h-0 pr-2"
              >
                {atrasados.map((item) => (
                  <AtrasoCard key={item.id} item={item} />
                ))}
              </AutoScrollArea>
            ) : (
              <EmptyState text="Nenhum Chromebook atrasado no momento." />
            )}
          </SidebarCard>
        </aside>

        <section className="grid min-h-0 grid-rows-[92px_minmax(0,1fr)] gap-4">
          <header className="rounded-[30px] border border-white/12 bg-slate-900/45 px-6 py-4 shadow-[0_30px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-4 w-4 items-center justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-slate-400">
                    Painel de Operações
                  </p>

                  <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    Dashboard de Agendamentos
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3">
                  <div className="flex items-center gap-3 text-cyan-300">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {secondsRemaining}s
                    </span>
                  </div>
                </div>

                <HeaderModeIcon
                  label="Agendamentos"
                  icon={<MonitorCheck className="h-5 w-5" />}
                  tone="cyan"
                />

              </div>
            </div>
          </header>

          <section className="grid min-h-0 gap-6 xl:grid-cols-3">
            <ResourceColumn
              title="Chromebooks"
              badge={`${chromebooks.length} agend.`}
              tone="magenta"
              items={chromebooks}
              resetKey={chromebooksKey}
              now={safeNow}
              loading={loading}
              emptyText="Nenhum agendamento de Chromebook."
            />

            <ResourceColumn
              title="Sala Maker"
              badge={`${maker.length} agend.`}
              tone="cyan"
              items={maker}
              resetKey={makerKey}
              now={safeNow}
              loading={loading}
              emptyText="Nenhum agendamento da Sala Maker."
            />

            <ResourceColumn
              title="Lab. Ciências"
              badge={`${lab.length} agend.`}
              tone="emerald"
              items={lab}
              resetKey={labKey}
              now={safeNow}
              loading={loading}
              emptyText="Nenhum agendamento do Lab. de Ciências."
            />
          </section>
        </section>
      </div>

      <HoverPageJumpButton
        side="left"
        label="Ir para tarefas"
        onClick={irParaTarefasAgora}
        icon={<ChevronLeft className="h-7 w-7" />}
      />
    </main>
  );
}

function HoverPageJumpButton({
  side,
  label,
  icon,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  const isRight = side === "right";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group fixed top-1/2 z-50 flex h-36 w-16 -translate-y-1/2 items-center bg-transparent text-white/0 outline-none transition-all duration-300 hover:bg-white/[0.08] hover:text-white/85 focus-visible:bg-white/[0.10] focus-visible:text-white ${
        isRight
          ? "right-0 justify-end rounded-l-full pr-2"
          : "left-0 justify-start rounded-r-full pl-2"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-950/55 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 ${
          isRight ? "translate-x-4" : "-translate-x-4"
        }`}
      >
        {icon}
      </span>
    </button>
  );
}

function SidebarCard({
  title,
  icon,
  children,
  className = "",
  compactHeader = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  compactHeader?: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(73,36,112,0.66),rgba(25,35,59,0.84))] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.18)] ${className}`}
    >
      <div
        className={`flex shrink-0 items-center gap-4 ${
          compactHeader ? "mb-3" : "mb-6"
        }`}
      >
        <div className="rounded-2xl bg-fuchsia-500/10 p-3 text-fuchsia-400">
          {icon}
        </div>

        <h2 className="text-[1.05rem] font-semibold text-slate-100 md:text-[1.18rem]">
          {title}
        </h2>
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function SidebarMiniStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  accent: "magenta" | "cyan" | "violet" | "red";
}) {
  const accentClass =
    accent === "cyan"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
      : accent === "violet"
        ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
        : accent === "red"
          ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
          : "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300";

  return (
    <div
      className={`rounded-[20px] border px-3 py-3 text-center shadow-[0_12px_28px_rgba(0,0,0,0.12)] ${accentClass}`}
    >
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08]">
        {icon}
      </div>

      <p className="text-xl font-black text-white">{value}</p>

      <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-slate-300">
        {label}
      </p>
    </div>
  );
}

function ResourceColumn({
  title,
  badge,
  tone,
  items,
  resetKey,
  now,
  loading,
  emptyText,
}: {
  title: string;
  badge: string;
  tone: "magenta" | "cyan" | "emerald";
  items: AgendamentoTV[];
  resetKey: string;
  now: Date;
  loading: boolean;
  emptyText: string;
}) {
  return (
    <div className="flex min-h-0 flex-col space-y-4">
      <SectionHeader title={title} badge={badge} tone={tone} />

      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-white/10 bg-slate-950/35 text-sm text-slate-300">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
          Carregando...
        </div>
      ) : items.length > 0 ? (
        <AutoScrollArea
          resetKey={resetKey}
          speed={0.5}
          duplicate={items.length > 3}
          className="min-h-0 flex-1 pr-2"
        >
          {items.map((item) => (
            <AgendamentoCard key={item.id} item={item} now={now} />
          ))}
        </AutoScrollArea>
      ) : (
        <EmptyState text={emptyText} />
      )}
    </div>
  );
}

function SectionHeader({
  title,
  badge,
  tone,
}: {
  title: string;
  badge: string;
  tone: "magenta" | "cyan" | "emerald";
}) {
  const badgeClass =
    tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
      : tone === "emerald"
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";

  return (
    <div className="flex flex-wrap items-center gap-3 px-3">
      <h3 className="text-[1.35rem] font-semibold uppercase tracking-[0.08em] text-slate-300 2xl:text-[1.55rem]">
        {title}
      </h3>

      <span
        className={`rounded-lg border px-3 py-1 text-sm font-semibold uppercase ${badgeClass}`}
      >
        {badge}
      </span>
    </div>
  );
}

function AtrasoCard({ item }: { item: AgendamentoTV }) {
  return (
    <article className="rounded-[24px] border border-rose-400/35 bg-rose-500/12 p-4 shadow-[0_18px_36px_rgba(244,63,94,0.10)]">
      <div className="mb-3 flex items-center gap-3 text-rose-200">
        <AlertTriangle className="h-5 w-5" />
        <p className="text-xs font-black uppercase tracking-[0.16em]">
          Atrasado
        </p>
      </div>

      <h3 className="text-lg font-black text-white">{item.recurso}</h3>

      <p className="mt-2 text-sm text-slate-300">
        <strong className="text-white">Data:</strong> {formatDateBR(item.data)}{" "}
        - {minutesToHour(item.inicio)} às {minutesToHour(item.fim)}
      </p>

      <p className="mt-1 text-sm text-slate-300">
        <strong className="text-white">Responsável:</strong> {item.responsavel}
      </p>

      <p className="mt-1 text-sm text-slate-300">
        <strong className="text-white">Turma:</strong> {item.turma}
      </p>
    </article>
  );
}

function AgendamentoCard({
  item,
  now,
}: {
  item: AgendamentoTV;
  now: Date;
}) {
  const status = getStatusAgendamento(item, now);

  const variantClass =
    status.variant === "late"
      ? "border-rose-400/45 bg-rose-500/15 shadow-[0_0_30px_rgba(244,63,94,0.14)]"
      : status.variant === "active"
        ? "border-cyan-300/40 bg-cyan-400/12 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
        : status.variant === "done"
          ? "border-emerald-400/25 bg-emerald-500/8"
          : "border-white/10 bg-gradient-to-r from-[#493b6f]/80 to-slate-800/70";

  const statusClass =
    status.variant === "late"
      ? "bg-rose-500 text-white"
      : status.variant === "active"
        ? "bg-cyan-400 text-slate-950"
        : status.variant === "done"
          ? "bg-emerald-400 text-slate-950"
          : "bg-white/10 text-slate-200";

  return (
    <article className={`rounded-[30px] border px-5 py-5 ${variantClass}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl bg-white/[0.08] p-3 text-cyan-200">
            {resourceIcon(item.origem)}
          </div>

          <div className="min-w-0">
            <h4 className="break-words text-[1.05rem] font-semibold leading-7 text-white md:text-[1.18rem]">
              {item.titulo}
            </h4>

            <p className="mt-1 text-sm font-semibold text-slate-300">
              {item.recurso}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[0.65rem] font-black uppercase ${statusClass}`}
        >
          {status.label}
        </span>
      </div>

      <div className="space-y-2 text-sm leading-6 text-slate-300 2xl:text-base">
        <InfoRow
          label="Data"
          value={`${formatDateBR(item.data)} (${getWeekdayName(item.data)})`}
        />

        <InfoRow
          label="Horário"
          value={`${minutesToHour(item.inicio)} às ${minutesToHour(item.fim)}`}
        />

        <InfoRow label="Responsável" value={item.responsavel} />

        <InfoRow label="Turma" value={item.turma} />

        {item.detalhes ? <InfoRow label="Detalhes" value={item.detalhes} /> : null}
      </div>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="break-words">
      <span className="font-black text-slate-100">{label}:</span>{" "}
      <span>{value || "-"}</span>
    </p>
  );
}

function HeaderModeIcon({
  label,
  icon,
  tone,
}: {
  label: string;
  icon: ReactNode;
  tone: "magenta" | "cyan";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
      : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200";

  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.12)] ${toneClass}`}
    >
      <div className="rounded-full bg-white/[0.08] p-2">{icon}</div>
      <span className="text-sm font-bold uppercase tracking-[0.08em] text-white">
        {label}
      </span>
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
