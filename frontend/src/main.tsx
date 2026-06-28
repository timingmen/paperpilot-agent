import React, { useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Command,
  Download,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import { seedProject, seedTasks, seedTrace } from './demoData'
import { priorityLabel, statusLabel, uiText } from './i18n'
import { getWorkspaceMetrics } from './state'
import type { Evidence, Priority, Project, Status, Task, Trace } from './types'
import './styles.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const statusOptions: Status[] = ['Needs review', 'In progress', 'Approved', 'Blocked']

type Page = 'Overview' | 'Workspace' | 'Evidence' | 'Monitor' | 'Settings'
type Filter = 'All' | Status

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, options)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

function App() {
  const [page, setPage] = useState<Page>('Workspace')
  const [project, setProject] = useState<Project>(seedProject)
  const [tasks, setTasks] = useState<Task[]>(seedTasks)
  const [trace, setTrace] = useState<Trace[]>(seedTrace)
  const [selectedId, setSelectedId] = useState(seedTasks[0]?.id ?? '')
  const [filter, setFilter] = useState<Filter>('All')
  const [modal, setModal] = useState<'new' | 'upload' | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [connected, setConnected] = useState(false)

  const filtered = useMemo(() => filter === 'All' ? tasks : tasks.filter(t => t.status === filter), [tasks, filter])
  const selected = useMemo(() => tasks.find(t => t.id === selectedId) ?? tasks[0] ?? null, [selectedId, tasks])
  const metrics = useMemo(() => getWorkspaceMetrics(tasks), [tasks])

  async function launchAnalysis() {
    setBusy(true)
    setToast('')
    try {
      const result = await request<{project: Project; tasks: Task[]; trace: Trace[]}>(`/projects/${project.id}/analyze`, { method: 'POST' })
      setProject(result.project)
      setTasks(result.tasks)
      setTrace(result.trace)
      setSelectedId(result.tasks[0]?.id ?? '')
      setConnected(true)
      setToast('分析完成。修订工作台已更新。')
    } catch {
      setConnected(false)
      setToast('无法连接后端。可以启动 FastAPI，或继续使用本地演示数据。')
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(status: Status) {
    if (!selected) return
    const previousTasks = tasks
    setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, status } : t))
    try {
      const updated = await request<Task>(`/projects/${project.id}/tasks/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
      setSelectedId(updated.id)
      setConnected(true)
      setToast(status === 'Approved' ? '任务已批准，可纳入导出文档。' : '任务状态已更新。')
    } catch {
      setTasks(previousTasks)
      setConnected(false)
      setToast('后端不可用，状态未保存。')
    }
  }

  async function exportLetter() {
    try {
      const res = await fetch(`${API}/projects/${project.id}/export/response-letter`)
      if (res.status === 409) throw new Error('approval-required')
      if (!res.ok) throw new Error('unavailable')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'paperpilot_response_to_reviewers.docx'
      a.click()
      URL.revokeObjectURL(url)
      setConnected(true)
      setToast('英文 response letter 已导出。')
    } catch (error) {
      setToast(error instanceof Error && error.message === 'approval-required'
        ? '请先批准至少一个任务，再导出 response letter。'
        : '请启动后端服务后再导出 DOCX。')
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>PaperPilot</span></div>
      <div className="workspace-switcher"><div className="avatar">JC</div><div><b>Junyu 实验室</b><small>科研修订工作区</small></div><ChevronDown size={15}/></div>
      <nav>
        <NavItem icon={<LayoutDashboard size={18}/>} label={uiText.navigation.overview} active={page === 'Overview'} onClick={() => setPage('Overview')} />
        <NavItem icon={<ClipboardCheck size={18}/>} label={uiText.navigation.workspace} active={page === 'Workspace'} badge={metrics.badge} onClick={() => setPage('Workspace')} />
        <NavItem icon={<BookOpenCheck size={18}/>} label={uiText.navigation.evidence} active={page === 'Evidence'} onClick={() => setPage('Evidence')} />
        <NavItem icon={<Gauge size={18}/>} label={uiText.navigation.monitor} active={page === 'Monitor'} onClick={() => setPage('Monitor')} />
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => setPage('Settings')}><Settings2 size={18}/><span>{uiText.navigation.settings}</span></button>
        <div className="credit-card"><div className="credit-icon"><Bot size={17}/></div><div><b>Agent 模式</b><small>{connected ? '后端已连接' : '演示工作流就绪'}</small></div><span className="pulse-dot"/></div>
      </div>
    </aside>

    <main className="main-panel">
      <header className="topbar">
        <div className="crumb"><FolderOpen size={16}/><span>项目</span><span className="slash">/</span><b>{project.title}</b></div>
        <div className="top-actions"><button className="icon-btn"><Search size={18}/></button><button className="icon-btn"><Bell size={18}/><i/></button><div className="profile">JC</div></div>
      </header>

      <section className="content">
        {page === 'Workspace' && <>
          <div className="hero-row">
            <div><div className="eyebrow">修订智能体</div><h1>把审稿意见整理成清晰的修订计划。</h1><p>PaperPilot 使用本地 BGE 向量检索定位稿件证据，由 DeepSeek 草拟英文修改建议，并在导出前保留人工审批控制。</p></div>
            <div className="hero-actions"><button className="secondary-btn" onClick={() => setModal('upload')}><UploadCloud size={17}/> {uiText.actions.uploadFiles}</button><button className="primary-btn" onClick={launchAnalysis} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} {busy ? uiText.actions.runningAnalysis : uiText.actions.launchAnalysis}</button></div>
          </div>

          {toast && <div className="toast"><Check size={16}/><span>{toast}</span><button onClick={() => setToast('')}><X size={15}/></button></div>}

          <div className="stats-grid">
            <StatCard label="修订进度" value={`${metrics.completion}%`} sub={`${metrics.needsApproval} 项需要审批`} icon={<BarChart3 size={20}/>} trend="推进中" />
            <StatCard label="可执行意见" value={String(tasks.length)} sub={`${metrics.highPriority} 项高优先级`} icon={<ClipboardCheck size={20}/>} trend="已解析" />
            <StatCard label="审批比例" value={`${metrics.completion}%`} sub={`${metrics.approved} 项已批准`} icon={<ShieldCheck size={20}/>} trend="人工确认" />
            <StatCard label="回复草稿" value="就绪" sub="审批后导出" icon={<FileText size={20}/>} trend="结构化" />
          </div>

          <div className="workspace-layout">
            <section className="task-panel card">
              <div className="panel-header"><div><h2>修订队列</h2><p>每个任务都绑定证据、建议修改和面向审稿人的英文回复草稿。</p></div><button className="light-btn" onClick={() => setModal('new')}><Plus size={16}/> {uiText.actions.newProject}</button></div>
              <div className="filter-row">{(['All', ...statusOptions.filter(status => status !== 'Blocked')] as const).map(item => <button key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{item === 'All' ? '全部' : statusLabel(item)}<span>{item === 'All' ? tasks.length : tasks.filter(t => t.status === item).length}</span></button>)}</div>
              <div className="task-list">{filtered.length ? filtered.map(task => <TaskItem key={task.id} task={task} active={task.id === selected?.id} onClick={() => setSelectedId(task.id)} />) : <EmptyQueue />}</div>
            </section>

            <section className="detail-panel card">
              {selected ? <>
                <div className="detail-heading"><div><div className="small-meta"><span>{selected.id}</span><span>/</span><span>{selected.reviewer}</span><PriorityBadge priority={selected.priority}/></div><h2>{selected.title}</h2></div><button className="icon-btn"><MoreHorizontal size={18}/></button></div>
                <div className="comment-box"><div className="comment-label"><CircleHelp size={15}/> 审稿意见</div><p>{selected.comment}</p></div>
                <div className="location-row"><Link2 size={15}/><div><small>建议修改位置</small><b>{selected.manuscript_section}</b></div><ArrowUpRight size={16}/></div>
                <div className="tabs"><button className="tab active">建议修改</button><button className="tab">回复草稿</button><button className="tab">证据 <span>{selected.evidence.length}</span></button></div>
                <div className="draft-area"><p>{selected.suggested_change}</p><div className="draft-note"><Sparkles size={15}/><span>{selected.rationale}</span></div></div>
                <div className="evidence-list"><div className="section-title"><span>证据锚点</span><button onClick={() => setPage('Evidence')}>打开证据库 <ArrowUpRight size={13}/></button></div>{selected.evidence.map((e, i) => <EvidenceItem key={i} evidence={e}/>)}</div>
                <div className="detail-footer"><div className="status-select"><Clock3 size={15}/><select value={selected.status} onChange={e => updateStatus(e.target.value as Status)}>{statusOptions.map(status => <option value={status} key={status}>{statusLabel(status)}</option>)}</select></div><div><button className="secondary-btn" onClick={() => updateStatus('In progress')}>{uiText.actions.requestEdit}</button><button className="primary-btn compact" onClick={() => updateStatus('Approved')}><Check size={16}/> {uiText.actions.approve}</button></div></div>
              </> : <EmptyDetail onUpload={() => setModal('upload')} />}
            </section>
          </div>

          <div className="bottom-grid">
            <section className="card agent-card"><div className="panel-header"><div><h2>Agent 活动</h2><p>当前修订运行的透明执行轨迹。</p></div><button className="text-btn" onClick={() => setPage('Monitor')}>查看监控 <ArrowUpRight size={13}/></button></div><div className="trace-mini">{trace.slice(0,4).map((item, idx) => <div className="trace-line" key={item.agent}><div className={`trace-icon ${item.status}`}>{idx < 4 ? <Check size={14}/> : <Clock3 size={14}/>}</div><div><b>{item.agent}</b><p>{item.action}</p></div><span>{item.elapsed}</span></div>)}</div></section>
            <section className="card export-card"><div className="export-aurora"/><div className="export-content"><div className="export-icon"><Send size={18}/></div><div><span className="eyebrow">最终步骤</span><h2>生成英文 response letter。</h2><p>审批后导出结构化的 response-to-reviewers 草稿。</p></div><button className="primary-btn" onClick={exportLetter}><Download size={17}/> {uiText.actions.exportDocx}</button></div></section>
          </div>
        </>}

        {page === 'Overview' && <Overview tasks={tasks} trace={trace} project={project} onOpen={() => setPage('Workspace')} />}
        {page === 'Evidence' && <EvidenceLibrary tasks={tasks} onBack={() => setPage('Workspace')} />}
        {page === 'Monitor' && <Monitor trace={trace} onBack={() => setPage('Workspace')} />}
        {page === 'Settings' && <Settings />}
      </section>
    </main>
    {modal === 'new' && <NewProjectModal onClose={() => setModal(null)} onCreate={async (title, journal, deadline) => {
      try {
        const p = await request<Project>('/projects', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({title, journal, deadline}),
        })
        setProject(p)
        setTasks([])
        setSelectedId('')
        setConnected(true)
        setToast('新项目已创建。请上传源文件开始分析。')
      } catch {
        setProject({...seedProject, title, journal, deadline, id: `local-${Date.now()}`, progress: 0, comments: 0, manuscripts: 0})
        setTasks([])
        setSelectedId('')
        setConnected(false)
        setToast('后端不可用，已创建本地项目草稿。')
      }
      setModal(null)
    }} />}
    {modal === 'upload' && <UploadModal project={project} onClose={() => setModal(null)} onDone={(message) => { setToast(message); setModal(null) }} />}
  </div>
}

function NavItem({icon,label,active,badge,onClick}:{icon:React.ReactNode;label:string;active?:boolean;badge?:string;onClick:()=>void}) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{badge && <em>{badge}</em>}</button>
}

function StatCard({label,value,sub,icon,trend}:{label:string;value:string;sub:string;icon:React.ReactNode;trend:string}) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div className="stat-top"><span>{label}</span><b>{trend}</b></div><strong>{value}</strong><small>{sub}</small></div>
}

function PriorityBadge({priority}:{priority:Priority}) {
  return <span className={`priority ${priority.toLowerCase()}`}>{priorityLabel(priority)}</span>
}

function EmptyQueue() {
  return <div className="empty-state compact"><ClipboardCheck size={22}/><b>暂无修订任务</b><p>上传审稿意见并启动分析后，任务会出现在这里。</p></div>
}

function EmptyDetail({onUpload}:{onUpload:()=>void}) {
  return <div className="empty-state detail-empty"><Sparkles size={28}/><h2>尚未选择任务</h2><p>创建或分析项目后，可以查看审稿意见、证据锚点和英文回复草稿。</p><button className="secondary-btn" onClick={onUpload}><UploadCloud size={17}/> {uiText.actions.uploadFiles}</button></div>
}

function TaskItem({task, active, onClick}:{task:Task;active:boolean;onClick:()=>void}) {
  return <button className={`task-item ${active ? 'selected' : ''}`} onClick={onClick}><div className="task-top"><span>{task.id}</span><PriorityBadge priority={task.priority}/></div><b>{task.title}</b><p>{task.manuscript_section}</p><div className="task-bottom"><span>{task.category}</span><span className={`status-pill ${task.status.toLowerCase().replace(/ /g, '-')}`}>{statusLabel(task.status)}</span></div></button>
}

function EvidenceItem({evidence}:{evidence:Evidence}) {
  return <div className="evidence-item"><div className="evidence-head"><div><b>{evidence.source}</b><span>{evidence.location}</span></div><em>{Math.round(evidence.score*100)}% 匹配</em></div><p>"{evidence.excerpt}"</p></div>
}

function Overview({project,tasks,trace,onOpen}:{project:Project;tasks:Task[];trace:Trace[];onOpen:()=>void}) {
  return <><div className="page-title"><div><div className="eyebrow">项目脉搏</div><h1>持续推进你的论文修订。</h1><p>快速查看已分析、已批准以及仍需判断的修订工作。</p></div><button className="primary-btn" onClick={onOpen}>打开工作台 <ArrowUpRight size={17}/></button></div><div className="overview-grid"><section className="card progress-card"><h2>修订完成度</h2><div className="ring"><span>{project.progress}%</span></div><div className="progress-label"><b>修订状态</b><p>高优先级技术修改应在导出回复前完成复核。</p></div></section><section className="card"><h2>优先级分布</h2><div className="bar-stack">{(['High','Medium','Low'] as Priority[]).map(p=>{const amount=tasks.filter(t=>t.priority===p).length;return <div className="bar-row" key={p}><span>{priorityLabel(p)}</span><div><i style={{width:`${Math.max(8, amount/Math.max(tasks.length,1)*100)}%`}}/></div><b>{amount}</b></div>})}</div></section><section className="card"><h2>最新信号</h2><div className="signal"><div className="signal-icon"><Sparkles size={18}/></div><div><b>{trace[0]?.agent}</b><p>{trace[0]?.action}</p><small>{trace[0]?.detail}</small></div></div></section></div></>
}

function EvidenceLibrary({tasks,onBack}:{tasks:Task[];onBack:()=>void}) {
  const items=tasks.flatMap(t=>t.evidence.map(e=>({...e, task:t.title, id:t.id})))
  return <><div className="page-title"><div><div className="eyebrow">可追溯证据</div><h1>证据库</h1><p>每条修订建议都应回到稿件片段、实验日志或可引用来源。</p></div><button className="secondary-btn" onClick={onBack}>返回工作台</button></div><section className="card library-card"><div className="search-box"><Search size={17}/><input placeholder="搜索证据、来源、章节或任务"/><Command size={15}/></div><div className="library-head"><span>来源</span><span>修订任务</span><span>匹配度</span></div>{items.map((item,i)=><div className="library-row" key={i}><div><b>{item.source}</b><p>{item.location}</p></div><div><b>{item.id}</b><p>{item.task}</p></div><div><span className="score-chip">{Math.round(item.score*100)}%</span></div><blockquote>"{item.excerpt}"</blockquote></div>)}</section></>
}

function Monitor({trace,onBack}:{trace:Trace[];onBack:()=>void}) {
  return <><div className="page-title"><div><div className="eyebrow">可观测性</div><h1>运行监控</h1><p>查看每个专用 agent 做了什么、用了哪些信息，以及哪里需要人工审批。</p></div><button className="secondary-btn" onClick={onBack}>返回工作台</button></div><section className="monitor-grid">{trace.map((item,idx)=><div className="trace-card card" key={item.agent}><div className="trace-card-top"><div className={`trace-icon big ${item.status}`}>{item.status==='done'?<Check size={17}/>:<Clock3 size={17}/>}</div><span>0{idx+1}</span></div><h2>{item.agent}</h2><b>{item.action}</b><p>{item.detail}</p><div className="trace-card-foot"><span className={`status-dot ${item.status}`}>{item.status === 'done' ? '完成' : '等待'}</span><span>{item.elapsed}</span></div></div>)}</section></>
}

function Settings() {
  return <><div className="page-title"><div><div className="eyebrow">配置</div><h1>项目设置</h1><p>当前后端使用本地向量检索与 DeepSeek 结构化生成。</p></div></div><section className="settings-grid"><div className="card setting-group"><h2>Agent 运行时</h2><label>运行模式<input value="DeepSeek 向量 RAG" readOnly/></label><label>生成模型<input value="deepseek-v4-flash" readOnly/></label><label>嵌入模型<input value="BAAI/bge-small-en-v1.5" readOnly/></label><div className="setting-notice"><ShieldCheck size={17}/><span>稿件向量在本地生成，高影响修订必须批准后才会进入导出。</span></div></div><div className="card setting-group"><h2>工作区规则</h2><label><input type="checkbox" defaultChecked/> 每条建议必须有证据</label><label><input type="checkbox" defaultChecked/> 导出时保留审稿意见措辞</label><label><input type="checkbox" defaultChecked/> 标记缺少支持的主张</label></div></section></>
}

function NewProjectModal({onClose,onCreate}:{onClose:()=>void;onCreate:(title:string,journal:string,deadline:string)=>void|Promise<void>}) {
  const [title,setTitle]=useState('')
  const [journal,setJournal]=useState('')
  const [deadline,setDeadline]=useState('')
  return <div className="modal-wrap"><div className="modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon"><Plus size={20}/></div><h2>创建修订项目</h2><p>先建立工作区，再上传稿件和审稿意见。</p><label>论文标题<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如 Cross-view localization with..."/></label><label>目标期刊<input value={journal} onChange={e=>setJournal(e.target.value)} placeholder="例如 Sensors"/></label><label>修订截止日期<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label><button className="primary-btn full" onClick={()=>onCreate(title || 'Untitled revision project',journal || 'Target journal',deadline)}>创建工作区 <ArrowUpRight size={17}/></button></div></div>
}

function UploadModal({project,onClose,onDone}:{project:Project;onClose:()=>void;onDone:(m:string)=>void}) {
  const [files,setFiles]=useState<Record<string,File|null>>({manuscript:null,reviewer:null,journal:null,bibliography:null})
  const [busy,setBusy]=useState(false)
  const inputs=useRef<Record<string,HTMLInputElement|null>>({})
  const items=[
    ['manuscript','稿件正文','DOCX、PDF 或 TXT'],
    ['reviewer','审稿意见','PDF、DOCX 或 TXT'],
    ['journal','期刊指南','PDF 或 DOCX'],
    ['bibliography','参考文献','BIB、RIS、TXT 或 DOCX'],
  ] as const

  async function submit() {
    setBusy(true)
    let uploaded=0
    try {
      for (const [kind] of items) {
        const file=files[kind]
        if(!file) continue
        const data=new FormData()
        data.append('file',file)
        const res=await fetch(`${API}/projects/${project.id}/upload?kind=${kind}`,{method:'POST',body:data})
        if(!res.ok) throw new Error(`Upload failed: ${res.status}`)
        uploaded++
      }
      onDone(`已上传 ${uploaded} 个源文件。准备好后可以启动分析。`)
    } catch {
      onDone('文件未保存。请启动后端后重试。')
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-wrap"><div className="modal wide"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon"><UploadCloud size={20}/></div><h2>添加源材料</h2><p>连接后端时可上传真实文件；作品集演示也可以继续使用默认项目。</p><div className="upload-grid">{items.map(([kind,label,help])=><button className={`upload-slot ${files[kind]?'filled':''}`} key={kind} onClick={()=>inputs.current[kind]?.click()}><input ref={el=>{inputs.current[kind]=el}} type="file" hidden onChange={e=>setFiles(prev=>({...prev,[kind]:e.target.files?.[0]||null}))}/><FileText size={19}/><b>{files[kind]?.name || label}</b><span>{files[kind] ? '准备上传' : help}</span></button>)}</div><button className="primary-btn full" disabled={busy} onClick={submit}>{busy?<LoaderCircle className="spin" size={17}/>:<UploadCloud size={17}/>} {busy?'上传中':'上传并解析文件'}</button></div></div>
}

createRoot(document.getElementById('root')!).render(<App />)
