import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import Voted from './voted';
jest.mock('axios');
jest.mock('sweetalert2', () => ({ fire: jest.fn().mockResolvedValue({}) }));

test('party limits are reported only after submission and leave the prediction editable', async () => {
    const store = createStore((state = {user:{user:{_id:'u1'},token:'test-token',isAuthenticated:true,bets:[],
        session:{_id:'s1',isClosed:false,startDate:new Date(Date.now()-60000),endDate:new Date(Date.now()+60000)},
        parties:[{_id:'p1',name:'First',minPredictedSeats:20,maxPredictedSeats:40},{_id:'p2',name:'Second'}]}}) => state);
    axios.post.mockRejectedValue({response:{status:400,data:{code:'PREDICTION_OUT_OF_RANGE'}}});
    render(<Provider store={store}><MemoryRouter><Voted /></MemoryRouter></Provider>);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0],{target:{value:'50'}});
    fireEvent.blur(inputs[0]);
    fireEvent.change(inputs[1],{target:{value:'70'}});
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'שלח הימור'}));
    await waitFor(()=>expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        text:'מצטערים ההימור שלך זוהה כפייק נסה שוב מאוחר יותר'
    })));
    expect(axios.post).toHaveBeenCalledWith(expect.any(String),{bets:{p1:50,p2:70},sessionId:'s1'},expect.any(Object));
    expect(inputs[0]).not.toHaveAttribute('readonly');
    expect(inputs[0]).toHaveValue(50);
    expect(screen.queryByText('תודה על השתתפותך')).not.toBeInTheDocument();
});
