import React, { useEffect, useState } from 'react'
import DateCounter from './date-counter'
import PartiesChart from './parties-chart'
import SectionTitle from './section-title'
import '../css/home.scss'
import Voted from './voted'
import Winner from './winner'
import { useDispatch, useSelector } from 'react-redux'
import { getAllBets } from '../actions/user'
import { useGroups } from '../groups/context'
import { mapBetsByParty } from '../utils/data-utils'

function Home() {

  const {selectedSessionSlug, session, token, bets} = useSelector(state => state.user)
  const {groups, selected, select, api, error: groupsError, refresh} = useGroups()
  const [chartState, setChartState] = useState(null)
  const [chartError, setChartError] = useState('')
  const [retry, setRetry] = useState(0)
  const dispatch = useDispatch()

  useEffect(()=> {
        dispatch( getAllBets(selectedSessionSlug) )
    },[selectedSessionSlug, dispatch])

  useEffect(() => {
    let cancelled = false
    setChartState(null); setChartError('')
    if (selected === 'all' || !session?._id || !token) return
    api(`/${selected}/charts/${session._id}`).then(data => {
      if (!cancelled) setChartState({data, groupId: selected, sessionId: session._id})
    }).catch(e => { if (!cancelled) setChartError(e.response?.data?.error || 'לא ניתן לטעון גרפי קבוצה') })
    return () => { cancelled = true }
  }, [api, selected, session?._id, token, bets, retry])
  const scoped = !!token && selected !== 'all'
  const currentCharts = chartState?.groupId === selected && chartState?.sessionId === session?._id ? chartState.data : null
  const winnerBets = currentCharts?.winners.map(b => ({...b, betsMap: mapBetsByParty(b.bets)})) || []

  return (
    <div className='wrap-app'>
      {token && <div className="mb-3 text-end" dir="rtl">
        <label htmlFor="group-selector">הצגת גרפים עבור:</label>
        <select id="group-selector" className="form-select" value={selected} onChange={e => select(e.target.value)}>
          <option value="all">כולם</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
        {groupsError && <p role="alert">{groupsError} <button onClick={() => refresh().catch(() => {})}>נסו שוב</button></p>}
      </div>}
      <SectionTitle title={'תוצאות אמת'}/>
      <DateCounter />
      {scoped && !currentCharts ? <div className="text-center" role={chartError ? 'alert' : 'status'}>
        {chartError || 'טוענים גרפי קבוצה…'} {chartError && <button onClick={() => setRetry(r => r + 1)}>נסו שוב</button>}
      </div> : <>
        <SectionTitle title={scoped ? `המנצחים — ${groups.find(g => g._id === selected)?.name || 'הקבוצה'}` : 'המנצחים'}/>
        {scoped && currentCharts.viewerEligible === false && <p className="text-center">הצטרפת לאחר סגירת ההימורים. ההימור שלך נכלל בממוצע הקבוצה, אך לא בדירוג המנצחים בבחירות אלו.</p>}
        <Winner scopedBets={scoped ? winnerBets : undefined} ready={scoped ? currentCharts.winnersReady : undefined} />
        <SectionTitle title={scoped ? `סקר הסקרים — ${groups.find(g => g._id === selected)?.name || 'הקבוצה'}` : 'סקר הסקרים'}/>
        <PartiesChart chartData={scoped ? currentCharts : undefined} />
      </>}
      <SectionTitle title={'המר עכשיו'}/>
      <Voted />
    </div>
  )
}

export default Home
