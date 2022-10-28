const { useRef, useEffect } = require("react")

const UseCloseOnClick = (func) => {
    const refNotClose = useRef();
    const refToClose = useRef();
    
    useEffect(()=>{
        document.addEventListener('click', close)

        return () => {
            document.removeEventListener('click', close)
        }
    })
    const close = (e) => {
        // console.log("refToClose",refToClose.current)
        // console.log("refNotClose",refNotClose.current)
        // console.log("e.target",e.target)
        if(refToClose && refToClose.current == e.target) return func();
        if(e.target && refNotClose && refNotClose.current && !refNotClose.current.contains(e.target)) return func();
        return;
        
    }

    return{refNotClose, refToClose}
}
export default UseCloseOnClick;