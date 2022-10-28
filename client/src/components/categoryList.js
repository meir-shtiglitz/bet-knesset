import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ApiUrl } from '../apiUrl';
import CategoryDelete from './categoryDelete';
import CategoryAdd from './categoryAdd';

const CategoryList = ({token}) => {

    const [catgories, setCategories] = useState([]);
    const [editName, setEditName] = useState('');
    const [editSlug, setEditSlug] = useState();

    useEffect(() =>{
        getCats();
    },[])
    
    const getCats = async () => {
        const params = {token};
        const headers = {"Content-type": "application/json"}
        const res = await axios.get(`${ApiUrl}/category/list`, {params}, headers);
        // console.log(res);
        setCategories(res.data.categories);
    }

    const edit = (curentName, slug ) => {
        setEditName(curentName);
        setEditSlug(slug);
    }

    return(
        <>
            {catgories.map(cat => 
                <div>
                    <h3>{cat.name}</h3>
                    <span onClick={()=>edit(cat.name, cat.slug)}><i className="fa fa-pencil"></i></span>
                    <CategoryDelete refresh={getCats} slug={cat.slug} />
                </div>
            )}
            <CategoryAdd editName={editName} slug={editSlug} refresh={getCats} />
        </>
    )
}

export default CategoryList;