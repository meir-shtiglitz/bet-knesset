import React from 'react'

function partyGraph({party}) {
  return (
    <tr style={{height: party.avg}}>
        <th scope="row">{party.name}<br />{party.avg}</th>
        <td><span>{party.avg}</span></td>
    </tr>
    )
}

export default partyGraph