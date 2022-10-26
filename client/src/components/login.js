import React, { useState } from "react";
import { useSelector, useDispatch } from 'react-redux';
import {signin} from "../actions/user"
import { useNavigate } from "react-router-dom";

const Login = () => {

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
            <div className="form-group">
                <label>Email
                    <input name="nameOrMail" autoFocus onChange={(e)=>handleChange(e)} value={nameOrMail} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>Password
                    <input type="password" name="password" onChange={(e)=>handleChange(e)} value={password} className="form-control" />
                </label>
            </div>
            <button type="submit" className="btn btn-primary">Sign in</button>
        </form>
    )
    return(
        <>
            {login_form()}
        </>
    )
}

export default Login