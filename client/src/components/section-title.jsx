import React from 'react'

function SectionTitle({title}) {
  return (
    <div className='section-title'>
        <h1 className='title'>{title}</h1>
        <hr />
    </div>
  )
}

export default SectionTitle