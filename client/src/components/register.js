import React, { useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import {signup} from "../actions/user"
import {toast} from "react-toastify";
import {ApiUrl} from "../apiUrl";
import Loader from "./loader";
import { useNavigate } from "react-router-dom";
const Register = () => {
    const navigate = useNavigate();
    const [fields, setFields] = useState({
        name:     '',
        email:    '',
        password: '',
        confirm:  ''
    })
    const {name, email, password, confirm} = fields;

    const {user} = useSelector(state => state);
    if(user.isAuthenticated) navigate('/')
    const dispatch = useDispatch();

    console.log('user',user);
    const handleChange = (e) => {
        console.log(ApiUrl);
        if(e.target.name === 'confirm'){
            e.target.value !== password ? (e.target.style.backgroundColor = '#ff000042'): (e.target.style.backgroundColor = 'transparent');
        }
        setFields({...fields, [e.target.name]: e.target.value});
        console.log(fields);
    }

    const send = (e) => {
        e.preventDefault();
        password !== confirm ? toast.error('password and confirm are not match') 
        : dispatch(signup({name, email, password}));
    }

    const register_form = () => (
        <form onSubmit={send}>
            <div className="form-group">
                <label>Username
                    <input type="name" name="name" autoFocus onChange={(e)=>handleChange(e)} value={name} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>Email
                    <input type="email" name="email" onChange={(e)=>handleChange(e)} value={email} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>Password
                    <input type="password" name="password" onChange={(e)=>handleChange(e)} value={password} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>Confirm Password
                    <input type="password" name="confirm" onChange={(e)=>handleChange(e)} value={confirm} className="form-control" />
                </label>
            </div>
            <button type="submit" className="btn btn-primary">Sign up</button>
        </form>
    )
    return(
        <>
            {register_form()}
        </>
    )
}

export default Register