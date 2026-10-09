import React from 'react'
import { useState, useEffect } from 'react'
import Login from './login'
import Register from './register'
import '../css/auth.scss'
import { useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { pendingInvitation } from '../groups/navigation'

function Auth({closeModal = () => {}, returnTo}) {
    const [searchParams] = useSearchParams()
    const [isRegister, setIsRegister] = useState(() => searchParams.get('mode') !== 'login')
    const {isAuthenticated} = useSelector(state => state.user)
    const navigate = useNavigate()

    useEffect(() => {
        if (isAuthenticated && !returnTo) {
            const pending = pendingInvitation();
            navigate(pending ? `/join/${pending}` : '/');
        }
    }, [isAuthenticated, navigate, returnTo]);
    
  return (
    <div className='auth-wrap card'>
        {
            isRegister 
            ? <Register closeModal={closeModal} setIsRegister={setIsRegister} embedded />
            : <Login closeModal={closeModal} setIsRegister={setIsRegister} embedded />
        }
    </div>
  )
}

export default Auth
