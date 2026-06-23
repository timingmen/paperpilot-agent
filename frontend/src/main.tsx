import React, { useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, BarChart3, Bell, BookOpenCheck, Bot, Check, ChevronDown, CircleHelp,
  ClipboardCheck, Clock3, Command, Download, FileText, FolderOpen, Gauge, LayoutDashboard,
  Link2, LoaderCircle, Menu, MoreHorizontal, Plus, Search, Send, Settings2, ShieldCheck,
  Sparkles, UploadCloud, X
} from 'lucide-react'
import './styles.css'

type Priority = 'High' | 'Medium' | 'Low'
type Status = 'Needs review' | 'Approved' | 'In progress' | 'Blocked'
type Evidence = { source: string; location: string; excerpt: string; score: number }
type Task = { id: string; reviewer: string; title: string; comment: string; category: string; priority: Priority; status: Status; manuscript_section: string; rationale: string; suggested_change: string; response_draft: string; evidence: Evidence[] }
type Project = { id: string; title: string; journal: string; deadline?: string | null; progress: number; updated_at: string; manuscripts: number; comments: number }
type Trace = { agent: string; action: string; status: 'done' | 'running' | 'waiting'; elapsed: string; detail: string }

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const seedProject: Project = { id: 'pp-001', title: 'Feature Enhancement and Viewpoint-Aware Alignment', journal: 'Sensors · Major revision', deadline: '2026-07-05', progress: 68, updated_at: 'Just now', manuscripts: 4, comments: 11 }
const seedTasks: Task[] = [
  { id: 'R2-C3', reviewer: 'Reviewer 2', title: 'Report training cost and deployment footprint', comment: 'The manuscript does not adequately discuss computational requirements. Please report training hardware, total training time, memory footprint, and practical inference cost.', category: 'Reproducibility', priority: 'High', status: 'Needs review', manuscript_section: 'Section 4.5.7 · Computational footprint', rationale: 'Adding reproducibility details makes the efficiency claim verifiable without changing the method narrative.', suggested_change: 'Add a compact subsection reporting 80 epochs on 2× NVIDIA L20 GPUs, average epoch duration, total pure training time, peak allocated and reserved memory, input resolution, batch size, and single-image inference latency.', response_draft: 'Thank you for this constructive suggestion. We added Section 4.5.7, “Computational Footprint,” to report the training hardware, configuration, total pure training time, peak GPU memory usage, and inference latency.', evidence: [{ source: 'Experiment log', location: 'run_fvaa_l20.log', excerpt: '80 epochs · batch 32 · average epoch 5.8 min · peak allocated 8.73 GB/GPU.', score: 0.92 }, { source: 'Manuscript', location: 'Section 4.5', excerpt: 'The current efficiency table reports inference parameters and latency, but training resources are not stated.', score: 0.96 }] },
  { id: 'R2-C7', reviewer: 'Reviewer 2', title: 'Strengthen uncertainty and navigation reliability analysis', comment: 'Please provide a more explicit analysis of retrieval confidence and explain how the method could support operational decision-making in GNSS-limited navigation.', category: 'Reliability', priority: 'High', status: 'In progress', manuscript_section: 'Section 5.2 · Reliability-aware retrieval', rationale: 'The reviewer needs evidence that confidence can drive an acceptance, verification, or fallback decision.', suggested_change: 'Introduce margin and entropy as confidence indicators. Partition queries into high-, medium-, and low-confidence groups, report Top-1 performance, and add an operational policy.', response_draft: 'We appreciate this important comment. We added a reliability analysis based on retrieval margin and entropy, including group-level Top-1 accuracy and a practical acceptance/verification/fallback decision policy.', evidence: [{ source: 'Experiment table', location: 'Reliability analysis', excerpt: 'High confidence: 100.00% Top-1; medium: 96.70%; low: 70.29%.', score: 0.98 }] },
  { id: 'R3-C2', reviewer: 'Reviewer 3', title: 'Clarify contribution boundaries and failure cases', comment: 'The manuscript would benefit from a clearer distinction between proposed modules and a more transparent discussion of cases where the alignment strategy remains challenging.', category: 'Clarity', priority: 'Medium', status: 'Needs review', manuscript_section: 'Introduction + Section 5.3', rationale: 'The requested change is mainly structural: distinguish the modules and connect qualitative errors to limitations.', suggested_change: 'Rewrite the final introduction paragraph into three verifiable contributions. Add two representative failure modes: substantial scene change/occlusion and visually repetitive near-nadir areas.', response_draft: 'Thank you for the helpful recommendation. We revised the final paragraph of the Introduction to distinguish the modules and added representative failure cases with a discussion of remaining ambiguities.', evidence: [{ source: 'Figure archive', location: 'Failure case panel', excerpt: 'False retrievals arise in repeated road blocks and large seasonal or construction changes.', score: 0.90 }] },
  { id: 'R1-C4', reviewer: 'Reviewer 1', title: 'Discuss urban-scene scope and GNSS modeling relation', comment: 'Please clarify the intended operating scope, especially dense urban environments, and explain how learning-based GNSS prediction complements rather than duplicates visual localization.', category: 'Scope', priority: 'Medium', status: 'Approved', manuscript_section: 'Introduction + Limitations', rationale: 'This comment asks for positioning and boundary conditions, not an additional experiment.', suggested_change: 'Add a short paragraph distinguishing visual cross-view localization from learning-based GNSS signal prediction and state the known limits in urban canyons and visually homogeneous corridors.', response_draft: 'We thank the reviewer for raising this point. The revised Introduction positions visual cross-view localization as complementary to learning-based GNSS prediction and clarifies its limitations in dense urban canyons and visually homogeneous scenes.', evidence: [{ source: 'Related work', location: 'Introduction', excerpt: 'GNSS learning approaches estimate signal quality or position-related error; they do not directly solve cross-view image retrieval.', score: 0.86 }] }
]
const seedTrace: Trace[] = [
  { agent: 'Review Parser', action: 'Extracted 11 actionable reviewer comments', status: 'done', elapsed: '8.2s', detail: 'Grouped comments by reviewer, request type, and urgency.' },
  { agent: 'Paper Locator', action: 'Mapped comments to manuscript sections', status: 'done', elapsed: '4.7s', detail: 'Matched headings, contribution claims, tables, and discussion paragraphs.' },
  { agent: 'Evidence Retriever', action: 'Collected supporting snippets and logs', status: 'done', elapsed: '6.4s', detail: 'Ranked manuscript excerpts, experiment logs, and related-work notes.' },
  { agent: 'Revision Writer', action: 'Drafted revisions and response language', status: 'done', elapsed: '12.5s', detail: 'Generated bounded edits with response-to-reviewers wording.' },
  { agent: 'Quality Gate', action: 'Awaiting human approval on 3 high-impact changes', status: 'waiting', elapsed: '—', detail: 'No manuscript overwrite occurs until high-priority tasks are approved.' }
]

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, options)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

function App() {
  const [page, setPage] = useState('Workspace')
  const [project, setProject] = useState<Project>(seedProject)
  const [tasks, setTasks] = useState<Task[]>(seedTasks)
  const [trace, setTrace] = useState<Trace[]>(seedTrace)
  const [selected, setSelected] = useState<Task>(seedTasks[0])
  const [filter, setFilter] = useState<'All' | Status>('All')
  const [modal, setModal] = useState<'new' | 'upload' | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [connected, setConnected] = useState(false)

  const filtered = useMemo(() => filter === 'All' ? tasks : tasks.filter(t => t.status === filter), [tasks, filter])
  const approved = tasks.filter(t => t.status === 'Approved').length
  const high = tasks.filter(t => t.priority === 'High').length
  const completion = Math.round((approved / Math.max(tasks.length, 1)) * 100)

  async function launchAnalysis() {
    setBusy(true)
    setToast('')
    try {
      const result = await request<{project: Project; tasks: Task[]; trace: Trace[]}>(`/projects/${project.id}/analyze`, { method: 'POST' })
      setProject(result.project); setTasks(result.tasks); setTrace(result.trace); setSelected(result.tasks[0] ?? selected); setConnected(true)
      setToast('Analysis finished. Your agent workspace is ready.')
    } catch {
      setTasks(seedTasks); setTrace(seedTrace); setToast('Demo analysis completed. Start the FastAPI backend to connect live uploads.')
    } finally { setBusy(false) }
  }

  async function updateStatus(status: Status) {
    setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, status } : t))
    setSelected(prev => ({ ...prev, status }))
    try {
      const updated = await request<Task>(`/projects/${project.id}/tasks/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t)); setSelected(updated); setConnected(true)
    } catch { /* demo mode still updates UI */ }
    setToast(status === 'Approved' ? 'Task approved. It is now safe to include in the export.' : 'Task status updated.')
  }

  async function exportLetter() {
    try {
      const res = await fetch(`${API}/projects/${project.id}/export/response-letter`)
      if (!res.ok) throw new Error('unavailable')
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'paperpilot_response_to_reviewers.docx'; a.click(); URL.revokeObjectURL(url)
      setConnected(true); setToast('Response-to-reviewers letter exported.')
    } catch { setToast('Start the backend to export a DOCX response letter. The project is currently in UI demo mode.') }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>PaperPilot</span></div>
      <div className="workspace-switcher"><div className="avatar">JC</div><div><b>Junyu’s Lab</b><small>Research workspace</small></div><ChevronDown size={15}/></div>
      <nav>
        <NavItem icon={<LayoutDashboard size={18}/>} label="Overview" active={page === 'Overview'} onClick={() => setPage('Overview')} />
        <NavItem icon={<ClipboardCheck size={18}/>} label="Workspace" active={page === 'Workspace'} badge="11" onClick={() => setPage('Workspace')} />
        <NavItem icon={<BookOpenCheck size={18}/>} label="Evidence library" active={page === 'Evidence'} onClick={() => setPage('Evidence')} />
        <NavItem icon={<Gauge size={18}/>} label="Run monitor" active={page === 'Monitor'} onClick={() => setPage('Monitor')} />
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => setPage('Settings')}><Settings2 size={18}/><span>Settings</span></button>
        <div className="credit-card"><div className="credit-icon"><Bot size={17}/></div><div><b>Agent mode</b><small>{connected ? 'Backend connected' : 'Demo-ready workflow'}</small></div><span className="pulse-dot"/></div>
      </div>
    </aside>

    <main className="main-panel">
      <header className="topbar">
        <div className="crumb"><FolderOpen size={16}/><span>Projects</span><span className="slash">/</span><b>{project.title}</b></div>
        <div className="top-actions"><button className="icon-btn"><Search size={18}/></button><button className="icon-btn"><Bell size={18}/><i/></button><div className="profile">JC</div></div>
      </header>

      <section className="content">
        {page === 'Workspace' && <>
          <div className="hero-row">
            <div><div className="eyebrow">REVISION INTELLIGENCE</div><h1>Turn reviewer feedback into a clear revision plan.</h1><p>PaperPilot orchestrates specialized agents that parse comments, retrieve evidence, draft bounded changes, and keep you in control before export.</p></div>
            <div className="hero-actions"><button className="secondary-btn" onClick={() => setModal('upload')}><UploadCloud size={17}/> Upload files</button><button className="primary-btn" onClick={launchAnalysis} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} {busy ? 'Running analysis' : 'Launch analysis'}</button></div>
          </div>

          {toast && <div className="toast"><Check size={16}/><span>{toast}</span><button onClick={() => setToast('')}><X size={15}/></button></div>}

          <div className="stats-grid">
            <StatCard label="Revision progress" value={`${project.progress}%`} sub="3 actions need approval" icon={<BarChart3 size={20}/>} trend="On track" />
            <StatCard label="Actionable comments" value={String(tasks.length)} sub={`${high} high-priority items`} icon={<ClipboardCheck size={20}/>} trend="Parsed" />
            <StatCard label="Approval rate" value={`${completion}%`} sub={`${approved} tasks approved`} icon={<ShieldCheck size={20}/>} trend="Human checked" />
            <StatCard label="Response draft" value="Ready" sub="Export after review" icon={<FileText size={20}/>} trend="Structured" />
          </div>

          <div className="workspace-layout">
            <section className="task-panel card">
              <div className="panel-header"><div><h2>Revision queue</h2><p>Each task keeps evidence, a proposed change, and reviewer-facing wording together.</p></div><button className="light-btn" onClick={() => setModal('new')}><Plus size={16}/> New project</button></div>
              <div className="filter-row">{(['All','Needs review','In progress','Approved'] as const).map(item => <button key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{item}<span>{item === 'All' ? tasks.length : tasks.filter(t => t.status === item).length}</span></button>)}</div>
              <div className="task-list">{filtered.map(task => <TaskItem key={task.id} task={task} active={task.id === selected.id} onClick={() => setSelected(task)} />)}</div>
            </section>

            <section className="detail-panel card">
              <div className="detail-heading"><div><div className="small-meta"><span>{selected.id}</span><span>•</span><span>{selected.reviewer}</span><Priority priority={selected.priority}/></div><h2>{selected.title}</h2></div><button className="icon-btn"><MoreHorizontal size={18}/></button></div>
              <div className="comment-box"><div className="comment-label"><CircleHelp size={15}/> Reviewer comment</div><p>{selected.comment}</p></div>
              <div className="location-row"><Link2 size={15}/><div><small>Suggested location</small><b>{selected.manuscript_section}</b></div><ArrowUpRight size={16}/></div>
              <div className="tabs"><button className="tab active">Suggested revision</button><button className="tab">Response draft</button><button className="tab">Evidence <span>{selected.evidence.length}</span></button></div>
              <div className="draft-area"><p>{selected.suggested_change}</p><div className="draft-note"><Sparkles size={15}/><span>{selected.rationale}</span></div></div>
              <div className="evidence-list"><div className="section-title"><span>Evidence anchors</span><button onClick={() => setPage('Evidence')}>Open library <ArrowUpRight size={13}/></button></div>{selected.evidence.map((e, i) => <EvidenceItem key={i} evidence={e}/>)}</div>
              <div className="detail-footer"><div className="status-select"><Clock3 size={15}/><select value={selected.status} onChange={e => updateStatus(e.target.value as Status)}><option>Needs review</option><option>In progress</option><option>Approved</option><option>Blocked</option></select></div><div><button className="secondary-btn" onClick={() => updateStatus('In progress')}>Request edit</button><button className="primary-btn compact" onClick={() => updateStatus('Approved')}><Check size={16}/> Approve</button></div></div>
            </section>
          </div>

          <div className="bottom-grid">
            <section className="card agent-card"><div className="panel-header"><div><h2>Agent activity</h2><p>Transparent workflow trace for this revision run.</p></div><button className="text-btn" onClick={() => setPage('Monitor')}>View monitor <ArrowUpRight size={13}/></button></div><div className="trace-mini">{trace.slice(0,4).map((item, idx) => <div className="trace-line" key={item.agent}><div className={`trace-icon ${item.status}`}>{idx < 4 ? <Check size={14}/> : <Clock3 size={14}/>}</div><div><b>{item.agent}</b><p>{item.action}</p></div><span>{item.elapsed}</span></div>)}</div></section>
            <section className="card export-card"><div className="export-aurora"/><div className="export-content"><div className="export-icon"><Send size={18}/></div><div><span className="eyebrow">FINAL STEP</span><h2>Build your response letter.</h2><p>Export a structured response-to-reviewers draft after approval.</p></div><button className="primary-btn" onClick={exportLetter}><Download size={17}/> Export DOCX</button></div></section>
          </div>
        </>}

        {page === 'Overview' && <Overview tasks={tasks} trace={trace} project={project} onOpen={() => setPage('Workspace')} />}
        {page === 'Evidence' && <EvidenceLibrary tasks={tasks} onBack={() => setPage('Workspace')} />}
        {page === 'Monitor' && <Monitor trace={trace} onBack={() => setPage('Workspace')} />}
        {page === 'Settings' && <Settings />}
      </section>
    </main>
    {modal === 'new' && <NewProjectModal onClose={() => setModal(null)} onCreate={async (title, journal, deadline) => { try { const p = await request<Project>('/projects', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({title, journal, deadline})}); setProject(p); setTasks([]); setSelected(seedTasks[0]); setConnected(true); setToast('New project created. Upload source files to begin.')} catch { setProject({...seedProject, title, journal, deadline, id: `local-${Date.now()}`, progress: 0, comments: 0, manuscripts: 0}); setTasks([]); setToast('New local demo project created.'); } setModal(null) }} />}
    {modal === 'upload' && <UploadModal project={project} onClose={() => setModal(null)} onDone={(message) => { setToast(message); setModal(null) }} />}
  </div>
}

function NavItem({icon,label,active,badge,onClick}:{icon:React.ReactNode;label:string;active?:boolean;badge?:string;onClick:()=>void}) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{badge && <em>{badge}</em>}</button> }
function StatCard({label,value,sub,icon,trend}:{label:string;value:string;sub:string;icon:React.ReactNode;trend:string}) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div className="stat-top"><span>{label}</span><b>{trend}</b></div><strong>{value}</strong><small>{sub}</small></div> }
function Priority({priority}:{priority:Priority}) { return <span className={`priority ${priority.toLowerCase()}`}>{priority}</span> }
function TaskItem({task, active, onClick}:{task:Task;active:boolean;onClick:()=>void}) { return <button className={`task-item ${active ? 'selected' : ''}`} onClick={onClick}><div className="task-top"><span>{task.id}</span><Priority priority={task.priority}/></div><b>{task.title}</b><p>{task.manuscript_section}</p><div className="task-bottom"><span>{task.category}</span><span className={`status-pill ${task.status.toLowerCase().replace(/ /g, '-')}`}>{task.status}</span></div></button> }
function EvidenceItem({evidence}:{evidence:Evidence}) { return <div className="evidence-item"><div className="evidence-head"><div><b>{evidence.source}</b><span>{evidence.location}</span></div><em>{Math.round(evidence.score*100)}% match</em></div><p>“{evidence.excerpt}”</p></div> }
function Overview({project,tasks,trace,onOpen}:{project:Project;tasks:Task[];trace:Trace[];onOpen:()=>void}) { return <><div className="page-title"><div><div className="eyebrow">PROJECT PULSE</div><h1>Keep your revision moving.</h1><p>A compact view of what has been analyzed, approved, and still needs your judgment.</p></div><button className="primary-btn" onClick={onOpen}>Open workspace <ArrowUpRight size={17}/></button></div><div className="overview-grid"><section className="card progress-card"><h2>Revision completion</h2><div className="ring"><span>{project.progress}%</span></div><div className="progress-label"><b>Revision status</b><p>High-priority technical changes should be reviewed before response export.</p></div></section><section className="card"><h2>Priority distribution</h2><div className="bar-stack">{(['High','Medium','Low'] as Priority[]).map(p=>{const amount=tasks.filter(t=>t.priority===p).length;return <div className="bar-row" key={p}><span>{p}</span><div><i style={{width:`${Math.max(8, amount/tasks.length*100)}%`}}/></div><b>{amount}</b></div>})}</div></section><section className="card"><h2>Latest signal</h2><div className="signal"><div className="signal-icon"><Sparkles size={18}/></div><div><b>{trace[0]?.agent}</b><p>{trace[0]?.action}</p><small>{trace[0]?.detail}</small></div></div></section></div></> }
function EvidenceLibrary({tasks,onBack}:{tasks:Task[];onBack:()=>void}) { const items=tasks.flatMap(t=>t.evidence.map(e=>({...e, task:t.title, id:t.id}))); return <><div className="page-title"><div><div className="eyebrow">TRACEABLE SUPPORT</div><h1>Evidence library</h1><p>Every revision suggestion should point back to a manuscript excerpt, experiment log, or cited source.</p></div><button className="secondary-btn" onClick={onBack}>Back to workspace</button></div><section className="card library-card"><div className="search-box"><Search size={17}/><input placeholder="Search evidence, source, section, or task…"/><Command size={15}/></div><div className="library-head"><span>Source</span><span>Revision task</span><span>Match</span></div>{items.map((item,i)=><div className="library-row" key={i}><div><b>{item.source}</b><p>{item.location}</p></div><div><b>{item.id}</b><p>{item.task}</p></div><div><span className="score-chip">{Math.round(item.score*100)}%</span></div><blockquote>“{item.excerpt}”</blockquote></div>)}</section></> }
function Monitor({trace,onBack}:{trace:Trace[];onBack:()=>void}) { return <><div className="page-title"><div><div className="eyebrow">OBSERVABILITY</div><h1>Run monitor</h1><p>See what each specialized agent did, what it used, and where human approval is required.</p></div><button className="secondary-btn" onClick={onBack}>Back to workspace</button></div><section className="monitor-grid">{trace.map((item,idx)=><div className="trace-card card" key={item.agent}><div className="trace-card-top"><div className={`trace-icon big ${item.status}`}>{item.status==='done'?<Check size={17}/>:<Clock3 size={17}/>}</div><span>0{idx+1}</span></div><h2>{item.agent}</h2><b>{item.action}</b><p>{item.detail}</p><div className="trace-card-foot"><span className={`status-dot ${item.status}`}>{item.status}</span><span>{item.elapsed}</span></div></div>)}</section></> }
function Settings(){return <><div className="page-title"><div><div className="eyebrow">CONFIGURATION</div><h1>Project settings</h1><p>Use demo mode for portfolio walkthroughs, then configure an API-backed agent for real projects.</p></div></div><section className="settings-grid"><div className="card setting-group"><h2>Agent runtime</h2><label>Mode<select defaultValue="Demo"><option>Demo</option><option>OpenAI Agents SDK</option><option>Custom provider</option></select></label><label>Model<select defaultValue="GPT-5 mini"><option>GPT-5 mini</option><option>GPT-5</option><option>Custom model</option></select></label><div className="setting-notice"><ShieldCheck size={17}/><span>High-impact revisions are blocked until you explicitly approve them.</span></div></div><div className="card setting-group"><h2>Workspace rules</h2><label><input type="checkbox" defaultChecked/> Require evidence on every suggestion</label><label><input type="checkbox" defaultChecked/> Preserve reviewer wording in export</label><label><input type="checkbox" defaultChecked/> Flag unsupported claims for review</label></div></section></>}
function NewProjectModal({onClose,onCreate}:{onClose:()=>void;onCreate:(title:string,journal:string,deadline:string)=>void}){const [title,setTitle]=useState('');const [journal,setJournal]=useState('');const [deadline,setDeadline]=useState('');return <div className="modal-wrap"><div className="modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon"><Plus size={20}/></div><h2>Start a revision project</h2><p>Create a workspace, then upload the manuscript and reviewer comments.</p><label>Manuscript title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Cross-view localization with…"/></label><label>Target journal<input value={journal} onChange={e=>setJournal(e.target.value)} placeholder="e.g. Sensors"/></label><label>Revision deadline<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label><button className="primary-btn full" onClick={()=>onCreate(title || 'Untitled revision project',journal || 'Target journal',deadline)}>Create workspace <ArrowUpRight size={17}/></button></div></div>}
function UploadModal({project,onClose,onDone}:{project:Project;onClose:()=>void;onDone:(m:string)=>void}){const [files,setFiles]=useState<Record<string,File|null>>({manuscript:null,reviewer:null,journal:null,bibliography:null});const [busy,setBusy]=useState(false);const inputs=useRef<Record<string,HTMLInputElement|null>>({});const items=[['manuscript','Manuscript','DOCX, PDF, or TXT'],['reviewer','Reviewer comments','PDF, DOCX, or TXT'],['journal','Journal guide','PDF or DOCX'],['bibliography','References','BIB, RIS, TXT, or DOCX']] as const;async function submit(){setBusy(true);let uploaded=0;try{for(const [kind] of items){const file=files[kind];if(!file)continue;const data=new FormData();data.append('file',file);await fetch(`${API}/projects/${project.id}/upload?kind=${kind}`,{method:'POST',body:data});uploaded++}onDone(`Uploaded ${uploaded} source file${uploaded===1?'':'s'}. Launch analysis when ready.`)}catch{onDone('Files are staged in the interface. Start the backend to persist and parse uploads.')}finally{setBusy(false)}}return <div className="modal-wrap"><div className="modal wide"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon"><UploadCloud size={20}/></div><h2>Add source material</h2><p>Use real files in the backend, or keep the default demo project for your portfolio walkthrough.</p><div className="upload-grid">{items.map(([kind,label,help])=><button className={`upload-slot ${files[kind]?'filled':''}`} key={kind} onClick={()=>inputs.current[kind]?.click()}><input ref={el=>{inputs.current[kind]=el}} type="file" hidden onChange={e=>setFiles(prev=>({...prev,[kind]:e.target.files?.[0]||null}))}/><FileText size={19}/><b>{files[kind]?.name || label}</b><span>{files[kind] ? 'Ready to upload' : help}</span></button>)}</div><button className="primary-btn full" disabled={busy} onClick={submit}>{busy?<LoaderCircle className="spin" size={17}/>:<UploadCloud size={17}/>} {busy?'Uploading':'Upload and parse files'}</button></div></div>}

createRoot(document.getElementById('root')!).render(<App />)
