import {useState} from "react";
import { toast } from "react-toastify";

const Forgot_Confirm = ({numsValid, confirmMail}) => {

    const [confirm, setConfirm] = useState();

    const Compare = async(e) => {
        e.preventDefault();
        if (confirm !== numsValid){
             return toast.error("it is not match");
        }else{
            confirmMail(true)
        }
    }

    return(
        <form onSubmit={Compare}>
            <div className="form-group">
                <label>validate acount
                    <input autoFocus onChange={(e)=> setConfirm(e.target.value)} value={confirm} className="form-control" />
                </label>
            </div>
            <button type="submit" className="btn btn-primary">Compare</button>
        </form>
    )
}

export default Forgot_Confirm;