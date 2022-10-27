import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import parties from '../parties.json'
import PartyEdit from './partyEdit'
import '../css/voted.scss'
import axios from 'axios'
import { useSelector } from 'react-redux'
import Modal from './modal'
import Auth from './auth'

function Voted() {
    const {token, isAuthenticated, user} = useSelector(state => state.user)
    const [partiesRes, setPartiesRes] = useState({})
    const [isValid, setIsValid] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    
    useEffect(() => {
        ///get user voted
    }, [])

    useEffect(() => {
        if(isAuthenticated) setShowAuthModal(false)
    },[isAuthenticated])

    const sum = Object.values(partiesRes).reduce((a, b) => a + b, 0)
    
    useEffect(() => {
        if(sum > 0 && !isAuthenticated) {
            setShowAuthModal(true)
            setPartiesRes({})
        }
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

        const res = await axios.post(`${process.env.REACT_APP_API_URL}/bets/add`,{bets: partiesRes},{headers})
        console.log('res', res)
    }


    return (
        <div className='voted-section'>
            {showAuthModal &&
                <Modal closeModalFunc={setShowAuthModal}>
                    <Auth />
                </Modal>
            }
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
            {sum > 0 &&<div className='status-bet'>
                {sum !== 120 
                    ? <div className={`sum-res'}`}>עד כה חילקת {sum} מתוך 120 מנדטים עליך {sum<120?'לחלק עוד':'להפחית'} {Math.abs(120-sum)} מנדטים</div>
                    : <div className='sum-res'>חילקת 120 מנדטים כעת אתה יכול לשלוח את ההימור שלך</div>
                }
                <button onClick={sendBet} className='btn btn-primary mt-2 mb-2' disabled={sum!==120 || !isValid}>שלח הימור</button>
            </div>}
        </div>
    )
}

export default Voted