import React from 'react'

function PartyWinnerGraph({party, isUserBet}) {
    const isMobile = window.innerWidth < 600
    return (
      <>
        <tr className='winner-row'>
          {/* {isMobile && <div className='bar-chart' style={{width: party.winner*3}}></div>} */}
            <th className='bar-text' scope="row">
              {party.name}
              {!isMobile &&
                <>
                  <br />
                  <span className='avg-num team-blue'>{party.final}</span> |
                  <span className='avg-num text-success'> {party.winner}</span>
                  {isUserBet && <> | <span className='avg-num text-danger'>{party.userBet} </span></>}
                </>}
            </th>
            <td className='wrap-bars'>
              <span className='final-bar bg-team-blue' style={{color: !party.final && 'transparent', height: isMobile ? 'initial' : party.final*3||5, width: !isMobile ? 'initial' : (party.final*3||1)}}>{party.final ? party.final : 0}</span>
              <hr />
              <span className='winner-bar bg-success' style={{color: !party.winner && 'transparent', height: isMobile ? 'initial' : party.winner*3||5, width: !isMobile ? 'initial' : party.winner*3||5}}>{party.winner ? party.winner : 1}</span>
              <hr />
              {isUserBet &&<span className='winner-bar bg-danger' style={{color: !party.userBet && 'transparent', height: isMobile ? 'initial' : party.userBet*3||5, width: !isMobile ? 'initial' : party.userBet*3||1}}>{party.userBet ? party.userBet : 0}</span>}
            </td>
            {/* <td className='bg-success'></td> */}
            {/* <td><span style={{backgroundColor: 'green'}}>{party.winner-2}</span></td> */}
        </tr>
      </>
      )
}

export default PartyWinnerGraph