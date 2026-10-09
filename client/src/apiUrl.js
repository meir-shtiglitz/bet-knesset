export const ApiUrl = process.env.NODE_ENV === 'production'
    ? (process.env.REACT_APP_API_URL || '/api')
    : `http://localhost:4000${process.env.REACT_APP_API_URL || '/api'}`;
