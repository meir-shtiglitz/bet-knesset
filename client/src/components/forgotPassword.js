import {useState} from "react";
import Forgot_Confirm from "./forgot_confirm";
import Forgot_newPassword from "./forgot_newPassword";
import Forgot_setMail from "./Forgot_setMail";

const ForgotPassword = () => {

    const generateNums = () => {
        const string = '1234567890';
        let nums = '';
        for(let count = 0; count < 6; count++){
            nums += string.indexOf(Math.floor( Math.random() * string.length ));
        }
        return nums;
    }
    const [confirmAcount, setConfirmAcount] = useState(false);
    const [numsValid, setNumsValid] = useState(generateNums());
    const [email, setEmail] = useState(false);

    const updateEmail = (mail) => {
        setEmail(mail);
    }

    return(
        !email ?
            <Forgot_setMail mailSet={updateEmail} numsValid={numsValid} />
            :
            !confirmAcount ?    
                <Forgot_Confirm numsValid={numsValid} confirmMail={setConfirmAcount} />
            :   <Forgot_newPassword email={email} />
    )
}

export default ForgotPassword;