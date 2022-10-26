import React from 'react'

function partyGraph({party}) {
  return (
    <tr style={{height: party.avg*3}}>
        <th scope="row">{party.name}<br /><span className='avg-num'>{party.avg}</span></th>
        <td><span>{party.avg}</span></td>
    </tr>
    )
}

export default partyGraph