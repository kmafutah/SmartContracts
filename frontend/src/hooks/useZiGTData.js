import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ZiGTABI from '../abi/ZiGT.json';
import ReparationsABI from '../abi/ReparationsModel.json';

const useZiGTData = () => {
  const [data, setData] = useState({});

  useEffect(() => {
    const load = async () => {
      const provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
      const zigt = new ethers.Contract(process.env.REACT_APP_ZIGT_ADDRESS, ZiGTABI, provider);
      const reparations = new ethers.Contract(process.env.REACT_APP_REPARATIONS_MODEL, ReparationsABI, provider);

      const totalSupply = await zigt.totalSupply();
      const valueUSD = await zigt.getValueInUSD(ethers.utils.parseEther("1"), "Afro-centric Trust");

      setData({
        totalSupply: ethers.utils.formatEther(totalSupply),
        valueUSD: ethers.utils.formatEther(valueUSD),
      });
    };

    load();
  }, []);

  return data;
};

export default useZiGTData;
