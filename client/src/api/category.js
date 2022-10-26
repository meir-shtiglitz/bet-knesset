import axios from "axios";
import { ApiUrl } from "../apiUrl";

export const AddCatApi = async(name, token) => {
    const params = {name, token};
    const  headers = {
        "Content-Type":"application/json",
        "Authorization":`${token}`
    }
    const res = await axios.post(`${ApiUrl}/category/add`, params, {headers});
    return res;
}

export const DeleteCatApi = async(slug,token) =>
    await axios.delete(`${ApiUrl}/category/delete/${slug}`,{
    headers: {
        "Content-Type":"application/json",
        "Authorization":`${token}`
    }})

export const UpdateCatApi = async(slug,name,token) =>
    await axios.put(`${ApiUrl}/category/update/${slug}`,{name},{
    headers: {
        "Content-Type":"application/json",
        "Authorization":`${token}`
    }})
