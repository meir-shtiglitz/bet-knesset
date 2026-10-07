import React from 'react'

function PartyEdit({party, updateParty, partyRes, isEditMode}) {
  const valid = partyRes === undefined || (Number.isInteger(partyRes) && partyRes >= 0 && partyRes <= 120)
  const handleInput = e => updateParty({[party._id]: e.target.value === '' ? 0 : e.target.valueAsNumber})
  return (
    <div className='party-edit'>
        <div className='party-paper'>
            <h1 className='party-letters'>{party.chars}</h1>
            <p className='party-name pt-3'>{party.name} {party.text}</p>
        </div>
        <div className='wrap-input'>
          <span>ההימור שלי: </span>
          <input readOnly={!isEditMode} name={party.id} type="number" min="0" max="120" step="1" value={partyRes ?? ''} onChange={handleInput} />
          <small className='text-unit'>מנדטים</small>
        </div>
        {!valid && <div className='err-msg text-danger'>יש להזין מספר שלם בין 0 ל־120</div>}
    </div>
  )
}

export default PartyEdit
