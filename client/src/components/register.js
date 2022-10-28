import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import {signup} from "../actions/user"
import {toast} from "react-toastify";
import {ApiUrl} from "../apiUrl";
import Loader from "./loader";
import { useNavigate } from "react-router-dom";
const Register = ({setIsRegister}) => {
    const navigate = useNavigate();
    const [fields, setFields] = useState({
        name:     '',
        email:    '',
        password: '',
        confirm:  ''
    })
    const {name, email, password, confirm} = fields;
    
    const dispatch = useDispatch();
    const handleChange = (e) => {
        if(e.target.name === 'confirm'){
            e.target.value !== password ? (e.target.style.backgroundColor = '#ff000042'): (e.target.style.backgroundColor = 'transparent');
        }
        setFields({...fields, [e.target.name]: e.target.value});
    }

    const send = (e) => {
        e.preventDefault();
        password !== confirm ? toast.error('password and confirm are not match') 
        : dispatch(signup({name, email, password}));
    }

    const register_form = () => (
        <form onSubmit={send}>
            <h1>על מנת להמר יש לבצע רישום קצרצר</h1>
            <p>לא יעשה שום שימוש בנתונים מלבד זיהוי המנצחים</p>
            <div className="form-group">
                <label>שם:
                    <input type="name" name="name" autoFocus onChange={(e)=>handleChange(e)} value={name} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>כתובת מייל:
                    <input type="email" name="email" onChange={(e)=>handleChange(e)} value={email} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>סיסמה:
                    <input type="password" name="password" onChange={(e)=>handleChange(e)} value={password} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>חזור על הסיסמה:
                    <input type="password" name="confirm" onChange={(e)=>handleChange(e)} value={confirm} className="form-control" />
                </label>
            </div>
            <button type="submit" className="btn btn-primary mt-2">תרשמו אותי</button>
            <p className="pointer" onClick={()=>setIsRegister(false)}>כבר נרשמתי</p>
        </form>
    )
    return(
        <>
            {register_form()}
        </>
    )
}

export default Register