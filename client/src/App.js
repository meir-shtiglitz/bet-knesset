import React, {lazy, Suspense} from 'react';
import {useSelector, useDispatch} from "react-redux";
import './App.css';
import {Routes, Route} from 'react-router-dom';
import {ToastContainer} from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Loader from "./components/loader";
import { signout } from './actions/user';
import useAuthSession from './hooks/use-auth-session';
import Logo from './components/logo';
import Home from './components/home';
import Auth from './components/auth';
import ElectionMenu from './components/electionsMenu';
// const Home = lazy(() => import('./components/Home'))
const Login = lazy(() => import('./components/login'));
const Register = lazy(() => import('./components/register'));
const ForgotPassword = lazy(() => import('./components/forgotPassword'));
const CategoryList = lazy(() => import('./components/categoryList'));
const Lorum = lazy(() => import('./components/lorum/creator'));
// const Loader = lazy(() => import('./components/loader'));

const App = () => {
  const {isLoading, isAuthenticated, user} = useSelector(state => state.user);
  const dispatch = useDispatch();
  useAuthSession();

  return(
    <Suspense fallback={<Loader />}>
      {isLoading && <Loader /> }
      <ToastContainer />
      <Logo />
      {isAuthenticated && <div className="text-center mb-3">
        <span>{user?.name} </span>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => dispatch(signout())}>יציאה מכל ההתחברויות</button>
      </div>}
      <ElectionMenu />
      <Routes>
        <Route exact path="/" element={<Home />} />
        <Route exact path="/:slug" element={<Home />} /> 
        <Route exact path="/auth" element={<Auth />} /> 
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