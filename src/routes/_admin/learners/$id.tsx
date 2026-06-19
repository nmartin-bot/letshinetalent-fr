import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Pencil, Building2, GraduationCap, ChevronDown, Check, User, BookOpen, Zap, FileText } from 'lucide-react'
import Modal from '@/components/shared/Modal'
import { useLearner } from '@/hooks/useLearners'
import LearnerForm from '@/components/learners/LearnerForm'
import EntityTimeline from '@/components/shared/EntityTimeline'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

export const Route = createFileRoute('/_admin/learners/$id')({
  component: LearnerPage,
})

type Tab = 'profil' | 'formations' | 'activite' | 'docs'

const TABS: { id: Tab; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profil', label: 'Profil', color: 'bg-rose-400', icon: User },
  { id: 'formations', label: 'Formations', color: 'bg-violet-500', icon: BookOpen },
  { id: 'activite', label: 'Activité', color: 'bg-blue-500', icon: Zap },
  { id: 'docs', label: 'Documents', color: 'bg-cyan-400', icon: FileText },
]

function LearnerPage() {
  const { id } = Route.useParams()
  const { learner, loading, update } = useLearner(id)
  const [tab, setTab] = useState<Tab>('profil')
  const [showTabMenu, setShowTabMenu] = useState(false)
  const [editing, setEditing] = useState(false)

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!learner) return <div className="p-8 text-gray-500">Apprenant introuvable.</div>

  const company = (learner as typeof learner & { companies?: { name: string } | null }).companies

  async function handleUpdate(values: Database['public']['Tables']['learners']['Insert']) {
    await update(values)
    setEditing(false)
  }


  const infoFields = [
    { label: 'Email', value: learner.email },
    { label: 'Téléphone', value: learner.phone },
    { label: 'Fonction', value: learner.function },
    { label: 'Entreprise', value: company?.name },
  ]

  return (
    <>
      <PageHeader
        pathItems={[
          { label: 'Formation', href: '/learners' },
          { label: 'Apprenants', href: '/learners' },
          { label: `${learner.first_name} ${learner.last_name}` },
        ]}
        secondBarRight={
          <>
            {company && (
              <Link to="/companies/$id" params={{ id: learner.company_id! }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                <Building2 className="w-3.5 h-3.5" />{company.name}
              </Link>
            )}
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              <Pencil className="w-3.5 h-3.5" />Modifier
            </button>
          </>
        }
        secondBarLeft={
          <div className="relative">
            <button onClick={() => setShowTabMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
              {(() => { const active = TABS.find(t => t.id === tab)!; return <span className={cn('w-4 h-4 rounded flex items-center justify-center shrink-0', active.color)}><active.icon className="w-2.5 h-2.5 text-white" /></span> })()}
              {TABS.find(t => t.id === tab)?.label}
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>
            {showTabMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTabMenu(false)} />
                <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 min-w-[160px]">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setShowTabMenu(false) }}
                      className={cn('flex items-center gap-2.5 w-full pl-1 pr-3 py-1 rounded-lg text-sm hover:bg-gray-50 text-left transition-colors',
                        tab === t.id ? 'text-gray-900 font-medium' : 'text-gray-600')}>
                      <span className={cn('w-4 h-4 rounded flex items-center justify-center shrink-0', t.color)}><t.icon className="w-2.5 h-2.5 text-white" /></span>
                      {t.label}
                      {tab === t.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Two-column layout */}
      <div className="flex h-full overflow-hidden">
        {/* Left panel */}
        <div className="w-72 shrink-0 border-r border-gray-100 overflow-y-auto bg-white">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="font-bold text-gray-900 text-lg">{learner.first_name} {learner.last_name}</h2>
              {learner.function && <p className="text-sm text-gray-500 mt-0.5">{learner.function}</p>}
              {company && (
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Building2 className="w-3 h-3" />{company.name}
                </span>
              )}
            </div>

            {/* Info fields */}
            <div className="border-t border-gray-100">
              {infoFields.filter(f => f.value).map(f => (
                <div key={f.label} className="flex justify-between items-center py-2.5 border-b border-gray-50">
                  <span className="text-xs text-gray-400">{f.label}</span>
                  <span className="text-sm text-gray-900 text-right max-w-[160px] truncate">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'profil' && <ProfilTab learner={learner} companyName={company?.name} />}
          {tab === 'formations' && <FormationsTab learnerId={id} />}
          {tab === 'activite' && <EntityTimeline entityType="learner" entityId={id} />}
          {tab === 'docs' && <p className="text-sm text-gray-400 text-center py-8">Gestion documentaire — bientôt disponible</p>}
        </div>
      </div>

      {editing && (
        <Modal title={`Modifier ${learner.first_name} ${learner.last_name}`} subtitle="Mettez à jour le profil de l'apprenant." icon={GraduationCap} onClose={() => setEditing(false)}>
          <LearnerForm initial={learner} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}
    </>
  )
}

function ProfilTab({ learner, companyName }: {
  learner: Database['public']['Tables']['learners']['Row']
  companyName?: string
}) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {[
        { label: 'Email', value: learner.email },
        { label: 'Téléphone', value: learner.phone },
        { label: 'Fonction', value: learner.function },
        { label: 'Entreprise', value: companyName },
      ].map(({ label, value }) => value ? (
        <div key={label}>
          <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
          <dd className="text-sm text-gray-900">{value}</dd>
        </div>
      ) : null)}
    </dl>
  )
}

function FormationsTab({ learnerId: _learnerId }: { learnerId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <GraduationCap className="w-5 h-5 text-gray-400" />
        <h3 className="font-semibold text-gray-900">Formations</h3>
      </div>
      <p className="text-sm text-gray-400 text-center py-8">
        Module formations — disponible dans la prochaine étape
      </p>
    </div>
  )
}
