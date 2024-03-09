import React, { useState, useEffect } from 'react';
import PaymentJSON from "./smart-contracts/Payment.json";
import { ethers } from "ethers";
import './App.css';

function App() {
	const [payments, setPayments] = useState([{ address: '', amount: '' }]);
	const [totalAmount, setTotalAmount] = useState(0);
	const [provider, setProvider] = useState(/** @type {ethers.BrowserProvider} */(null))
	const [signer, setSigner] = useState(null);
	const [contract, setContract] = useState(null);
	const [error, setError] = useState(null);
	const [invalidAddresses, setInvalidAddresses] = useState([]);
	const [invalidAmounts, setInvalidAmounts] = useState([]);

	// Connect to Metamask
	const connectWallet = async () => {
		console.log('Connecting to wallet...');
		if (window.ethereum) {
			try {
				const provider = new ethers.BrowserProvider(window.ethereum);
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
		calculateTotalAmount(payments);
	}, [payments]);

	useEffect(() => {
		const handleAccountsChanged = (accounts) => {
			connectWallet();
		};

		const handleChainChanged = (accounts) => {
			setError(null);
			connectWallet();
		};

		if (window.ethereum) {
			window.ethereum.on('accountsChanged', handleAccountsChanged);
			window.ethereum.on('chainChanged', handleChainChanged);

			return () => {
				window.ethereum.off('accountsChanged', handleAccountsChanged);
				window.ethereum.off('chainChanged', handleChainChanged);
			};
		} else {
			console.warn('MetaMask is not installed');
			setError('MetaMask is not installed');
		}
	}, [])

	useEffect(() => {
		async function initContract() {
			try {
				// Initialize the contract
				if (!provider) {
					return;
				}
				const network = await provider.getNetwork();
				const chainId = network.chainId.toString();
				let contractAddress;
				try {
				  contractAddress = getContractAddress(chainId);
				} catch (error) {
				  console.error('Error getting contract address:', error.message);
				  setError(error.message);
				  return;
				}
				const contractInstance = new ethers.Contract(contractAddress, PaymentJSON.abi, signer)

				console.log('Connected to: ', contractAddress);
				setContract(contractInstance);
			} catch (error) {
				console.error('Error initializing contract:', error.message);
			}

		}
		// Initialize contract when the component mounts
		initContract();
	}, [signer, provider]);

	const isValidAddress = (address) => {
		return /^0x[a-fA-F0-9]{40}$/.test(address);
	};

	const isValidAmount = (amount) => {
		return !isNaN(amount) && Number(amount) >= 0 && amount !== '';
	};

	const handleAddressChange = (index, value) => {
		const newPayments = [...payments];
		newPayments[index].address = value;
		setPayments(newPayments);
	};

	const handleAmountChange = (index, value) => {
		const newPayments = [...payments];
		newPayments[index].amount = value;
		setPayments(newPayments);
	};

	const addPaymentPair = () => {
		setPayments([...payments, { address: '', amount: '' }]);
	};

	const deletePaymentPair = (index) => {
		setPayments(payments.filter((_, i) => i !== index));
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

	function getContractAddress(chainId) {
		switch (chainId) {
			case '11155111': // Sepolia
				return '0xB8722A91E7D0C92076A5BC0490B523A5de9748aa';
			case '1': // Mainnet
				return '0xe085C16c49290292de1Ad6383D480d286780FDa5';
			default:
				throw new Error(`ChainId ${chainId} not supported`);
		}
	}

	// Send Ethereum
	const sendEth = async () => {
		try {
			const invalidAddresses = [];
			const invalidAmounts = [];

			const validPayments = payments.map((payment, index) => {
				const isValid = isValidAddress(payment.address) && isValidAmount(payment.amount);
				if (!isValid) {
					if (!isValidAddress(payment.address)) {
						invalidAddresses.push(index);
					}
					if (!isValidAmount(payment.amount)) {
						invalidAmounts.push(index);
					}
				}
				return isValid ? payment : null;
			}).filter(payment => payment !== null);

			setInvalidAddresses(invalidAddresses);
			setInvalidAmounts(invalidAmounts);
			console.log("invalidAmounts", invalidAmounts);
			if (validPayments.length === 0) {
				return;
			}

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
			<video className="background-video" autoPlay loop muted playsInline>
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
						<div key={index} className="payment-container form__group">
							<div className="input-container">
								<input
									type="text"
									placeholder=""
									value={payment.address}
									onChange={(e) => handleAddressChange(index, e.target.value)}
									className={`payment-input form__field ${invalidAddresses.includes(index) ? 'error' : ''}`}
									id={`address-${index}`}
								/>
								{invalidAddresses.includes(index) && <div className="error-message">Invalid address</div>}
								<label htmlFor={`address-${index}`} className="form__label">Address</label>
							</div>
							<div className="input-container">
								<input
									type="text"
									placeholder=""
									value={payment.amount}
									onChange={(e) => handleAmountChange(index, e.target.value)}
									className={`amount-input form__field ${invalidAmounts.includes(index) ? 'error' : ''}`}
									id={`amount-${index}`}
								/>
								{invalidAmounts.includes(index) && <div className="error-message">Invalid amount</div>}
								<label htmlFor={`amount-${index}`} className="form__label">Amount</label>
							</div>
							<div className="input-container">
								<button className={`amount-input form__field remove-button`} onClick={() => deletePaymentPair(index)}>Remove</button>
								<div className="error-message"></div>
								<label htmlFor={`amount-${index}`} className="form__label"></label>
							</div>
						</div>
					))}
					<button className="new-payment-button button" onClick={addPaymentPair}>
						Additional Address
					</button>
					<div className="button-separator"></div>
					<button className="send-payments-button button" onClick={sendEth}>
						Send Payments
					</button>
					<p className="total-amount">
						Total Amount: <span className="blue-text">{totalAmount}</span>
					</p>
				</div>
			)}
			{error && <div className="metamask-error-message">{error}</div>}
		</div>
	);

}

export default App;
