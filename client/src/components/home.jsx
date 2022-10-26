import React from 'react'
import DateCounter from './date-counter'
import PartiesAvg from './parties'
import SectionTitle from './section-title'
import '../css/home.scss'
import Voted from './voted'

function Home() {
  return (
    <div className='wrap-app'>
      <SectionTitle title={'רגע האמת'}/>
      <DateCounter />
      <SectionTitle title={'סקר הסקרים'}/>
      <PartiesAvg />
      <SectionTitle title={'המר עכשיו'}/>
      <Voted />
    </div>
  )
}

export default Home