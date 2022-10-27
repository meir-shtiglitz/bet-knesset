import React from 'react'

function partyGraph({party}) {
  const isMobile = window.innerWidth < 600
  return (
    <tr style={{height: isMobile ? 'initial' : party.avg*3}}>
      {isMobile && <div className='bar-chart' style={{width: party.avg*3}}></div>}
        <th className='bar-text' scope="row">
          {party.name}
          {!isMobile &&
            <>
              <br />
              <span className='avg-num'>{party.avg}</span>
            </>}
        </th>
        <td><span>{party.avg}</span></td>
    </tr>
    )
}

export default partyGraph