import React from 'react'

export default function Modal({open, title, onClose, children}){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose}></div>
      <div className="bg-white rounded shadow-lg z-10 max-w-3xl w-full mx-4">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="px-3 py-1 text-sm">Close</button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
