import React, {useState, useEffect} from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Exams(){
  const { exams, addExam, updateExam, deleteExam } = useData()
  const { isAdmin } = useAuth()

  const empty = { name:'', start:'', end:'', subjects:'' }
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(()=>{
    if(editingId){
      const x = exams.find(e=>e.id===editingId)
      if(x) setForm(x)
    } else setForm(empty)
  }, [editingId, exams])

  function upd(k,v){ setForm(s=>({...s,[k]:v})) }
  function submit(e){
    e.preventDefault()
    if(editingId){ updateExam(editingId, form); setEditingId(null) }
    else addExam(form)
    setForm(empty)
  }
  function openAdd(){ setEditingId(null); setModalOpen(true) }
  function openEdit(id){ setEditingId(id); setModalOpen(true) }
  function confirmDelete(id){ setDeleteId(id) }
  function doDelete(){ if(deleteId){ deleteExam(deleteId); setDeleteId(null) } }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">EXAMINATION MANAGEMENT</h2>
        <div className="flex gap-4">
          <input placeholder="SEARCH EXAMS.." className="input w-64" />
          {isAdmin && <button onClick={()=>setEditingId(null)} className="btn-primary">+ CREATE EXAM</button>}
        </div>
      </div>

      <div className="mt-4 bg-gray-200 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 border">EXAM NAME</div>
          <div className="p-4 border">START DATE & TIME</div>
          <div className="p-4 border">END DATE & TIME</div>
          <div className="p-4 border">SUBJECTS</div>
        </div>

        <div className="mt-2 bg-white p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Exam Name</th>
                  <th className="border p-2">Start</th>
                  <th className="border p-2">End</th>
                  <th className="border p-2">Subjects</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map(x=> (
                  <tr key={x.id} className="h-12">
                    <td className="border p-2">{x.name}</td>
                    <td className="border p-2">{x.start}</td>
                    <td className="border p-2">{x.end}</td>
                    <td className="border p-2">{x.subjects}</td>
                    <td className="border p-2">{isAdmin ? (
                      <div className="flex gap-2">
                        <button onClick={()=>openEdit(x.id)} className="px-2 py-1 bg-yellow-200 rounded">Edit</button>
                        <button onClick={()=>confirmDelete(x.id)} className="px-2 py-1 bg-rose-200 rounded">Delete</button>
                      </div>
                    ) : <span className="text-sm text-gray-500">—</span>}</td>
                  </tr>
                ))}
                {exams.length===0 && <tr className="h-12"><td className="p-4" colSpan={5}>No exams yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {isAdmin && (
          <div>
            <Modal open={modalOpen} title={editingId ? 'Edit Exam' : 'Create Exam'} onClose={()=>{ setModalOpen(false); setEditingId(null) }}>
              <form onSubmit={(e)=>{ submit(e); setModalOpen(false); }} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">Exam Name</label>
                  <input value={form.name} onChange={e=>upd('name', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block mb-2">Subjects (comma separated)</label>
                  <input value={form.subjects} onChange={e=>upd('subjects', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block mb-2">Start Date & Time</label>
                  <input value={form.start} onChange={e=>upd('start', e.target.value)} className="input" placeholder="YYYY-MM-DD HH:MM" />
                </div>
                <div>
                  <label className="block mb-2">End Date & Time</label>
                  <input value={form.end} onChange={e=>upd('end', e.target.value)} className="input" placeholder="YYYY-MM-DD HH:MM" />
                </div>

                <div className="col-span-2 text-right">
                  <button className="bg-rose-300 px-4 py-2 rounded">{editingId? 'Update Exam' : '+ Create Exam'}</button>
                </div>
              </form>
            </Modal>

            <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
              <div>Are you sure you want to delete this exam?</div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={()=>setDeleteId(null)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
                <button onClick={()=>{ doDelete(); }} className="px-3 py-1 bg-rose-300 rounded">Delete</button>
              </div>
            </Modal>

            <div className="mt-4"/>
          </div>
        )}
      </div>
    </div>
  )
}
