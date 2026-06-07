import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { Tooltip } from './Tooltip'

interface PageHeroProps {
  eyebrow?: string
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  children?: ReactNode
}

export function PageHero({ eyebrow, title, description, icon: Icon, actions, children }: PageHeroProps) {
  return (
    <section className="relative isolate rounded-2xl border border-white/70 bg-[radial-gradient(circle_at_top_left,#dffcf6,transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_42%,#e9f7ff_100%)] p-5 shadow-card sm:p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-16 h-28 w-28 rounded-full bg-amber-200/30 blur-3xl" />
      </div>
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">{eyebrow}</p>}
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </section>
  )
}

interface QuickAction {
  label: string
  description: string
  to?: string
  onClick?: () => void
  icon: LucideIcon
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose'
}

const toneClasses = {
  cyan: 'from-cyan-500 to-blue-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-400 to-orange-600',
  violet: 'from-violet-500 to-indigo-600',
  rose: 'from-rose-500 to-red-600',
}

export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon
        const content = (
          <>
            <div className={clsx('mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg', toneClasses[action.tone ?? 'cyan'])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-heading text-sm font-bold text-slate-950">{action.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{action.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-700" />
            </div>
          </>
        )

        if (action.to) {
          return (
            <Tooltip key={action.label} content={action.description} side="top" className="w-full">
              <Link to={action.to} className="feature-tile group block h-full w-full">
                {content}
              </Link>
            </Tooltip>
          )
        }

        return (
          <Tooltip key={action.label} content={action.description} side="top" className="w-full">
            <button type="button" onClick={action.onClick} className="feature-tile group h-full w-full text-left">
              {content}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
        <Icon className="h-7 w-7" />
      </div>
      <p className="font-heading text-lg font-bold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
