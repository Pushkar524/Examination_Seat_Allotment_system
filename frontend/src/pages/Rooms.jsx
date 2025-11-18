import React, {useState, useEffect} from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Rooms(){
  const { rooms, addRoom, updateRoom, deleteRoom } = useData()
  const { isAdmin } = useAuth()

  const empty = { name:'', floor:'', capacity:0 }
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)

  useEffect(()=>{
    if(editingId){
      const r = rooms.find(x=>x.id===editingId)
      if(r) setForm(r)
    } else setForm(empty)
  }, [editingId, rooms])

  function upd(k,v){ setForm(s=>({...s,[k]:v})) }
  function submit(e){
    e.preventDefault()
    if(editingId){ updateRoom(editingId, form); setEditingId(null) }
    else addRoom(form)
    setForm(empty)
  }

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  function openAdd(){ setEditingId(null); setModalOpen(true) }
  function openEdit(id){ setEditingId(id); setModalOpen(true) }

  function confirmDelete(id){ setDeleteId(id) }
  function doDelete(){ if(deleteId){ deleteRoom(deleteId); setDeleteId(null) } }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">ROOM MANAGEMENT</h2>

      <div className="bg-white border p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3>SPECIFIC ROOMS</h3>
          <div className="flex items-center gap-4">
            {isAdmin && <div className="text-sm text-gray-600">Admin can add/edit/delete rooms</div>}
            {isAdmin && <button onClick={openAdd} className="bg-rose-300 px-3 py-1 rounded">+ Add Room</button>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3">ROOM NAME</th>
                <th className="border p-3">FLOOR</th>
                <th className="border p-3">CAPACITY</th>
                <th className="border p-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r=> (
                <tr key={r.id} className="h-14">
                  <td className="border p-2">{r.name}</td>
                  <td className="border p-2">{r.floor}</td>
                  <td className="border p-2">{r.capacity}</td>
                  <td className="border p-2">{isAdmin ? (
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit(r.id)} className="px-2 py-1 bg-yellow-200 rounded">Edit</button>
                      <button onClick={()=>confirmDelete(r.id)} className="px-2 py-1 bg-rose-200 rounded">Delete</button>
                    </div>
                  ) : <span className="text-sm text-gray-500">—</span>}</td>
                </tr>
              ))}
              {rooms.length===0 && <tr className="h-12"><td className="p-4" colSpan={4}>No rooms yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={editingId ? 'Edit Room' : 'Add Room'} onClose={()=>setModalOpen(false)}>
        <form onSubmit={(e)=>{ submit(e); setModalOpen(false) }} className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="block mb-2">Room Name</label>
            <input value={form.name} onChange={e=>upd('name', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block mb-2">Floor</label>
            <input value={form.floor} onChange={e=>upd('floor', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block mb-2">Capacity</label>
            <input type="number" value={form.capacity} onChange={e=>upd('capacity', Number(e.target.value))} className="input" />
          </div>

          <div className="col-span-3 text-right">
            <button className="bg-rose-300 px-4 py-2 rounded">{editingId? 'Update Room' : '+ Add Room'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} title="Confirm Delete" onClose={()=>setDeleteId(null)}>
        <div>Are you sure you want to delete this room?</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={()=>setDeleteId(null)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
          <button onClick={()=>{ doDelete(); setModalOpen(false) }} className="px-3 py-1 bg-rose-300 rounded">Delete</button>
        </div>
      </Modal>
    </div>
  )
}
