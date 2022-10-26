import {createStore, applyMiddleware} from "redux";
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk'
import reducer from "../reducers/index";

const initState = {};
const store = createStore(
        reducer,
        initState,
        composeWithDevTools(
            applyMiddleware(thunk)
        )
    );

export default store;