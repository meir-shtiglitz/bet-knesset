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
import Swal from 'sweetalert2'

function Voted() {
    const {token, isAuthenticated, user, bets} = useSelector(state => state.user)
    const [partiesRes, setPartiesRes] = useState({})
    const [isValid, setIsValid] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [isEditMode, setIsEditMode] = useState(true)
    const [isNotFirstBet, setIsNotFirstBet] = useState(false)

    useEffect(() => {
        if(!isAuthenticated) return
        setShowAuthModal(false)
        getUserBets()
    },[bets, isAuthenticated])

    const getUserBets = () => {
        const {_id} = user
        console.log('id', user, _id)
        const userBets = bets.find(b => b.userId === _id)
        console.log('userBets', userBets)
        if(userBets?.bets){
            setPartiesRes({...userBets?.bets})
            setIsEditMode(false)
            setIsNotFirstBet(true)
        }
    }

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
        .catch(err => {
            console.log('err', err)
            return Swal.fire({
                icon: 'error',
                title: 'אופסססס',
                text: 'משהו השתבש וההימור שלך לא נקלט, נסה שוב מאוחר יותר',
                confirmButtonText: 'אישור'
            })
        })
        // console.log('res', res)
        if(!res.data) return
        setIsEditMode(false)
        setIsNotFirstBet(true)
        Swal.fire({
            icon: 'success',
            title: 'תודה על השתתפותך',
            text: 'אתה מוזמן להתעדכן במיקום ההימור שלך, לאחר הבחירות, כאן באתר',
            confirmButtonText: 'אישור'
        })
    }


    return (
        <div className='voted-section'>
            {showAuthModal &&
                <Modal closeModalFunc={setShowAuthModal}>
                    <Auth />
                </Modal>
            }
            <div className='voted-parties'>
                {isNotFirstBet &&
                    <div className='m-auto edit-button'>
                        <button
                            onClick={() => isEditMode ? getUserBets() : setIsEditMode(!isEditMode)} 
                            className="btn btn-primary">
                            {isEditMode ? 'בטל עריכה' : 'ערוך הימור'}
                        </button>
                    </div>
                }
                {parties.sort((a, b) => a.id - b.id).map((p, i) =>
                    <PartyEdit
                        key={p.id}
                        party={p}
                        updateParty={updateParty}
                        partyRes={partiesRes[p.id]}
                        setIsValid={setIsValid}
                        isEditMode={isEditMode}
                    />
                )}
            </div>
            {sum > 0 && isEditMode && <div className='status-bet'>
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