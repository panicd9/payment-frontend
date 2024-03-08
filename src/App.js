import React, { useState, useEffect } from 'react';
import PaymentJSON from "./smart-contracts/Payment.json";
import { ethers } from "ethers";
import './App.css';

function App() {
    const [payments, setPayments] = useState([{ address: '', amount: '' }]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [error, setError] = useState(null);

    // Connect to Metamask
    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum)
                setProvider(provider)

                const signer = await provider.getSigner();
                setSigner(signer);
            } catch (error) {
                console.error("Error connecting to wallet:", error.message);
                setError(error.message);
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
    
        if (window.ethereum) {
          window.ethereum.on('accountsChanged', handleAccountsChanged);
  
          return () => {
              window.ethereum.off('accountsChanged', handleAccountsChanged);
          };
      } else {
          console.warn('MetaMask is not installed');
          setError('MetaMask is not installed');
      }
      }, [])

    useEffect(() => {
      async function initContract() {
          // Initialize the contract
          const contractAddress = "0xe085C16c49290292de1Ad6383D480d286780FDa5";
          const contractInstance = new ethers.Contract(contractAddress, PaymentJSON.abi, signer)

          setContract(contractInstance);
      }
      // Initialize contract when the component mounts
      initContract();
  }, [signer, provider]);

    const handleAddressChange = (index, value) => {
        const newPayments = [...payments];
        newPayments[index].address = value;
        setPayments(newPayments);
    };

    const handleAmountChange = (index, value) => {
        const newPayments = [...payments];
        newPayments[index].amount = value;
        setPayments(newPayments);
        calculateTotalAmount(payments);
    };

    const addPaymentPair = () => {
        setPayments([...payments, { address: '', amount: '' }]);
    };

    const calculateTotalAmount = (payments) => {
        const total = payments.reduce((acc, payment) => {
          return acc + parseFloat(payment.amount || 0);
        }, 0);
        const round = (num, precision) => {
            const factor = Math.pow(10, precision);
            return Math.round(num * factor) / factor;
          };
          // Calculate total with 4 decimal places
          const roundedTotal = round(total, 5);
          setTotalAmount(roundedTotal);
      };

    // Send Ethereum
    const sendEth = async () => {
        try {
            const nonEmptyPayments = payments.filter(payment => payment.address !== '' && payment.amount !== '');
            setPayments(nonEmptyPayments);
            const addresses = payments.map(payment => payment.address);
            const amounts = payments.map(payment => ethers.parseEther(payment.amount));
            const totalAmountWei = payments.reduce((acc, payment) => {
                const amount = isNaN(payment.amount) ? 0n : ethers.parseEther(payment.amount.toString());
                return acc + amount;
            }, 0n);

            const tx = await contract.sendPayment(addresses, amounts, { value: totalAmountWei })
            await tx.wait();
            console.log('Transaction successful');
        } catch (error) {
            console.error('Error sending transaction:', error.message);
        }
    };

    return (
        <div>
          <video className="background-video" autoPlay loop muted>
            <source src="/background-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="navbar">
            <img src="/logo.svg" alt="logo" className="logo" />
          </div>
          {!signer ? (
            <button className="connect-button" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div className="center-container">
              {payments.map((payment, index) => (
                <div key={index} className="payment-container">
                  <input
                    type="text"
                    placeholder="Address"
                    value={payment.address}
                    onChange={(e) => handleAddressChange(index, e.target.value)}
                    className="payment-input"
                  />
                  <input
                    type="text"
                    placeholder="Amount"
                    value={payment.amount}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    className="amount-input"
                  />
                </div>
              ))}
              <button className="new-payment-button" onClick={addPaymentPair}>
                Additional Address
              </button>
              <div className="button-separator"></div>
              <button className="send-payments-button" onClick={sendEth}>
                Send Payments
              </button>
              <p className="total-amount">
                Total Amount: <span className="blue-text">{totalAmount}</span>
              </p>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
        </div>
      );
      
}

export default App;
