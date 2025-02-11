import axios from 'axios';

const api = axios.create({
  baseURL: 'https://facialrecognitiondb-default-rtdb.firebaseio.com/',
});

export default api;