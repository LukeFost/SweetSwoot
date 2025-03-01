import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { faEthereum } from '@fortawesome/free-brands-svg-icons';
import { useAccount, useBalance, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { twMerge } from 'tailwind-merge';
import { FundWallet } from '../../cdp/FundWallet';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: string;
  videoId?: string; // Made optional since it's not used in this component
  onTipComplete: (amount: string, txHash: string) => Promise<void>;
  className?: string;
}

type TipStatus = 'idle' | 'preparing' | 'waiting' | 'success' | 'error';

const PREDEFINED_AMOUNTS = [
  { label: '0.001 ETH', value: '0.001' },
  { label: '0.01 ETH', value: '0.01' },
  { label: '0.05 ETH', value: '0.05' },
  { label: '0.1 ETH', value: '0.1' },
];

export function TipModal({ 
  isOpen, 
  onClose, 
  recipientAddress, 
  onTipComplete,
  className = '' 
}: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<string>('0.01');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [tipStatus, setTipStatus] = useState<TipStatus>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });
  
  const { sendTransaction, isPending, isSuccess, isError, error } = useSendTransaction();
  
  // Handle transaction state changes
  useEffect(() => {
    if (isPending) {
      setTipStatus('waiting');
    } else if (isSuccess) {
      setTipStatus('success');
    } else if (isError) {
      setTipStatus('error');
      setErrorMessage(error?.message || 'Transaction failed');
    }
  }, [isPending, isSuccess, isError, error]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAmount('0.01');
      setCustomAmount('');
      setTipStatus('idle');
      setTxHash('');
      setErrorMessage('');
    }
  }, [isOpen]);
  
  const handleAmountSelect = (amount: string) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };
  
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow valid decimal numbers
    if (/^[0-9]*[.,]?[0-9]*$/.test(value)) {
      setCustomAmount(value);
      setSelectedAmount('');
    }
  };
  
  const getEffectiveAmount = (): string => {
    return customAmount || selectedAmount;
  };
  
  const isAmountValid = (): boolean => {
    const amount = parseFloat(getEffectiveAmount());
    return amount > 0 && amount <= parseFloat(balance?.formatted || '0');
  };
  
  const handleSendTip = async () => {
    try {
      setTipStatus('preparing');
      
      // Get the amount to send
      const amount = getEffectiveAmount();
      
      // Validate amount
      if (!isAmountValid()) {
        setTipStatus('error');
        setErrorMessage('Invalid amount or insufficient balance');
        return;
      }
      
      // Parse amount to Wei
      const valueInWei = parseEther(amount);
      
      // Send transaction
      sendTransaction({
        to: recipientAddress as `0x${string}`,
        value: valueInWei,
      });
      
      // Note: The transaction hash will be set in a separate effect when the transaction succeeds
    } catch (err) {
      console.error('Error sending tip:', err);
      setTipStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Error sending tip');
    }
  };
  
  const handleConfirmTip = async () => {
    try {
      // This would be called after transaction is confirmed
      await onTipComplete(getEffectiveAmount(), txHash);
      // Don't close the modal - let user see success state
    } catch (err) {
      console.error('Error recording tip on backend:', err);
      setErrorMessage(err instanceof Error ? 
        err.message : 'Transaction was successful, but failed to record on backend'
      );
    }
  };
  
  // Determine if we should show the modal
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className={twMerge("bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md p-6 relative", className)}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xl" />
        </button>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Tip Creator
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Send ETH directly to the video creator
          </p>
        </div>
        
        {tipStatus === 'idle' || tipStatus === 'preparing' ? (
          <>
            {/* Recipient info */}
            <div className="mb-6 p-3 bg-gray-100 dark:bg-zinc-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Sending to:
              </p>
              <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                {recipientAddress}
              </p>
            </div>
            
            {/* Predefined amounts */}
            <div className="mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Select amount:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PREDEFINED_AMOUNTS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAmountSelect(option.value)}
                    className={`py-2 px-4 rounded-lg transition-colors ${
                      selectedAmount === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom amount */}
            <div className="mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Or enter custom amount:
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="0.00"
                  className="w-full py-2 px-4 pl-9 border dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FontAwesomeIcon
                  icon={faEthereum}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                />
              </div>
              
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Your balance: {balance?.formatted?.substring(0, 8) || '0'} ETH
                </span>
                {parseFloat(getEffectiveAmount()) > parseFloat(balance?.formatted || '0') && (
                  <span className="text-red-500">
                    Insufficient balance
                  </span>
                )}
              </div>
            </div>
            
            {/* Need funds section */}
            {parseFloat(balance?.formatted || '0') < 0.01 && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Need to add funds to your wallet?
                </p>
                <FundWallet className="mb-2" />
              </div>
            )}
            
            {/* Send button */}
            <button
              onClick={handleSendTip}
              disabled={!isAmountValid() || tipStatus === 'preparing'}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center ${
                !isAmountValid() || tipStatus === 'preparing'
                  ? 'bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {tipStatus === 'preparing' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faEthereum} className="mr-2" />
                  Send {getEffectiveAmount()} ETH
                </>
              )}
            </button>
          </>
        ) : tipStatus === 'waiting' ? (
          <div className="text-center py-8">
            <div className="animate-spin mx-auto mb-4 h-12 w-12 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Transaction in progress
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please confirm the transaction in your wallet...
            </p>
          </div>
        ) : tipStatus === 'success' ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
              <FontAwesomeIcon icon={faCheck} className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Tip sent successfully!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Thank you for supporting the creator
            </p>
            {/* Transaction hash display */}
            {txHash && (
              <div className="mb-6 p-3 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Transaction Hash:
                </p>
                <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                  {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 10)}
                </p>
                <a
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View on Etherscan
                </a>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={handleConfirmTip}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm Tip
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : tipStatus === 'error' ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 dark:bg-red-900">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Transaction Failed
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-6">
              {errorMessage || 'There was an error processing your transaction.'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setTipStatus('idle')}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}