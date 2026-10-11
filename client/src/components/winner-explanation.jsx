import React, { useState } from 'react';
import { Modal } from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';

export default function WinnerExplanation() {
    const [open, setOpen] = useState(false);
    return <div className="winner-explanation">
        <button type="button" className="btn btn-outline-primary" aria-haspopup="dialog"
            onClick={() => setOpen(true)}>איך נקבעים המנצחים?</button>
        <Modal open={open} onClose={() => setOpen(false)} center
            ariaLabelledby="winner-explanation-title" closeIcon={<span>סגירה <span aria-hidden="true">×</span></span>}
            classNames={{ modal: 'winner-explanation-dialog' }}>
            <div dir="rtl">
                <h2 id="winner-explanation-title">איך נקבעים המנצחים?</h2>
                <p>לאחר פרסום תוצאות האמת, משווים את התחזית לכל מפלגה לתוצאה שלה:</p>
                <ul>
                    <li><strong>תחזית מדויקת:</strong> מוסיפה נקודה.</li>
                    <li><strong>תחזית לא מדויקת:</strong> מפחיתים נקודה לכל מנדט של הפרש. למשל, תחזית של 30 מול תוצאה של 32 מורידה שתי נקודות.</li>
                </ul>
                <p>במידה ויש שני משתתפים עם אותו סך נקודות הקדימות תקבע לפי זמן ההימור כשההימור המוקדם יותר יזכה לניקוד גבוה יותר.</p>
                <p>המנצח הוא המשתתף עם הניקוד הכולל הגבוה ביותר.</p>
                <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>הבנתי</button>
            </div>
        </Modal>
    </div>;
}
