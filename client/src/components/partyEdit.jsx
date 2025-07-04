import React, { useState } from 'react'

function PartyEdit({party, updateParty, partyRes, setIsValid, isEditMode}) {
  const [errMsg, setErrMsg] = useState()

  const handleInput = (e) => {
    const value = !isNaN(e) ? e : e?.target?.value
    if(value < 4 && (value > 0 || value < 0)){
      setIsValid(false)
    } else{
      setIsValid(true)
      setErrMsg(null)
    }
    // console.log('value', value)
    updateParty({[party._id]:Number(value)})
  }

  const handleLimits = (e) => {
    const {value} = e.target
    // console.log('value', value)
    if(value < 4 && (value > 0 || value < 0)){
      handleInput(0)
      return setErrMsg('אחוז החסימה פה קצת קשוח, או 4 או כלום...')
    }
    setErrMsg(null)
  }
  return (
    <div className='party-edit'>
        <div className='party-paper'>
            <h1 className='party-letters'>{party.chars}</h1>
            <p className='party-name pt-3'>{party.name} {party.text}</p>
            {/* <small className='party-text'>{party.text}</small> */}
        </div>
        <div className='wrap-input'>
          <span>ההימור שלי: </span>
          <input readOnly={!isEditMode} name={party.id} type="number" value={partyRes||''} onBlur={handleLimits} onInput={handleInput} />
          <small className='text-unit'>מנדטים</small>
        </div>
        {<div className='err-msg text-danger'>{errMsg}</div>}
    </div>
  )
}

export default PartyEdit