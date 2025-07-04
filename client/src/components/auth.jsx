import React from 'react'
import { useState } from 'react'
import Login from './login'
import Register from './register'
import '../css/auth.scss'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

function Auth({closeModal}) {
    const [isRegister, setIsRegister] = useState(true)
    const {isAuthenticated} = useSelector(state => state.user)
    const navigate = useNavigate()

    if(isAuthenticated) navigate('/')
    
  return (
    <div className='auth-wrap card'>
        {
            isRegister 
            ? <Register closeModal={closeModal} setIsRegister={setIsRegister} />
            : <Login closeModal={closeModal} setIsRegister={setIsRegister} />
        }
    </div>
  )
}

export default Auth