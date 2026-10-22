import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import axios from 'axios';
import PollCompetition from './poll-competition';
jest.mock('axios');
const poll={_id:'poll1',pollsterName:'Test pollster',pollDate:'2026-01-01',color:'#ff0088',predictions:[{partyId:'p1',predictedSeats:120}]};
const data={dates:['2026-01-01'],parties:[{_id:'p1',name:'Test party'}],polls:[poll],averages:[{partyId:'p1',avg:120}],result:null,ranking:[]};
function mount(state={session:{_id:'s1'},result:null}) {
    const store=createStore((current={user:state},action)=>action.type==='CHANGE'?{user:action.payload}:current);
    return {store,...render(<Provider store={store}><PollCompetition/></Provider>)};
}
beforeEach(()=>{axios.get.mockReset();axios.get.mockResolvedValue({data});});
test('public competition shows the exact pending text, poll colors and average column',async()=>{
    mount();await screen.findByRole('heading',{name:'תחרות הסוקרים'});
    await screen.findByText('(חישוב הסוקרים המנצחים יוצג כאן לאחר הבחירות)');
    expect(screen.getByRole('columnheader',{name:'ממוצע הסקרים'})).toBeInTheDocument();
    expect(screen.getByLabelText('תאריך הסקרים')).toHaveValue('latest');
    expect(screen.queryByRole('heading',{name:'דירוג הסוקרים'})).not.toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/polls/s1'),{params:{date:'latest'}});
});
test('date selection reloads the competition and renders dynamic ranking with actual results',async()=>{
    mount();await screen.findByRole('columnheader',{name:'ממוצע הסקרים'});
    axios.get.mockResolvedValue({data:{...data,result:{results:[{partyId:'p1',actualSeats:120}]},ranking:[{pollId:'poll1',pollsterName:'Test pollster',pollDate:'2026-01-01',score:1001}]}});
    fireEvent.change(screen.getByLabelText('תאריך הסקרים'),{target:{value:'2026-01-01'}});
    await screen.findByRole('heading',{name:'דירוג הסוקרים'});
    expect(screen.getByRole('columnheader',{name:'תוצאות אמת'})).toBeInTheDocument();
    expect(screen.queryByText('(חישוב הסוקרים המנצחים יוצג כאן לאחר הבחירות)')).not.toBeInTheDocument();
    await waitFor(()=>expect(axios.get).toHaveBeenLastCalledWith(expect.stringContaining('/polls/s1'),{params:{date:'2026-01-01'}}));
});
test('failed requests expose a retry control',async()=>{
    axios.get.mockRejectedValueOnce(new Error('offline'));mount();
    await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'נסו שוב'}));
    await screen.findByRole('columnheader',{name:'ממוצע הסקרים'});
});
test('changing a group does not reload or filter the public poll competition',async()=>{
    const {store}=mount();await screen.findByRole('columnheader',{name:'ממוצע הסקרים'});
    const calls=axios.get.mock.calls.length;
    act(()=>{store.dispatch({type:'CHANGE',payload:{session:{_id:'s1'},result:null,selectedGroup:'another-group'}});});
    expect(axios.get).toHaveBeenCalledTimes(calls);
});
test('a delayed response from another election cannot replace the selected election',async()=>{
    let oldResolve;axios.get.mockImplementationOnce(()=>new Promise(resolve=>{oldResolve=resolve;}));
    const {store}=mount();
    act(()=>{store.dispatch({type:'CHANGE',payload:{session:{_id:'s2'},result:null}});});
    await screen.findByRole('columnheader',{name:'ממוצע הסקרים'});
    await act(async()=>oldResolve({data:{...data,polls:[{...poll,pollsterName:'Old election poll'}]}}));
    expect(screen.queryByText('Old election poll')).not.toBeInTheDocument();
});
