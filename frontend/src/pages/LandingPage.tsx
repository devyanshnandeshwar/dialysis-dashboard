import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Github,
  Moon,
  Sun,
  Weight,
  HeartPulse,
  Clock,
  ListChecks,
  CalendarPlus,
  PlayCircle,
  ClipboardCheck,
  History,
  Search,
  StickyNote,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/context/ThemeContext';

/**
 * Public marketing page. Reuses the app's own tokens, Card, Badge and glass
 * material rather than inventing a second visual language, so what a visitor
 * sees here is what they get after signing in.
 *
 * No fabricated social proof: this is a portfolio project, so there are no
 * customer logos, testimonials or usage numbers. Every threshold below is read
 * from backend/src/config/anomalyConfig.ts.
 */

const CHECKS = [
  {
    icon: Weight,
    metric: 'Interdialytic weight gain',
    thresholds: [
      { level: 'warning' as const, value: '2.0 kg' },
      { level: 'critical' as const, value: '3.0 kg' },
    ],
    why: 'Fluid gained between sessions. Above 2 kg suggests excess intake and raises the risk of pulmonary edema, so this is the one check carrying both a warning and a critical level.',
    wide: true,
  },
  {
    icon: HeartPulse,
    metric: 'Post-session systolic BP',
    thresholds: [{ level: 'warning' as const, value: '160 mmHg' }],
    why: 'A reading at or above 160 mmHg is stage-2 hypertension and may call for a medication or session change.',
    wide: false,
  },
  {
    icon: Clock,
    metric: 'Session duration vs target',
    thresholds: [{ level: 'warning' as const, value: '30 short / 60 long' }],
    why: 'Ending early can mean inadequate solute clearance. Running long can signal access problems or clotting.',
    wide: false,
  },
];

const STEPS = [
  {
    icon: CalendarPlus,
    verb: 'Schedule',
    body: 'Pick the patient and an available machine, set the target duration, then enter the pre-session weight and blood pressure.',
  },
  {
    icon: PlayCircle,
    verb: 'Start',
    body: 'The session moves to in progress and the row is marked live, so anyone glancing at the board can see which chairs are running.',
  },
  {
    icon: ClipboardCheck,
    verb: 'Complete',
    body: 'Enter the post-session readings and the actual duration. The checks run on save and attach their findings to the record.',
  },
];

const RECORDS = [
  { icon: History, t: 'Session history', d: 'Every past session with its readings and any anomalies it triggered, kept as recorded.' },
  { icon: Search, t: 'Search and filter', d: 'By name or medical record number, by diagnosis, or only patients flagged high risk.' },
  { icon: StickyNote, t: 'Nurse notes', d: 'Free-text notes on any session, editable in place from the queue.' },
  { icon: ShieldCheck, t: 'One session per day', d: 'The database rejects a duplicate booking for the same patient on the same date.' },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const themeLabel = `Switch to ${nextTheme} mode`;

  return (
    <div className="relative min-h-[100dvh] bg-bg text-text-primary">
      <div className="app-ambient" aria-hidden="true" />

      <div className="relative z-10">
        {/* Nav: single line, 64px, pinned. Same glass as the dashboard headers. */}
        <header className="glass sticky top-0 z-50 rounded-none border-b border-border-subtle">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <span className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-md bg-accent-solid text-accent-on-solid">
                <Activity className="size-4" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap text-[15px] font-bold tracking-tight">
                Dialysis Dashboard
              </span>
            </span>

            <div className="flex items-center gap-1">
              {/* Hidden under 640px: wordmark + three controls overflow a
                  375px viewport. The repo link stays in the footer. */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="hidden text-text-secondary hover:text-text-primary sm:inline-flex"
                  >
                    <a
                      href="https://github.com/devyanshnandeshwar/dialysis-dashboard"
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="View source on GitHub"
                    >
                      <Github className="size-5" aria-hidden="true" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View source on GitHub</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    aria-label={themeLabel}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    {theme === 'dark' ? (
                      <Sun className="size-5" aria-hidden="true" />
                    ) : (
                      <Moon className="size-5" aria-hidden="true" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{themeLabel}</TooltipContent>
              </Tooltip>

              <Button
                asChild
                size="sm"
                className="ml-1 bg-accent-solid text-accent-on-solid hover:brightness-90"
              >
                <Link to="/login">Open demo</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero: asymmetric split, text left, real product shot right. */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-24 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:pt-24">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              Every session checked before you ask.
            </h1>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-text-secondary">
              A shift-floor queue for dialysis units. It records each session and flags unsafe
              weight gain, blood pressure and duration as the data lands.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-accent-solid text-accent-on-solid hover:brightness-90"
              >
                <Link to="/login">
                  Open demo
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <span className="font-mono text-[13px] text-text-muted">
                demo@dialysis.local / demo-portfolio-2026
              </span>
            </div>
          </div>

          <div className="glass overflow-hidden rounded-xl p-1.5">
            <img
              src="/shot-schedule-dark.webp"
              alt="Today's schedule showing four dialysis sessions, one in progress, with weight, blood pressure and duration per row and two flagged anomalies."
              width={1440}
              height={900}
              className="w-full rounded-md"
            />
          </div>
        </section>

        {/* Checks: asymmetric card bento. The weight-gain check spans two
            columns because it is the only one carrying two levels, which also
            keeps this off the three-identical-cards pattern. */}
        <section className="border-y border-border-subtle bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Three checks run on every session
            </h2>
            <p className="mt-4 max-w-[54ch] text-text-secondary">
              When a session is completed the readings are compared against the unit&rsquo;s
              thresholds. Anything outside them is attached to the record and surfaced on the
              queue. Thresholds live in one config file, so a unit can tune them.
            </p>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {CHECKS.map(({ icon: Icon, metric, thresholds, why, wide }) => (
                <Card key={metric} size="sm" className={wide ? 'lg:col-span-2' : ''}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <Icon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                      <span className="font-semibold">{metric}</span>
                      <span className="flex gap-1.5">
                        {thresholds.map(({ level, value }) => (
                          <Badge key={value} variant={level}>
                            {value}
                          </Badge>
                        ))}
                      </span>
                    </CardTitle>
                    <CardDescription className="max-w-[62ch] leading-relaxed">
                      {why}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Queue: split with the second screenshot. No cards, so this reads
            differently from the section above it. */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="surface-panel overflow-hidden rounded-xl p-1.5">
            <img
              src="/shot-patients-light.webp"
              alt="Patient directory listing six patients with demographics, dry weight, diagnosis, latest session date and anomaly badges."
              width={1440}
              height={900}
              loading="lazy"
              className="w-full rounded-md"
            />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              The whole unit on one screen
            </h2>
            <p className="mt-4 text-text-secondary">
              Today&rsquo;s schedule lists every scheduled patient in treatment order, with the
              machine they are on and their pre and post readings side by side.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-text-secondary">
              {[
                'Queued, in progress and completed, with a colour rail down the side of each row',
                'Weight, blood pressure and duration shown as before and after, with units',
                'Reorder the queue when a patient needs to go earlier',
                'Filter to only the patients carrying an anomaly',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <ListChecks className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Workflow: three cards read as a sequence, numbered, so they are a
            flow rather than three interchangeable tiles. */}
        <section className="border-y border-border-subtle bg-surface/40">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              A session is recorded in three moves
            </h2>
            <p className="mt-4 max-w-[52ch] text-text-secondary">
              Each step validates before it commits, so a half-entered session cannot be saved
              against a patient.
            </p>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, verb, body }, i) => (
                <li key={verb}>
                  <Card size="sm" className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-tint font-mono text-xs font-semibold text-text-primary">
                          {i + 1}
                        </span>
                        <Icon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                        <span className="font-semibold">{verb}</span>
                      </CardTitle>
                      <CardDescription className="leading-relaxed">{body}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Records: 2x2 card grid, tighter than the bento above. */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-[52ch]">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Patient records that keep their history
            </h2>
            <p className="mt-4 text-text-secondary">
              Every patient carries their dry weight, primary diagnosis and contact details, plus
              every session ever recorded against them.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {RECORDS.map(({ icon: Icon, t, d }) => (
              <Card key={t} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
                    <span className="font-semibold">{t}</span>
                  </CardTitle>
                  <CardDescription className="leading-relaxed">{d}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Closing CTA: same single action as the nav and hero. */}
        <section className="border-t border-border-subtle">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Have a look around the queue
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-text-secondary">
              The demo is seeded with synthetic patients. Nothing in it is real clinical data.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 bg-accent-solid text-accent-on-solid hover:brightness-90"
            >
              <Link to="/login">
                Open demo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="mt-4 font-mono text-[13px] text-text-muted">
              demo@dialysis.local / demo-portfolio-2026
            </p>
          </div>
        </section>

        <footer className="border-t border-border-subtle">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[13px] text-text-muted">
            <span>Portfolio project. Synthetic data only, not a medical device.</span>
            <a
              className="flex items-center gap-2 hover:text-text-primary"
              href="https://github.com/devyanshnandeshwar/dialysis-dashboard"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Github className="size-4" aria-hidden="true" />
              devyanshnandeshwar/dialysis-dashboard
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
