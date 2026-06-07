import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, KeyRound, LayoutDashboard, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react'
import { supabase, hasSupabaseConfig } from './supabase'
import { EMPTY_TASK, STATUS_META, STATUSES } from './constants'
import { currency, formatDate, getMonthMatrix, isThisMonth, sameDate, toInputDate, toDate } from './date'
import './styles.css'

function App() {
  if (!hasSupabaseConfig) return <SetupGuide />
  return <Scheduler />
}

function PageShell({ children }) {
  return <div className="page">{children}</div>
}

function SetupGuide() {
  return (
    <PageShell>
      <div className="setupCard">
        <h1>슈꾸 작업시트</h1>
        <p>Supabase 환경변수를 먼저 설정해 주세요.</p>
        <div className="codeBox">VITE_SUPABASE_URL<br />VITE_SUPABASE_ANON_KEY</div>
      </div>
    </PageShell>
  )
}

function Scheduler() {
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || ''
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('syukku-admin') === '1')
  const [tasks, setTasks] = useState([])
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()))
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')
  const [editingTask, setEditingTask] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detailTask, setDetailTask] = useState(null)

  function toggleAdmin() {
    if (isAdmin) {
      localStorage.removeItem('syukku-admin')
      setIsAdmin(false)
      return
    }
    if (!adminPassword) {
      window.alert('Netlify 환경변수에 VITE_ADMIN_PASSWORD를 먼저 등록해 주세요.')
      return
    }
    const input = window.prompt('관리자 비밀번호를 입력해 주세요.')
    if (input === adminPassword) {
      localStorage.setItem('syukku-admin', '1')
      setIsAdmin(true)
    } else if (input !== null) {
      window.alert('비밀번호가 맞지 않아요.')
    }
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').order('due_date', { ascending: true })
    setTasks(data || [])
  }

  useEffect(() => {
    loadTasks()
    const channel = supabase.channel('tasks-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadTasks).subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const text = `${task.client} ${task.option_name} ${task.extra_options} ${task.notes}`.toLowerCase()
      const matchQuery = text.includes(query.toLowerCase())
      const matchStatus = statusFilter === '전체' || task.status === statusFilter
      return matchQuery && matchStatus
    })
  }, [tasks, query, statusFilter])

  const activeMonthTasks = useMemo(() => filteredTasks.filter((task) => isThisMonth(task.due_date, month) && task.status !== '완료'), [filteredTasks, month])
  const completedMonthTasks = useMemo(() => filteredTasks.filter((task) => isThisMonth(task.due_date, month) && task.status === '완료'), [filteredTasks, month])
  const unpaidDesignerTotal = useMemo(() => tasks.filter((task) => !task.designer_paid && task.designer_fee).reduce((sum, task) => sum + Number(task.designer_fee || 0), 0), [tasks])
  const waitingCount = useMemo(() => tasks.filter((task) => task.status === '입금 대기').length, [tasks])
  const confirmCount = useMemo(() => tasks.filter((task) => ['디자인 컨펌', '이식 컨펌'].includes(task.status)).length, [tasks])

  function openNewTask() {
    setEditingTask(null)
    setFormOpen(true)
  }

  function openEditTask(task) {
    setEditingTask(task)
    setFormOpen(true)
  }

  async function saveTask(values) {
    if (!isAdmin) return
    setBusy(true)
    const payload = {
      ...values,
      price: Number(values.price || 0),
      designer_fee: Number(values.designer_fee || 0),
      updated_at: new Date().toISOString()
    }
    if (editingTask?.id) await supabase.from('tasks').update(payload).eq('id', editingTask.id)
    else await supabase.from('tasks').insert(payload)
    setFormOpen(false)
    setEditingTask(null)
    await loadTasks()
    setBusy(false)
  }

  async function deleteTask(task) {
    if (!isAdmin) return
    const ok = window.confirm(`${task.client} 작업을 삭제할까요?`)
    if (!ok) return
    await supabase.from('tasks').delete().eq('id', task.id)
    await loadTasks()
  }

  async function quickUpdate(task, patch) {
    if (!isAdmin) return
    await supabase.from('tasks').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', task.id)
    await loadTasks()
  }

  return (
    <PageShell>
      <header className="topbar">
        <div>
          <div className="eyebrow">슈꾸 작업시트</div>
          <h1>작업 스케줄러</h1>
        </div>
        <div className="headerActions">
          <div className="userBadge"><KeyRound size={16} />{isAdmin ? '관리자 모드' : '조회 모드'}<span>{isAdmin ? '수정 가능' : '확인용'}</span></div>
          {isAdmin && <button onClick={openNewTask}><Plus size={18} />작업 등록</button>}
          <button className="ghostButton compact" onClick={toggleAdmin}>{isAdmin ? '관리자 잠금' : '관리자 열기'}</button>
        </div>
      </header>

      <section className="summaryGrid">
        <SummaryCard title="입금 대기" value={`${waitingCount}건`} />
        <SummaryCard title="컨펌 대기" value={`${confirmCount}건`} />
        <SummaryCard title="이번 달 일정" value={`${activeMonthTasks.length}건`} />
        <SummaryCard title="디자이너 미정산" value={currency(unpaidDesignerTotal)} />
      </section>

      <section className="toolbar">
        <div className="searchBox"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="클라이언트, 옵션, 비고 검색" /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>전체</option>
          {STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </section>

      <main className="mainGrid">
        <CalendarPanel month={month} setMonth={setMonth} selectedDate={selectedDate} setSelectedDate={setSelectedDate} tasks={filteredTasks} />
        <MonthPanel activeTasks={activeMonthTasks} completedTasks={completedMonthTasks} month={month} onDetail={setDetailTask} />
      </main>

      {detailTask && <TaskDetailModal task={detailTask} isAdmin={isAdmin} onClose={() => setDetailTask(null)} onEdit={(task) => { setDetailTask(null); openEditTask(task) }} />}
      {formOpen && <TaskModal task={editingTask} onClose={() => setFormOpen(false)} onSave={saveTask} busy={busy} />}
    </PageShell>
  )
}

function SummaryCard({ title, value }) {
  return <div className="summaryCard"><span>{title}</span><strong>{value}</strong></div>
}

function CalendarPanel({ month, setMonth, selectedDate, setSelectedDate, tasks }) {
  const dates = getMonthMatrix(month)
  const currentMonth = month.getMonth()
  const today = new Date()

  function moveMonth(delta) {
    const next = new Date(month)
    next.setMonth(month.getMonth() + delta)
    setMonth(next)
  }

  return (
    <section className="card calendarCard">
      <div className="cardHeader">
        <div><CalendarDays size={20} /><h2>{month.getFullYear()}년 {month.getMonth() + 1}월</h2></div>
        <div className="monthButtons"><button onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button><button onClick={() => moveMonth(1)}><ChevronRight size={18} /></button></div>
      </div>
      <div className="weekdays">{['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendarGrid">
        {dates.map((date) => {
          const key = toInputDate(date)
          const dayTasks = tasks.filter((task) => task.due_date === key)
          const statusCounts = dayTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1
            return acc
          }, {})
          return (
            <button key={key} className={`dayCell ${date.getMonth() !== currentMonth ? 'muted' : ''} ${selectedDate === key ? 'selected' : ''} ${sameDate(date, today) ? 'today' : ''}`} onClick={() => setSelectedDate(key)}>
              <span>{date.getDate()}</span>
              <div className="calendarTasks calendarTasksDesktop">
                {dayTasks.slice(0, 3).map((task) => (
                  <span key={task.id} className={`calendarTask ${STATUS_META[task.status]?.className || 'status'}`}>{task.client || '미입력'}</span>
                ))}
                {dayTasks.length > 3 && <em>+{dayTasks.length - 3}</em>}
              </div>
              <div className="calendarTasks calendarTasksMobile">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span key={status} className={`calendarDot ${STATUS_META[status]?.className || 'status'}`}>{count}</span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function MonthPanel({ activeTasks, completedTasks, month, onDetail }) {
  const hasTasks = activeTasks.length > 0 || completedTasks.length > 0

  return (
    <section className="card weekCard">
      <div className="cardHeader"><div><LayoutDashboard size={20} /><h2>{month.getMonth() + 1}월 일정</h2></div></div>
      <div className="weekList">
        {!hasTasks && <div className="empty">이번 달 일정이 없어요.</div>}
        {activeTasks.map((task) => <TaskMini key={task.id} task={task} onClick={() => onDetail(task)} />)}
        {completedTasks.length > 0 && (
          <div className="completedTaskGroup">
            <div className="completedTaskDivider">완료된 일정</div>
            {completedTasks.map((task) => <TaskMini key={task.id} task={task} onClick={() => onDetail(task)} completed />)}
          </div>
        )}
      </div>
    </section>
  )
}

function TaskMini({ task, onClick, completed = false }) {
  return (
    <article className={completed ? "taskMini completedTaskMini" : "taskMini"}>
      <button className="taskMiniInfo" onClick={onClick}>
        <div><strong>{formatDate(task.due_date)}</strong><span>{task.client || '클라이언트 미입력'}</span></div>
        <StatusBadge status={task.status} />
      </button>
      <div className="taskMiniActions">
        <button className="miniDetailButton" onClick={onClick}>상세 보기</button>
        {task.material_url && <a className="miniMaterialLink" href={task.material_url} target="_blank" rel="noreferrer">자료 확인 <ExternalLink size={13} /></a>}
      </div>
    </article>
  )
}


function TaskDetailModal({ task, isAdmin, onClose, onEdit }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal detailModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader"><h2>{task.client || '클라이언트 미입력'}</h2><button type="button" onClick={onClose}>닫기</button></div>
        <div className="detailTop">
          <StatusBadge status={task.status} />
          <span className={task.designer_paid ? 'paidText detailPay' : 'unpaidText detailPay'}>{task.designer_paid ? '디자이너 정산 완료' : '디자이너 정산 미완료'}</span>
        </div>
        <div className="detailGrid">
          <DetailItem label="옵션" value={task.option_name || '-'} />
          <DetailItem label="추가옵션" value={task.extra_options || '-'} />
          <DetailItem label="시작일" value={formatDate(task.start_date)} />
          <DetailItem label="마감일" value={formatDate(task.due_date)} />
          <DetailItem label="금액" value={currency(task.price)} />
          <DetailItem label="디자이너 정산금액" value={currency(task.designer_fee)} />
        </div>
        {task.notes && <div className="detailNote"><span>비고</span><p>{task.notes}</p></div>}
        <div className="detailActions">
          {task.material_url && <a className="materialLink big" href={task.material_url} target="_blank" rel="noreferrer">자료 확인 <ExternalLink size={16} /></a>}
          {isAdmin && <button type="button" onClick={() => onEdit(task)}><Pencil size={16} />수정하기</button>}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }) {
  return <div className="detailItem"><span>{label}</span><strong>{value}</strong></div>
}

function TaskSection({ title, tasks, isAdmin, onEdit, onDelete, onQuickUpdate }) {
  return (
    <section className="card taskSection">
      <div className="cardHeader"><div><CheckCircle2 size={20} /><h2>{title}</h2></div></div>
      <div className="taskList">
        {tasks.length === 0 && <div className="empty">표시할 작업이 없어요.</div>}
        {tasks.map((task) => <TaskCard key={task.id} task={task} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} onQuickUpdate={onQuickUpdate} />)}
      </div>
    </section>
  )
}

function TaskCard({ task, isAdmin, onEdit, onDelete, onQuickUpdate }) {
  return (
    <article className="taskCard">
      <div className="taskMain">
        <div className="taskTitleLine">
          <h3>{task.client || '클라이언트 미입력'}</h3>
          <StatusBadge status={task.status} />
        </div>
        <div className="taskMeta">
          <span>옵션: {task.option_name || '-'}</span>
          <span>추가옵션: {task.extra_options || '-'}</span>
          <span>시작: {formatDate(task.start_date)}</span>
          <span>마감: {formatDate(task.due_date)}</span>
        </div>
        <div className="taskMoney">
          <span>금액 {currency(task.price)}</span>
          <span>디자이너 정산 {currency(task.designer_fee)}</span>
          <span className={task.designer_paid ? 'paidText' : 'unpaidText'}>{task.designer_paid ? '정산 완료' : '정산 미완료'}</span>
        </div>
        {task.notes && <p>{task.notes}</p>}
        {task.material_url && <a className="materialLink" href={task.material_url} target="_blank" rel="noreferrer">자료 링크 열기 <ExternalLink size={14} /></a>}
      </div>
      {isAdmin && <div className="taskActions"><select value={task.status} onChange={(e) => onQuickUpdate(task, { status: e.target.value })}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><label className="checkLine"><input type="checkbox" checked={task.designer_paid} onChange={(e) => onQuickUpdate(task, { designer_paid: e.target.checked })} />정산 완료</label><button onClick={() => onEdit(task)}><Pencil size={16} /></button><button className="danger" onClick={() => onDelete(task)}><Trash2 size={16} /></button></div>}
    </article>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { className: 'status' }
  return <span className={meta.className}>{status}</span>
}

function TaskModal({ task, onClose, onSave, busy }) {
  const [values, setValues] = useState(task || EMPTY_TASK)

  function setValue(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function submit(event) {
    event.preventDefault()
    onSave(values)
  }

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader"><h2>{task ? '작업 수정' : '작업 등록'}</h2><button type="button" onClick={onClose}>닫기</button></div>
        <div className="formGrid">
          <Field label="클라이언트"><input value={values.client || ''} onChange={(e) => setValue('client', e.target.value)} required /></Field>
          <Field label="옵션"><input value={values.option_name || ''} onChange={(e) => setValue('option_name', e.target.value)} /></Field>
          <Field label="추가옵션"><input value={values.extra_options || ''} onChange={(e) => setValue('extra_options', e.target.value)} /></Field>
          <Field label="작업 상태"><select value={values.status || '입금 대기'} onChange={(e) => setValue('status', e.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Field>
          <Field label="시작일"><input type="date" value={values.start_date || ''} onChange={(e) => setValue('start_date', e.target.value)} /></Field>
          <Field label="마감일"><input type="date" value={values.due_date || ''} onChange={(e) => setValue('due_date', e.target.value)} /></Field>
          <Field label="금액"><input type="number" value={values.price || ''} onChange={(e) => setValue('price', e.target.value)} min="0" /></Field>
          <Field label="디자이너 정산금액"><input type="number" value={values.designer_fee || ''} onChange={(e) => setValue('designer_fee', e.target.value)} min="0" /></Field>
          <Field label="자료 링크"><input value={values.material_url || ''} onChange={(e) => setValue('material_url', e.target.value)} placeholder="https://drive.google.com/..." /></Field>
          <label className="formCheck"><input type="checkbox" checked={Boolean(values.designer_paid)} onChange={(e) => setValue('designer_paid', e.target.checked)} />디자이너 정산 완료</label>
          <Field label="비고" wide><textarea value={values.notes || ''} onChange={(e) => setValue('notes', e.target.value)} rows="4" /></Field>
        </div>
        <div className="modalActions"><button type="button" className="ghostButton" onClick={onClose}>취소</button><button disabled={busy}><Save size={17} />저장</button></div>
      </form>
    </div>
  )
}

function Field({ label, children, wide }) {
  return <label className={wide ? 'field wide' : 'field'}><span>{label}</span>{children}</label>
}

createRoot(document.getElementById('root')).render(<App />)
