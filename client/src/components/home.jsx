import React from 'react'
import DateCounter from './date-counter'
import PartiesChart from './parties-chart'
import SectionTitle from './section-title'
import '../css/home.scss'
import Voted from './voted'

function Home() {
  return (
    <div className='wrap-app'>
      <SectionTitle title={'תוצאות אמת'}/>
      <DateCounter />
      <SectionTitle title={'סקר הסקרים'}/>
      <PartiesChart />
      <SectionTitle title={'המר עכשיו'}/>
      <Voted />
    </div>
  )
}

export default Home