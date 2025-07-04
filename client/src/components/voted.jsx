import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import PartyEdit from './partyEdit'
import '../css/voted.scss'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import Modal from './modal'
import Auth from './auth'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'
import { updateBets } from '../actions/user'
import { ApiUrl } from '../apiUrl'

function Voted() {
    const {token, isAuthenticated, user, bets, parties, session } = useSelector(state => state.user)
    const [partiesRes, setPartiesRes] = useState({})
    const [isValid, setIsValid] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [isEditMode, setIsEditMode] = useState(true)
    const [isNotFirstBet, setIsNotFirstBet] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()

    useEffect(() => {
        if(!isAuthenticated) return
        setShowAuthModal(false)
        getUserBets()
    },[bets, isAuthenticated])

    const getUserBets = () => {
        const {_id} = user
        const userBets = bets.find(b => b.userId._id === _id)
        console.log('userBets', userBets)
        if(userBets?.bets){
            setPartiesRes({...userBets?.betsMap})
            setIsEditMode(false)
            setIsNotFirstBet(true)
        }
    }
    const isMobileMode = window.innerWidth < 640
    const isPassedVoted = new Date(session?.endDate) < new Date()
    const sum = Object.values(partiesRes).reduce((a, b) => a + b, 0)
    
    useEffect(() => {
        if(sum > 0 && isPassedVoted){
            return Swal.fire({
                icon: 'error',
                text: 'חכו לבחירות הבאות',
                title: 'זמן ההימורים נגמר',
                confirmButtonText: 'אישור'
            })
        }
        if(sum > 0 && !isAuthenticated) {
            setShowAuthModal(true)
            setPartiesRes({})
        }
    }, [Object.values(partiesRes)])

    const updateParty = (currentParty) => {
        console.log('currentParty', currentParty)
        setPartiesRes(prev => {
            return ({ ...prev, ...currentParty })
        })
    }

    const sendBet = async () => {
        const headers = {
            "Content-Type": "application/json",
            "authorization": token
        }
        const res = await axios.post(`${ApiUrl}/bets/add`,{bets: partiesRes, sessionId: session._id},{headers})
        .catch(err => {
            console.log('err', err)
            return Swal.fire({
                icon: 'error',
                title: 'אופסססס',
                text: 'משהו השתבש וההימור שלך לא נקלט, נסה שוב מאוחר יותר',
                confirmButtonText: 'אישור'
            })
        })
        console.log('res bet', res)
        if(!res.data) return
        setIsEditMode(false)
        setIsNotFirstBet(true)
        dispatch( updateBets(res.data) )
        Swal.fire({
            icon: 'success',
            title: 'תודה על השתתפותך',
            text: 'אתה מוזמן להתעדכן במיקום ההימור שלך, לאחר הבחירות, כאן באתר',
            confirmButtonText: 'אישור'
        })
    }

    if(isMobileMode && showAuthModal) navigate('/auth')

    return (
        <div className='voted-section'>
            {showAuthModal &&
                <Modal closeModalFunc={setShowAuthModal}>
                    <Auth closeModal={() => setShowAuthModal(false)} />
                </Modal>
            }
            <div className='voted-parties'>
                {isPassedVoted 
                    ? <div className='text-center m-auto edit-button text-danger'>זמן ההימורים נגמר אנא המתינו לבחירות הבאות</div>
                    : <div className='text-center m-auto edit-button'>ניתן להמר עד שעה לפני סגירת הקלפיות</div>
                }
                {isNotFirstBet &&
                    <div className='m-auto edit-button'>
                        <button
                            onClick={() => isEditMode ? getUserBets() : setIsEditMode(!isEditMode)} 
                            className="btn btn-primary">
                            {isEditMode ? 'ביטול עריכה' : 'עריכת הימור'}
                        </button>
                    </div>
                }
                {parties.sort((a, b) => a.id - b.id).map((p, i) =>
                    <PartyEdit
                        key={p._id}
                        party={p}
                        updateParty={updateParty}
                        partyRes={partiesRes[p._id]}
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