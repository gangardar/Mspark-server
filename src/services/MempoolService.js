import mempool from "@mempool/mempool.js";
import axios from "axios";

const { bitcoin: { addresses } } = mempool({
    hostname: 'mempool.space',
    network: 'testnet'
  });

// Verify a crypto address
export const verifyAddress = async (address) => {
      return await axios.get(`https://mempool.space/testnet/api/v1/validate-address/${address}`);
  };