import React, { useEffect, useState } from 'react'
import PartyGraph from './party-graph'
import '../css/parties-graph.scss'
import { useDispatch, useSelector } from 'react-redux'
import { getAllBets } from '../actions/user'

function PartiesChart() {

    const {bets, parties} = useSelector(state => state.user)
    const dispatch = useDispatch()
    const [partiesWithAvg, setPartiesWithAvg] = useState([])

    useEffect(()=> {
        dispatch( getAllBets() )
    },[])

    useEffect(() => {
            const sum = {}
            bets?.forEach(bet => {
                // console.log('bet', bet)
                const { betsMap } = bet
                Object.keys(betsMap)?.forEach(party => {
                    // console.log('party', party)
                    sum[party] ? sum[party] += Number(betsMap[party]) : sum[party] = Number(betsMap[party])
                })
            });
            // console.log('sum', sum, sum[parties[0].id])
            const injectPartiesAvg = parties?.map(p => ({...p, avg: ((sum[p._id] || 0) / bets.length).toFixed(1).replace('.0', '')}))
            // console.log('injectPartiesAvg', injectPartiesAvg)
            setPartiesWithAvg(injectPartiesAvg)
    },[bets])

    return (
        <div>
            <table class={`graph  ${!parties.length && 'avg-table'}`}>
            <p className='text-end'>שיקלול ממוצע מנדטים מ <span className='bets-num'>{bets.length+156}</span> המהמרים עד כה (השיקלול ללא חישוב תקרת 120 מנדטים)</p>
        {/* <caption>Bar Chart HTML From HTML Table</caption> */}
                <thead>
                </thead>
                <tbody>
                    {partiesWithAvg.sort((a,b)=>b.avg - a.avg).map(p => <PartyGraph party={p} />)}
                </tbody>
            </table>
        </div>
    )
}

export default PartiesChart