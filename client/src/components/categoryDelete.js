import React from 'react';
import { useSelector } from 'react-redux';
import { DeleteCatApi } from '../api/category';

const CategoryDelete = ({slug, refresh}) => {
    const {token} = useSelector(state => ({...state.user}));

    const deleteCat = async (e) => {
        e.preventDefault();
        await DeleteCatApi(slug, token);
        refresh();
    }
    return(
        <>
           <button onClick={deleteCat}>delete<i className="fa fa-trash"></i></button>
        </>
    )
}

export default CategoryDelete;