import axios from "axios";

export const coingateAxiosInstance = axios.create({
    baseURL: 'https://api-sandbox.coingate.com/api/v2',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token A_Vxmy7VfeAGpNVFfdRJR4UAxFRa-QWqteoQM4tp`
    },
  });
