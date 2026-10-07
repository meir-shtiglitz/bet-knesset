import axios from "axios";
import {toast} from "react-toastify";
import {signinValid, signupValid, validPassword} from "../validations/user";
import {ApiUrl} from "../apiUrl";
import Swal from 'sweetalert2'
import store from '../store'
import { getSlugFromUrl } from "../utils/api-utils";
import { mapBetsByParty } from "../utils/data-utils";

const wellDone = () => {
    Swal.fire({
        title: 'נכנסת בהצלחה',
        text: 'כעת תוכל להמר ואולי גם לנצח',
        icon: 'success',
        confirmButtonText: 'קח אותי להימור'
    })
}
export const signup = data => async dispatch => {
    const {error} = signupValid(data);
    if(error){
       return toast.error(error.details[0].message);
    } else{

        try{
            const headers = {"Content-Type": "application/json"}
            const user = await axios.post(`${ApiUrl}/user/signup`, data, headers);
            dispatch({
                type: "REGISTER_SUCCESS",
                payload: user.data
            })
            wellDone()
        } catch(err){
                toast.error(err?.response?.data?.error);
                dispatch({
                    type: "REGISTER_FAIL",
                })
        }
    }
}

export const signin = data => async dispatch => {
    const {error} = signinValid(data);
    if(error){
        return toast.error(error.details[0].message);
    } else{

        
        try{
            const headers = {"Content-Type": "application/json"}
            const user = await axios.post(`${ApiUrl}/user/signin`, data, headers);
            dispatch({
                type: "LOGIN_SUCCESS",
                payload: user.data
            })
            wellDone()
        } catch(err){
            toast.error(err?.response?.data?.error || 'Sign-in failed');
            dispatch({
                type: "LOGIN_FAIL",
            })
        }
    }
}


export const signByToken = data => async dispatch => {
        
        try{
            const headers = {
                "Content-Type":"application/json"
            }
            const user = await axios.post(`${ApiUrl}/user/signbytoken`, data, headers);
            dispatch({
                type: "LOGIN_BY_TOKEN",
                payload: user.data
            })
        } catch(err){
            dispatch({
                type: "LOGIN_BY_TOKEN_FAIL",
            })
        }
}

export const newPassword = data => async dispatch => {
    const {error} = validPassword({password:data.password});
    if (error){
        return toast.error(error.details[0].message);
    }else{
        try{
            const setData = {
                token: data.token,
                password: data.password
            }
            const headers = {"Content-Type": "application/json"}
        
            const user = await axios.post(`${ApiUrl}/user/forgot/reset`, setData, {headers});
            toast.success(user.data.message);
            dispatch({ type: "LOGIN_BY_TOKEN_FAIL" });
            return true;
        } catch(err){
            toast.error(err?.response?.data?.error || 'Password reset failed');
            return false;
        }
    }
}


export const setIsLoading = (status) => dispatch => {
    dispatch({
        type: "SET_IS_LOADING",
        payload: {status}
    })
}

export const setSelectedSessionSlug = (slug) => dispatch => {
    dispatch({
        type: "SET_SELECTED_SESSION_SLUG",
        payload: {slug}
    })
}

export const getAllBets = (slug) => async dispatch => {
    try{
        dispatch (setIsLoading(true) )
        const res = await axios.get(`${ApiUrl}/bets/get/${slug}`);
        dispatch({
            type: "SET_ALL_SESSIONS_DATA",
            payload: {allSessions: res.data.allSessions}
        })
        dispatch({
            type: "SET_SESSION_DATA",
            payload: {session: res.data.session}
        })
        dispatch({
            type: "SET_PARTIES",
            payload: {parties: res.data.parties}
        })
        const injectedBetsMap = res.data.bets?.map(b => ({...b, betsMap: mapBetsByParty(b.bets)}))
        dispatch({
            type: "SET_ALL_BETS",
            payload: {bets: injectedBetsMap}
        })
        dispatch({
            type: "SET_RESULT",
            payload: {result: res.data.result}
        })
        dispatch (setSelectedSessionSlug(res.data.session.slug) )
    } catch(err){
    }
    finally {
        dispatch(setIsLoading(false))
    }
}

export const updateBets = (newBet) => async dispatch => {
    const state = store.getState()
    newBet.betsMap = mapBetsByParty(newBet.bets)
    
    const bets = state.user.bets.filter(b => b._id !== newBet._id)
    bets.push(newBet)
        dispatch({
            type: "UPDATE_BETS",
            payload: {bets}
        })
}