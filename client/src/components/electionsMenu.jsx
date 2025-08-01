import React from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import '../css/elections-select.scss'
import { setSelectedSessionSlug } from '../actions/user';

function ElectionMenu() {
    const {allSessions, session} = useSelector(state => state.user)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    const isSelected = (currentSession) => currentSession._id === session._id
    
    const selectSession = (selectedSessionSlug) => {
        const selectedSession = allSessions.find((s) => s.slug === selectedSessionSlug)
        dispatch( setSelectedSessionSlug(selectedSession.slug) )
        navigate(`/${selectedSession.slug}`)
    }
   
  return (
    <div className='select-sessions row'>
        <select onChange={(e) => selectSession(e.target.value)} id="election-select" className='election-select form-group'>
            {allSessions.map(s => <option value={s.slug} selected={isSelected(s)} className={`form-input ${isSelected(s) && 'selected'}`}>{s.name}</option>)}
        </select>
    </div>
  )
}

export default ElectionMenu