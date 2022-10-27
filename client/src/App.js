import React, {lazy, Suspense} from 'react';
import {useSelector, useDispatch} from "react-redux";
import './App.css';
import {Routes, Route} from 'react-router-dom';
import {ToastContainer} from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Loader from "./components/loader";
import { signByToken } from './actions/user';
import Voted from './components/voted';
import Logo from './components/logo';
import Home from './components/home';
// const Home = lazy(() => import('./components/Home'))
const Login = lazy(() => import('./components/login'));
const Register = lazy(() => import('./components/register'));
const ForgotPassword = lazy(() => import('./components/forgotPassword'));
const CategoryList = lazy(() => import('./components/categoryList'));
const Lorum = lazy(() => import('./components/lorum/creator'));
// const Loader = lazy(() => import('./components/loader'));

const App = () => {
  
  const IsUser = () => {
    const dispatch = useDispatch();
    const {isAuthenticated} = useSelector(state => ({...state.user}));
    const token = localStorage.getItem('token');
    if(token && !isAuthenticated) dispatch(signByToken({token:token}));
  }

  return(
    <Suspense fallback={Loader}>
      {IsUser()}
      <ToastContainer />
      <Logo />
      <Routes>
        {/* <Route exact path="/" component={Home} />*/}
        <Route exact path="/" element={<Home />} /> 
        <Route exact path="/logo" element={<Logo />} /> 
        <Route exact path="/lorum" element={<Lorum />} /> 
        <Route exact path="/login" element={<Login />} /> 
        <Route exact path="/register" element={<Register />} />
        <Route exact path="/forgot-password" element={<ForgotPassword />} />
        <Route exact path="/category" element={<CategoryList />} />
      </Routes>
      
    </Suspense>
  )
}

export default App;