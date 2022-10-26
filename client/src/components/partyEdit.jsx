import React, { useState } from 'react'

function PartyEdit({party, updateParty, partyRes, setIsValid}) {
  const [errMsg, setErrMsg] = useState()

  const handleInput = (e) => {
    const value = !isNaN(e) ? e : e?.target?.value
    if(value < 4 && (value > 0 || value < 0)){
      setIsValid(false)
    } else{
      setIsValid(true)
      setErrMsg(null)
    }
    console.log('value', value)
    updateParty({[party.id]:Number(value)})
  }

  const handleLimits = (e) => {
    const {value} = e.target
    console.log('value', value)
    if(value < 4 && (value > 0 || value < 0)){
      handleInput(0)
      return setErrMsg('אחוז החסימה פה קצת קשוח, או 4 או כלום...')
    }
    setErrMsg(null)
  }
  return (
    <div className='party-edit'>
        <div className='party-paper'>
            <h1 className='party-letters'>{party.letters}</h1>
            <p className='party-name'>{party.name}</p>
            <p className='party-text'>{party.letters}</p>
        </div>
        <input name={party.id} type="number" value={partyRes||''} onBlur={handleLimits} onInput={handleInput} />
        {<div className='err-msg text-danger'>{errMsg}</div>}
    </div>
  )
}

export default PartyEdit