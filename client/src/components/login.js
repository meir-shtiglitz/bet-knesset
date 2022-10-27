import React, { useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import {signin} from "../actions/user"
import { useNavigate } from "react-router-dom";

const Login = ({setIsRegister}) => {

    const navigate = useNavigate();
    const [fields, setFields] = useState({
        nameOrMail:     '',
        password: ''
    })
    const {nameOrMail, password} = fields;

    const {user} = useSelector(state => state);
    if(user.isAuthenticated) navigate('/')

    const state = useSelector(state => state);
    const dispatch = useDispatch();

    const handleChange = (e) => {
        console.log('state',state);
        setFields({...fields, [e.target.name]: e.target.value});
        console.log(fields);
    }

    const send = async(e) => {
        e.preventDefault();
        dispatch(signin({nameOrMail, password}));
    }

    const login_form = () => (
        <form onSubmit={send}>
            <h1 className="pb-5">על מנת להמר יש לבצע כניסה למערכת</h1>
            <div className="form-group">
                <label>כתובת מייל:
                    <input name="nameOrMail" autoFocus onChange={(e)=>handleChange(e)} value={nameOrMail} className="form-control" />
                </label>
            </div>
            <div className="form-group mt-2">
                <label>סיסמה:
                    <input type="password" name="password" onChange={(e)=>handleChange(e)} value={password} className="form-control" />
                </label>
            </div>
            <button type="submit" className="btn btn-primary mt-2">תכניסו אותי</button>
            <p className="pointer mt-2" onClick={()=>setIsRegister(true)}>אני רוצה להרשם</p>
        </form>
    )
    return(
        <>
            {login_form()}
        </>
    )
}

export default Login