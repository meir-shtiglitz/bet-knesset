import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import parties from '../parties.json'
import PartyEdit from './partyEdit'
import '../css/voted.scss'
import axios from 'axios'
import { useSelector } from 'react-redux'

function Voted() {
    const {token} = useSelector(state => state.user)
    const [partiesRes, setPartiesRes] = useState({})
    const [isValid, setIsValid] = useState(false)

    useEffect(() => {
        ///get user voted
    }, [])

    useEffect(() => {
        console.log('partiesRes', partiesRes)
    }, [Object.values(partiesRes)])

    const updateParty = (currentParty) => {
        setPartiesRes(prev => {
            return ({ ...prev, ...currentParty })
        })
    }

    const sendBet = async () => {
        const headers = {
            "Content-Type": "application/json",
            "authorization": token
        }

        const res = await axios.post('http://localhost:4000/api/bets/add',{bets: partiesRes},{headers})
        console.log('res', res)
    }

    const sum = Object.values(partiesRes).reduce((a, b) => a + b, 0)

    return (
        <div className='voted-section'>
            <div className='voted-parties'>
                {parties.sort((a, b) => a.id - b.id).map((p, i) =>
                    <PartyEdit
                        key={p.id}
                        party={p}
                        updateParty={updateParty}
                        partyRes={partiesRes[p.id]}
                        setIsValid={setIsValid}
                    />
                )}
            </div>
            {sum !== 120 
                ? <div className={`sum-res ${sum < 120 ? '' : 'text-danger'}`}>עד כה חילקת {sum} מתוך 120 מנדטים עליך {sum<120?'לחלק עוד':'להפחית'} {Math.abs(120-sum)} מנדטים</div>
                : <div className='sum-res text-primary'>חילקת 120 מנדטים כעת אתה יכול לשלוח את ההימור שלך</div>
            }
            <button onClick={sendBet} className='btn btn-primary' disabled={sum!==120 || !isValid}>שלח הימור</button>
        </div>
    )
}

export default Voted