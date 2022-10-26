import React from 'react'
import logoImg from '../assets/images/logo.png'
import '../css/logo.scss'

function Logo() {
  return (
    <div className='logo-wrap'>
        <div className='logo-text'>
            <p>BET<br /><span>כנסת</span></p>
        </div>
        <img className='logo' src={logoImg} alt="logo" />
    </div>
  )
}

export default Logo