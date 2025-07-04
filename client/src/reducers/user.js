const initState = {
    isAuthenticated: false,
    loading:false,
    session: {endDate: new Date()},
    bets: [],
    parties: [],
    result: {}
}

export const user = (state = initState, action) => {
    const { type, payload } = action;

    switch(type){
        case "REGISTER_SUCCESS":
        case "LOGIN_SUCCESS":
        case "LOGIN_BY_TOKEN":
        case "NEW_PASSWORD":
            localStorage.setItem('token',payload.token);
            return{
                ...state,
                ...payload,
                isAuthenticated:true,
                loading:false
            }
        case 'REGISTER_FAIL':
        case 'LOGIN_FAIL':
        case "LOGIN_BY_TOKEN_FAIL":
        case "NEW_PASSWORD_FAIL":
            localStorage.removeItem('token');
            return{
                ...state,
                token:null,
                isAuthenticated:false,
                loading:false,
                user:null
            }
        case "SET_SESSION_DATA":
            return{
                ...state,
                session: payload.session
            }
                  
        case "SET_PARTIES":
            return{
                ...state,
                parties: payload.parties
            }
        
        case "SET_ALL_BETS":
            return{
                ...state,
                bets: payload.bets
            }
        
        case "SET_RESULT":
            console.log('result from reducer', payload)
            return{
                ...state,
                result: payload.result
            }
        
        case "UPDATE_BETS":
            return{
                ...state,
                bets: payload.bets
            }
            
        default:
            return state;
    }
}