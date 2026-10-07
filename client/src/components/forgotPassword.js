import {useState} from "react";
import ForgotNewPassword from "./forgot_newPassword";
import ForgotSetMail from "./Forgot_setMail";
const ForgotPassword = () => {
    const [requested, setRequested] = useState(false);
    return requested ? <ForgotNewPassword /> : <ForgotSetMail mailSet={() => setRequested(true)} />;
};
export default ForgotPassword;
