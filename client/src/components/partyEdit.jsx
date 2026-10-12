import React from 'react'
import Swal from 'sweetalert2'

function PartyEdit({party, updateParty, partyRes, isEditMode}) {
  const valid = partyRes === undefined || (Number.isInteger(partyRes) && (partyRes === 0 || partyRes >= 4) && partyRes <= 120)
  const handleInput = e => updateParty({[party._id]: e.target.value === '' ? 0 : e.target.valueAsNumber})
  const enforceThreshold = e => {
    const value = e.target.valueAsNumber
    if (isEditMode && value > 0 && value < 4) {
      updateParty({[party._id]: 0})
      Swal.fire({
        icon: 'warning',
        text: 'מצטערים אחוז החסימה כאן קצת קשוח המינימום להזנה הוא 4',
        confirmButtonText: 'אישור'
      })
    }
  }
  return (
    <div className='party-edit'>
        <div className='party-paper'>
            <h1 className='party-letters'>{party.chars}</h1>
            <p className='party-name pt-3'>{party.name} {party.text}</p>
        </div>
        <div className='wrap-input'>
          <span>ההימור שלי: </span>
          <input readOnly={!isEditMode} name={party.id} type="number" min="0" max="120" step="1" value={partyRes ?? ''} onChange={handleInput} onBlur={enforceThreshold} />
          <small className='text-unit'>מנדטים</small>
        </div>
        {!valid && <div className='err-msg text-danger'>יש להזין 0 או מספר שלם בין 4 ל־120</div>}
    </div>
  )
}

export default PartyEdit
