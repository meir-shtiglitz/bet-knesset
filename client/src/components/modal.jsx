import React from 'react'
import UseCloseOnClick from '../hooks/use-close-on-click';

function Modal({children, closeModalFunc}) {
    const { refToClose } = UseCloseOnClick(closeModalFunc);

    return (
        <div ref={refToClose} className='wrap-modal'>
            {children}
        </div>
    )
}

export default Modal