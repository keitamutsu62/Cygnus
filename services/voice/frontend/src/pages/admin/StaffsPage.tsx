import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { OrbitSVG } from './AdminLayout'

const josefin = "'Josefin Sans', sans-serif"
const zen     = "'Zen Kaku Gothic New', sans-serif"
const border  = '#E4E0D8'
const muted   = '#999'

interface Staff { id: number; name: string; role: string; photo: string | null; overall: number; count: number }

const STORAGE_KEY = 'cygnus_staffs'

const INITIAL: Staff[] = [
  { id: 1, name: '田中 美咲', role: 'スタイリスト', photo: null, overall: 4.8, count: 32 },
  { id: 2, name: '佐藤 れな', role: 'スタイリスト', photo: null, overall: 4.5, count: 28 },
  { id: 3, name: '山本 あい', role: 'アシスタント', photo: null, overall: 4.3, count: 21 },
  { id: 4, name: '鈴木 花',   role: 'アシスタント', photo: null, overall: 4.1, count: 15 },
]

function loadStaffs(): Staff[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL))
    return INITIAL
  } catch { return INITIAL }
}

function saveStaffs(staffs: Staff[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staffs))
}

function Stars({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <svg key={n} viewBox="0 0 24 24" width="12" height="12"
          fill={n <= Math.round(value) ? '#F59E0B' : 'none'}
          stroke={n <= Math.round(value) ? '#F59E0B' : '#DDD'}
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </div>
  )
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) return <img src={photo} alt={name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
      background: '#F0EDE6', border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: josefin, fontWeight: 100, fontSize: 16, color: '#888',
    }}>{name[0]}</div>
  )
}

function StaffModal({ staff, onClose, onSave }: {
  staff: Staff | null
  onClose: () => void
  onSave: (s: Omit<Staff, 'id' | 'overall' | 'count'>) => void
}) {
  const [name, setName] = useState(staff?.name ?? '')
  const [role, setRole] = useState(staff?.role ?? 'スタイリスト')
  const [photo, setPhoto] = useState<string | null>(staff?.photo ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        width: '100%', background: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: '28px 20px 40px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#1a1816' }}>
            {staff ? 'Edit Staff' : 'Add Staff'}
          </span>
          <button onClick={onClose} style={{ fontFamily: josefin, fontWeight: 100, fontSize: 12, letterSpacing: '0.1em', color: muted, background: 'none', border: 'none', cursor: 'pointer' }}>CLOSE</button>
        </div>

        {/* Photo */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            {photo
              ? <img src={photo} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#F0EDE6', border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: josefin, fontWeight: 100, fontSize: 24, color: '#888',
                }}>{name[0] || '?'}</div>
            }
            <button onClick={() => fileRef.current?.click()} style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 26, height: 26, borderRadius: '50%',
              background: '#1a1816', border: '2px solid #fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, marginTop: 8, letterSpacing: '0.1em' }}>PHOTO</span>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: muted, display: 'block', marginBottom: 8 }}>名前</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="田中 美咲"
            style={{
              width: '100%', padding: '12px 14px', boxSizing: 'border-box' as const,
              border: `1px solid ${border}`, borderRadius: 4,
              fontFamily: zen, fontSize: 15, color: '#1a1816',
              background: '#FAFAF8', outline: 'none',
            }}
          />
        </div>

        {/* Role */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontFamily: josefin, fontWeight: 100, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: muted, display: 'block', marginBottom: 8 }}>役職</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['スタイリスト', 'アシスタント', 'マネージャー'].map(r => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '10px 0',
                border: `1px solid ${role === r ? '#1a1816' : border}`,
                borderRadius: 4,
                background: role === r ? '#1a1816' : '#FAFAF8',
                color: role === r ? '#fff' : muted,
                fontFamily: zen, fontSize: 12, cursor: 'pointer',
              }}>{r}</button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { if (!name.trim()) return; onSave({ name: name.trim(), role, photo }); onClose() }}
          style={{
            width: '100%', padding: 15,
            background: name.trim() ? '#1a1816' : '#E0DDD6',
            border: 'none', borderRadius: 4, cursor: name.trim() ? 'pointer' : 'default',
            fontFamily: josefin, fontWeight: 100, fontSize: 13, letterSpacing: '0.2em',
            textTransform: 'uppercase' as const, color: name.trim() ? '#fff' : muted,
          }}
        >
          {staff ? '変更を保存' : 'スタッフを追加'}
        </button>
      </div>
    </div>
  )
}

export default function StaffsPage() {
  const navigate = useNavigate()
  const [staffs, setStaffs] = useState<Staff[]>(loadStaffs)
  const [modal, setModal] = useState<'add' | Staff | null>(null)

  function updateStaffs(next: Staff[]) {
    setStaffs(next)
    saveStaffs(next)
  }

  function handleSave(data: Omit<Staff, 'id' | 'overall' | 'count'>) {
    if (modal === 'add') {
      updateStaffs([...staffs, { ...data, id: Date.now(), overall: 0, count: 0 }])
    } else if (modal && typeof modal === 'object') {
      updateStaffs(staffs.map(s => s.id === (modal as Staff).id ? { ...s, ...data } : s))
    }
  }

  return (
    <div style={{ padding: '20px 20px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <OrbitSVG />
          <span style={{ fontFamily: josefin, fontWeight: 200, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#1a1816' }}>Staff</span>
        </div>
        <button
          onClick={() => setModal('add')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: '#1a1816', border: 'none', borderRadius: 4, cursor: 'pointer',
            fontFamily: josefin, fontWeight: 100, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#fff',
          }}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="white" strokeWidth="1.8">
            <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
          </svg>
          Add
        </button>
      </div>

      {/* List */}
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 4, overflow: 'hidden' }}>
        {staffs.map((staff, i) => (
          <div
            key={staff.id}
            onClick={() => navigate(`/admin/staffs/${staff.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 18px',
              borderBottom: i < staffs.length - 1 ? `1px solid ${border}` : 'none',
              cursor: 'pointer',
            }}
          >
            <Avatar name={staff.name} photo={staff.photo} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: zen, fontWeight: 400, fontSize: 15, color: '#1a1816', marginBottom: 3 }}>{staff.name}</div>
              <div style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted, letterSpacing: '0.05em', marginBottom: staff.count > 0 ? 5 : 0 }}>{staff.role}</div>
              {staff.count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stars value={staff.overall} />
                  <span style={{ fontFamily: josefin, fontWeight: 100, fontSize: 11, color: muted }}>{staff.overall} · {staff.count}件</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={e => { e.stopPropagation(); setModal(staff) }}
                style={{ padding: '7px 10px', background: '#F8F7F4', border: `1px solid ${border}`, borderRadius: 4, cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#666" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
              <button
                onClick={e => { e.stopPropagation(); if (confirm('削除しますか？')) updateStaffs(staffs.filter(s => s.id !== staff.id)) }}
                style={{ padding: '7px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#EF4444" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {(modal === 'add' || (modal && typeof modal === 'object')) && (
        <StaffModal
          staff={modal === 'add' ? null : modal as Staff}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
