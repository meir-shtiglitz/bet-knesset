import {useState} from "react"; 
import { Generator } from "./generator";

const Creator = () => {
    
    const [lorum, setLorum] = useState('');
    const [copying, setCopying] = useState(false);

    const handleClick = () => {
        setLorum(lorum+Generator())
    //    alert();
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(lorum);
        setCopying(true);
        setTimeout(()=>setCopying(false),2000)
    }
    return(
        <div className="wrap-create">
            <h1>hebrew lorum ipsum creator</h1>
            <p>{lorum}</p>

            <button onClick={handleClick} className="btn btn-primary">load more</button>
            <button onClick={handleCopy} className="btn btn-success">copy text</button>
            {copying && <div>text copying...</div>}
        </div>

    )
}
export default Creator;