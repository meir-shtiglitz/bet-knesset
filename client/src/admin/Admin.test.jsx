import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {Provider} from 'react-redux';
import {createStore} from 'redux';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import axios from 'axios';
import Admin from './Admin';
jest.mock('axios',()=>jest.fn());
const session={_id:'s1',name:'Test election',slug:'test',startDate:'2026-01-01T00:00:00Z',endDate:'2026-01-02T00:00:00Z',isClosed:true,description:''};
const parties=[{_id:'p1',name:'First'},{_id:'p2',name:'Second'}];
const page=items=>({items,total:items.length,page:1,pageSize:25});
function mount(path='/admin/sessions',role=5) {
    const store=createStore((state={user:{user:{_id:'admin',role},isAuthenticated:true,token:'synthetic-token'}})=>state);
    return render(<Provider store={store}><MemoryRouter initialEntries={[path]}><Routes><Route path="/admin/:section" element={<Admin/>}/><Route path="/auth" element={<p>Sign in</p>}/></Routes></MemoryRouter></Provider>);
}
beforeEach(()=>{
    axios.mockReset();jest.spyOn(window,'confirm').mockReturnValue(true);
    axios.mockImplementation(async ({url,method})=>({data:method==='get'?url.includes('/sessions?')?page([session]):page([]):{saved:true}}));
});
afterEach(()=>jest.restoreAllMocks());
test('participants and ordinary admins cannot load administration data',()=>{
    const first=mount('/admin/users',0);
    expect(screen.getByRole('alert')).toHaveTextContent('סופר־אדמין');expect(axios).not.toHaveBeenCalled();first.unmount();
    mount('/admin/users',1);expect(axios).not.toHaveBeenCalled();
});
test('superAdmin sees navigation, edits a session, and sends authenticated fields',async()=>{
    mount();await screen.findByText('Test election');
    expect(screen.getByRole('link',{name:'תוצאות אמת ודירוג'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'עריכה'}));
    await screen.findByRole('heading',{name:'עריכת רשומה'});
    fireEvent.change(screen.getByLabelText('שם'),{target:{value:'Updated election'}});
    fireEvent.click(screen.getByRole('button',{name:'שמירה'}));
    await waitFor(()=>expect(axios).toHaveBeenCalledWith(expect.objectContaining({method:'patch',url:expect.stringContaining('/admin/sessions/s1'),headers:{Authorization:'Bearer synthetic-token'},data:expect.objectContaining({name:'Updated election',isClosed:true})})));
});
test('archive requires confirmation and archived rows expose restoration',async()=>{
    window.confirm.mockReturnValue(false);mount();await screen.findByText('Test election');
    fireEvent.click(screen.getByRole('button',{name:'מחיקה / ארכוב'}));
    expect(axios.mock.calls.some(([c])=>c.method==='post')).toBe(false);
    window.confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'מחיקה / ארכוב'}));
    await waitFor(()=>expect(axios).toHaveBeenCalledWith(expect.objectContaining({method:'post',data:{archived:true}})));
    axios.mockImplementation(async()=>({data:page([{...session,archived:true}])}));
    fireEvent.click(screen.getByLabelText('הצגת ארכיון'));
    await screen.findByRole('button',{name:'שחזור'});
    expect(screen.queryByRole('button',{name:'עריכה'})).not.toBeInTheDocument();
});
test('closed-election predictions can be corrected using party inputs',async()=>{
    const bet={_id:'b1',sessionId:{_id:'s1',name:'Test election'},userId:{_id:'u1',name:'User'},createdAt:session.startDate,bets:[{partyId:'p1',predictedSeats:60},{partyId:'p2',predictedSeats:60}]};
    axios.mockImplementation(async ({url,method})=>({data:method!=='get'?{saved:true}:url.includes('/bets?')?page([bet]):url.includes('/parties?')?page(parties):page([session])}));
    mount('/admin/bets?userId=u1');await screen.findByText('User');
    fireEvent.click(screen.getByRole('button',{name:'עריכה'}));
    const first=await screen.findByLabelText('First');
    fireEvent.change(first,{target:{value:'65'}});fireEvent.change(screen.getByLabelText('Second'),{target:{value:'55'}});
    fireEvent.click(screen.getByRole('button',{name:'שמירה'}));
    await waitFor(()=>expect(axios).toHaveBeenCalledWith(expect.objectContaining({method:'patch',url:expect.stringContaining('/bets/b1'),data:{bets:{p1:65,p2:55}}})));
});
test('results require 120 seats and calculate only after confirmation',async()=>{
    axios.mockImplementation(async({url,method})=>({data:method!=='get'?{saved:true}:url.endsWith('/results')?{parties,result:null}:page([session])}));
    mount('/admin/results?sessionId=s1');
    const first=await screen.findByLabelText('First');
    expect(screen.getByRole('button',{name:'שמירת תוצאות אמת'})).toBeDisabled();
    fireEvent.change(first,{target:{value:'60'}});fireEvent.change(screen.getByLabelText('Second'),{target:{value:'60'}});
    fireEvent.click(screen.getByRole('button',{name:'שמירת תוצאות אמת'}));
    await waitFor(()=>expect(axios).toHaveBeenCalledWith(expect.objectContaining({method:'put',data:expect.objectContaining({results:[{partyId:'p1',actualSeats:60},{partyId:'p2',actualSeats:60}]})})));
    await screen.findByText('תוצאות נשמרו. יש לחשב מיקומים מחדש.');
    window.confirm.mockReturnValue(false);fireEvent.click(screen.getByRole('button',{name:'חישוב מיקומים'}));
    expect(axios.mock.calls.some(([c])=>c.url.endsWith('/calculate'))).toBe(false);
    window.confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'חישוב מיקומים'}));
    await waitFor(()=>expect(axios).toHaveBeenCalledWith(expect.objectContaining({method:'post',url:expect.stringContaining('/calculate')})));
});
test('membership editing keeps the selected user and updates its status',async()=>{
    const member={_id:'m1',groupId:'g1',userId:{_id:'u1',name:'Member',email:'member@example.com'},status:'active'};
    axios.mockImplementation(async({url,method})=>({data:method!=='get'?{saved:true}:url.includes('/memberships?')?page([member]):url.includes('/users?')?page([{_id:'u1',name:'Member',email:'member@example.com'}]):page([session])}));
    mount('/admin/memberships?groupId=g1');await screen.findByText('Member');
    fireEvent.click(screen.getByRole('button',{name:'עריכה'}));
    await screen.findByRole('heading',{name:'עריכת רשומה'});
    expect(screen.getByLabelText('בחירת משתמש')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('מצב חברות'),{target:{value:'blocked'}});
    fireEvent.click(screen.getByRole('button',{name:'שמירה'}));
    await waitFor(()=>expect(axios).toHaveBeenCalledWith(expect.objectContaining({method:'patch',data:{groupId:'g1',userId:'u1',status:'blocked'}})));
});
test('ranking preview displays results without sending a calculation request',async()=>{
    axios.mockImplementation(async({url,method})=>({data:url.endsWith('/preview')?{ranking:[{betId:'b1',name:'Preview winner',score:1002}]}:method!=='get'?{saved:true}:url.endsWith('/results')?{parties,result:null}:page([session])}));
    mount('/admin/results?sessionId=s1');await screen.findByLabelText('First');
    fireEvent.click(screen.getByRole('button',{name:'תצוגה מקדימה של הדירוג'}));
    await screen.findByText('Preview winner');
    expect(axios.mock.calls.some(([c])=>c.url.endsWith('/calculate'))).toBe(false);
    expect(screen.getByText('תצוגה מקדימה בלבד — הניקוד לא נשמר')).toBeInTheDocument();
});
