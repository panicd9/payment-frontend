import React, { useState, useEffect } from 'react';
import PaymentJSON from "./smart-contracts/Payment.json";
import { ethers } from "ethers";
import './App.css';

function App() {
    const [address, setAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);

    // Connect to Metamask
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum)
                setProvider(provider)

                const signer = await provider.getSigner();
                setSigner(signer);
            } catch (error) {
                console.error(error);
            }
        } else {
            console.error('Metamask not detected');
            console.log("MetaMask not installed; using read-only defaults")
            setProvider(ethers.getDefaultProvider())
        }
    };

    useEffect(() => {
        const handleAccountsChanged = (accounts) => {
          connectWallet();
        };
    
        window.ethereum.on('accountsChanged', handleAccountsChanged);
    
        return () => {
          window.ethereum.off('accountsChanged', handleAccountsChanged);
        };
      }, [])

    useEffect(() => {
      async function initContract() {
          // Initialize the contract
          const contractAddress = "0x4Ba90f3589248d7d46B7F86B5B875E48A546cb02"; // Replace with your contract address
          const contractInstance = new ethers.Contract(contractAddress, PaymentJSON.abi, signer)

          setContract(contractInstance);
      }
      // Initialize contract when the component mounts
      initContract();
  }, [signer, provider]);

    // Send Ethereum
    const sendEth = async () => {
        try {
            const tx = await contract.sendPayment(address, { value: ethers.parseEther(amount) })
            await tx.wait();
            console.log('Transaction successful');
        } catch (error) {
            console.error('Error sending transaction:', error);
        }
    };

    return (
        <div className="container">
            {!signer && <button className="connect-button" onClick={connectWallet}>Connect Wallet</button>}
            {signer && (
                <div className="form">
                    <label className="label">Address:</label>
                    <input className="input" type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
                    <br />
                    <label className="label">Amount:</label>
                    <input className="input" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <br />
                    <button className="send-button" onClick={sendEth}>Send</button>
                </div>
            )}
        </div>
    );
}

export default App;
