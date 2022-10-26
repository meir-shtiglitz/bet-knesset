import axios from 'axios'
import React, { useEffect, useState } from 'react'
import PartyGraph from './party-graph'
import parties from '../parties.json'
import '../css/parties-graph.scss'

function PartiesAvg() {

const [partiesWithAvg, setPartiesWithAvg] = useState([])

useEffect(()=> {
    const fetchData = async () => {
        const sum = {}
        const res = await axios.get('http://localhost:4000/api/bets/get')
        console.log('resqqqqq', res)
        res?.data?.bets?.forEach(bet => {
            console.log('bet', bet)
            const { bets } = bet
            Object.keys(bets).forEach(party => {
                console.log('party', party)
                sum[party] ? sum[party] += Number(bets[party]) : sum[party] = Number(bets[party])
            })
        });
        console.log('sum', sum, sum[parties[0].id])
        const injectPartiesAvg = parties.map(p => ({...p, avg: (sum[p.id] || 0) / res?.data?.bets?.length}))
        console.log('injectPartiesAvg', injectPartiesAvg)
        setPartiesWithAvg(injectPartiesAvg)
    }
    fetchData()
},[])
  return (
    <div>
        <table class="graph">
        <p className='text-end'>שיקלול ממוצע מנדטים מכלל ההימורים (השיקלול ללא חישוב תקרת 120 מנדטים)</p>
	{/* <caption>Bar Chart HTML From HTML Table</caption> */}
            <thead>
                <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Percent</th>
                </tr>
            </thead>
            <tbody>
                {partiesWithAvg.sort((a,b)=>b.avg - a.avg).map(p => <PartyGraph party={p} />)}
            </tbody>
        </table>
    </div>
  )
}

export default PartiesAvg