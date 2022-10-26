import axios from "axios";
import {useState} from "react";
import { toast } from "react-toastify";
import {ApiUrl} from "../apiUrl";
import { validMail } from "../validations/user";

const Forgot_setMail = ({numsValid, mailSet}) => {

    const [email, setEmail] = useState();
    const [isConfirm, setIsConfirm] = useState(false);

    const send = async(e) => {
        e.preventDefault();
        const {error} = validMail({email});
        console.log(error);
        if (error) return toast.error("email address is not valid")
        const data = {
            email: email,
            numsValid: numsValid
        }
        const headers = {
            "Content-type": "application/json"
        }
        const sending = await axios.post(`${ApiUrl}/user/forgot/validmail`, data, {headers});
        console.log(sending)
        if(sending) mailSet(email);
    }

    const formSendMail = () => (
        <form onSubmit={send}>
            <div className="form-group">
                <label>Email
                    <input name="email" type="email" autoFocus onChange={(e)=> setEmail(e.target.value)} value={email} className="form-control" />
                </label>
            </div>
            <button type="submit" className="btn btn-primary">Send</button>
        </form>
    )

    return(
        formSendMail()
    )
}

export default Forgot_setMail;