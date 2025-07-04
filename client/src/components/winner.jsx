import React, { useState } from 'react'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import '../css/winner.scss'
import PartyWinnerGraph from './winner-graph'

function Winner() {

    const { bets, user, result, parties } = useSelector(state => state.user)
    const [partiesWithSum, setPartiesWithSum] = useState([])
    const [isUserBet, setIsUserBet] = useState()

    const betsByPlace = bets.sort((a, b) => b.score - a.score)
    const theWinner = betsByPlace[0]
    console.log('theWinner', theWinner)

    const getMapResultByParty = () => {
        const mapResult = {}
        result?.results?.forEach(p => {
            console.log('p', p)
            mapResult[p.partyId] = p.actualSeats
        })
        return mapResult
    }

    const getMergedPartiesResult = () => {
        const _id = user?._id
        console.log('iddd', user, _id)
        console.log('result', result)
        const userBets = bets.find(b => b.userId._id === _id)?.betsMap
        if(userBets) setIsUserBet(true)
        console.log('userBets', userBets)
        const mapResultByParty = getMapResultByParty()
        console.log('winnerBets', theWinner?.betsMap?.[parties?.[0]?._id])
        const orderedData = parties.map(p => (
            { ...p, final: mapResultByParty[p._id], winner: (theWinner?.betsMap?.[p._id] || 0), userBet: (userBets?.[p._id] || 0 )}
        ))
        console.log('orderedData', orderedData)
        return orderedData
    }

    useEffect(() => {
        const injectPartiesSum = getMergedPartiesResult()
        console.log('injectPartiesAvg', injectPartiesSum)
        setPartiesWithSum(injectPartiesSum)
    }, [betsByPlace, user, result])

    if(!result) return <div className='text-center'><h3>הממנצחים הגדולים יוכרזו לאחר תוצאות האמת</h3></div>

    return (
        <div className='winner-section'>
            {/* <div className='winner-triger'>?</div> */}
            <h1 className='text-end'><span className='team-blue'>מקום ראשון: </span>{theWinner?.userId?.name}</h1>
            <div className='winner-legends'>
                <div className='winner-legend'>תוצאות אמת <span className='legend-rect bg-team-blue'></span></div>
                <div className='winner-legend'> ההימור המנצח <span className='legend-rect bg-success'></span></div>
                {isUserBet && <div className='winner-legend'>ההימור שלי <span className='legend-rect bg-danger'></span></div>}
            </div>
            <div className='winner-head'>
                <div className='winners-list'>
                    {betsByPlace.filter((b,i) => i > 0 && i < 10).map((bet, i ) => <p>מקום {i+2}: {bet.userId.name}</p>)}
                </div>
                <table class="graph winner-graph">
                    {/* <caption>Bar Chart HTML From HTML Table</caption> */}
                    <thead>
                    </thead>
                    <tbody>
                        {partiesWithSum.filter(p => p.winner || p.final || p.userBet).sort((a, b) => b.final - a.final).map(p => <PartyWinnerGraph party={p} isUserBet={isUserBet} />)}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Winner