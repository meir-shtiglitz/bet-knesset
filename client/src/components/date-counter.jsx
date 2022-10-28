import React, { useEffect, useState } from 'react'
import '../css/counter.scss'

function DateCounter({date}) {
    const [counter, setCounter] = useState({})
    let int;
    useEffect(() => {
        int = setInterval(() => {
                  updateTimer()
            },1000)
        return () => clearInterval(int)
    },[])

    function updateTimer() {
        const future  = Date.parse(date);
        const now     = new Date();
        const diff    = future - now;
        if(diff < 1){return clearInterval(int);  }
        const days  = Math.floor( diff / (1000*60*60*24) );
        const hours = Math.floor( diff / (1000*60*60) );
        const mins  = Math.floor( diff / (1000*60) );
        const secs  = Math.floor( diff / 1000 );
      
        const d = days;
        const h = hours - days  * 24;
        const m = mins  - hours * 60;
        const s = secs  - mins  * 60;
      
        setCounter({d,h,m,s})
      }
    
  return (
    <div className='counter-wrap row'>
        
            <div className='counter-item'>
                <p className='counter-num'>{counter.d || '00'}</p>
                <p className='counter-text'>ימים</p>
            </div>
        
        <div className='counter-item'>
            <p className='counter-num'>{counter.h || '00'}</p>
            <p className='counter-text'>שעות</p>
        </div>
        <div className='counter-item'>
            <p className='counter-num'>{counter.m || '00'}</p>
            <p className='counter-text'>דקות</p>
        </div>
        <div className='counter-item'>
            <p className='counter-num'>{counter.s || '00'}</p>
            <p className='counter-text'>שניות</p>
        </div>
    </div>
  )
}

export default DateCounter