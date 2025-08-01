import React, { useEffect } from 'react'
import DateCounter from './date-counter'
import PartiesChart from './parties-chart'
import SectionTitle from './section-title'
import '../css/home.scss'
import Voted from './voted'
import Winner from './winner'
import { useDispatch, useSelector } from 'react-redux'
import { getAllBets } from '../actions/user'

function Home() {

  const {selectedSessionSlug} = useSelector(state => state.user)
  const dispatch = useDispatch()

  useEffect(()=> {
        console.log('from Home effect - selectedSessionSlug', selectedSessionSlug);
        dispatch( getAllBets(selectedSessionSlug) )
    },[selectedSessionSlug])

  return (
    <div className='wrap-app'>
      <SectionTitle title={'תוצאות אמת'}/>
      <DateCounter />
      <SectionTitle title={'המנצחים'}/>
      <Winner />
      <SectionTitle title={'סקר הסקרים'}/>
      <PartiesChart />
      <SectionTitle title={'המר עכשיו'}/>
      <Voted />
    </div>
  )
}

export default Home