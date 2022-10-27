import React from 'react'
import { useState } from 'react'
import Login from './login'
import Register from './register'
import '../css/auth.scss'

function Auth() {
    const [isRegister, setIsRegister] = useState(true)
  return (
    <div className='auth-wrap card'>
        {
            isRegister 
            ? <Register setIsRegister={setIsRegister} />
            : <Login setIsRegister={setIsRegister} />
        }
    </div>
  )
}

export default Auth