import {useState, useHistory} from "react";
import {useDispatch} from "react-redux";
import { toast } from "react-toastify";
import { newPassword } from "../actions/user";

const Forgot_newPassword = ({email}) => {

    const dispatch = useDispatch();
    const [newPass, setNewPass] = useState();
    const [confirmPass, setConfirmPass] = useState();

    const handleConfirm = (e) => {
        e.target.value !== newPass ? (e.target.style.backgroundColor = '#ff000042'): (e.target.style.backgroundColor = 'transparent');
        setConfirmPass(e.target.value);
    }

    const send = async(e) => {
        e.preventDefault();
        if(newPass !== confirmPass) return toast.error("the password and the confirm are not match");
        dispatch(newPassword({email,password:newPass}))
        
        // if(user) Redirect;
    }

    return(
        <form onSubmit={send}>
            <div className="form-group">
                <label>new password
                    <input autoFocus onChange={(e)=> setNewPass(e.target.value)} value={newPass} className="form-control" />
                </label>
            </div>
            <div className="form-group">
                <label>confirm password
                    <input onChange={(e)=> handleConfirm(e)} value={confirmPass} className="form-control" />
                </label>
            </div>
            <button type="submit" className="btn btn-primary">create password</button>
        </form>
    )
}

export default Forgot_newPassword;