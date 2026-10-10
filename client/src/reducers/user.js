import { getSlugFromUrl } from "../utils/api-utils";

const initState = {
    authRevision: 0,
    token: null,
    expiresAt: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    allSessions: [],
    session: {endDate: new Date()},
    bets: [],
    parties: [],
    result: {},
    selectedSessionSlug: getSlugFromUrl()
}

const clearAuth = state => ({ ...state, authRevision: (state.authRevision || 0) + 1, token: null, expiresAt: null, isAuthenticated: false, isLoading: false, user: null });

export const user = (state = initState, action) => {
    const { type, payload } = action;

    switch(type){
        case "RESTORE_SUCCESS":
            if ((state.authRevision || 0) !== action.revision || state.token) return state;
            return { ...state, ...payload, isAuthenticated: true, isLoading: false };
        case "REGISTER_SUCCESS":
        case "LOGIN_SUCCESS":
            return{
                ...state,
                ...payload,
                authRevision: (state.authRevision || 0) + 1,
                isAuthenticated:true,
                isLoading:false
            }
        case 'REGISTER_FAIL':
        case 'LOGIN_FAIL':
        case "LOGOUT":
            return clearAuth(state);
        case 'SESSION_EXPIRED':
            return state.token === action.token ? clearAuth(state) : state;

        case "SET_SELECTED_SESSION_SLUG":
            return{
                ...state,
                selectedSessionSlug: payload.slug
            }        
        
        case "SET_ALL_SESSIONS_DATA":
            return{
                ...state,
                allSessions: payload.allSessions
            }        
        
        case "SET_SESSION_DATA":
            return{
                ...state,
                session: payload.session
            }        
        
        case "SET_IS_LOADING":
            return{
                ...state,
                isLoading: payload.status
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