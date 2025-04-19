import mempool from "@mempool/mempool.js";
import axios from "axios";

const { bitcoin: { addresses } } = mempool({
    hostname: 'mempool.space',
    network: 'testnet'
  });

// Verify a crypto address
export const verifyAddress = async (address) => {
  return await axios.get(`https://mempool.emzy.de/testnet/api/v1/validate-address/${address}`, {
    timeout: 10000, // 10 seconds
    retry: 3, //retry mechanism
  });
};