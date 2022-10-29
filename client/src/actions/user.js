import axios from "axios";
import {toast} from "react-toastify";
import {signinValid, signupValid, validPassword} from "../validations/user";
import {ApiUrl} from "../apiUrl";
import Swal from 'sweetalert2'
import store from '../store'

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
        console.log ('browser error'+error.details[0].message);
       return toast.error(error.details[0].message);
    } else{

        try{
            const headers = {"Content-Type": "application/json"}
            const user = await axios.post(`${ApiUrl}/user/signup`, data, headers);
            console.log('user after api call');
            dispatch({
                type: "REGISTER_SUCCESS",
                payload: user.data
            })
            wellDone()
        } catch(err){
                console.log('server error',err?.response?.data);
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
        console.log ('browser error',error.details[0].message);
        return toast.error(error.details[0].message);
    } else{

        
        try{
            const headers = {"Content-Type": "application/json"}
            const user = await axios.post(`${ApiUrl}/user/signin`, data, headers);
            // console.log('the res user',user.data);
            dispatch({
                type: "LOGIN_SUCCESS",
                payload: user.data
            })
            wellDone()
        } catch(err){
            console.log('server error'+err);
            toast.error(err.response.data);
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
            // console.log('the res user',user.data);
            dispatch({
                type: "LOGIN_BY_TOKEN",
                payload: user.data
            })
        } catch(err){
            console.log('server error'+err);
            dispatch({
                type: "LOGIN_BY_TOKEN_FAIL",
            })
        }
}

export const newPassword = data => async dispatch => {
    const {error} = validPassword({password:data.password});
    console.log(error);
    if (error){
        return toast.error(error.details[0].message);
    }else{
        try{
            const setData = {
                email: data.email,
                password: data.password
            }
            const headers = {"Content-Type": "application/json"}
        
            const user = await axios.post(`${ApiUrl}/user/profile/update`, setData, {headers});
            // console.log('the res user',user.data);
            dispatch({
                type: "NEW_PASSWORD",
                payload: user.data
            })
        } catch(err){
            console.log('server error'+err);
            dispatch({
                type: "NEW_PASSWORD_FAIL",
            })
        }
    }
}

export const getAllBets = () => async dispatch => {
    try{
        const bets = await axios.get(`${process.env.REACT_APP_API_URL}/bets/get`);
        console.log('the res bets',bets);
        dispatch({
            type: "SET_ALL_BETS",
            payload: {bets: bets.data}
        })
    } catch(err){
        console.log('get all bets error'+err);
    }
}

export const updateBets = (newBet) => async dispatch => {
    const state = store.getState()
    console.log('state', state)
    const bets = state.user.bets.filter(b => b._id !== newBet._id)
    console.log('bets 22', bets)
    bets.push(newBet)
    console.log('bets 33', bets)
        dispatch({
            type: "UPDATE_BETS",
            payload: {bets}
        })
}