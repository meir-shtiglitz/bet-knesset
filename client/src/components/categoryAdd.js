import React,{useEffect, useState} from 'react';
import { useSelector } from 'react-redux';
import { UpdateCatApi,AddCatApi } from '../api/category';
import Loader from "./loader";

const CategoryAdd = ({refresh, editName, slug}) => {

    const [name, setName] = useState(editName);
    const [showLoader, setShowLoader] = useState(false);
    const {token} = useSelector(state => ({...state.user}));

    useEffect(()=>{
        setName(editName);
        alert(slug)
    },[editName])
    const inputSetName = (e) => {
        setName(e.target.value);
    }

    const addCat = async (e) => {
        e.preventDefault();
        setShowLoader(!showLoader);
        await AddCatApi(name, token);
        refresh();
        setShowLoader(false);
    }

    const updateCat = async (e) => {
        alert(slug + '  :' + name)
        e.preventDefault();
        setShowLoader(!showLoader);
        await UpdateCatApi(slug, name, token);
        refresh();
        setShowLoader(false);
    }
    return(
        <>
            {/* {showLoader && <Loader />} */}
            <form onSubmit={editName ? updateCat : addCat}>
                <label>category name
                    <input value={name} onChange={(e)=>inputSetName(e)} />
                    <button className='btn btn-primary' type="submit">{editName? 'update' :'add category'}</button>
                </label>
            </form>
        </>
    )
}

export default CategoryAdd;