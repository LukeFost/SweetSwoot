import { FundButton } from '@coinbase/onchainkit/fund';
import { ConnectWallet, Wallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import { twMerge } from 'tailwind-merge';

interface FundWalletProps {
  className?: string;
}

export function FundWallet({ className = '' }: FundWalletProps) {
  const { address } = useAccount();

  if (!address) {
    return (
      <Wallet>
        <ConnectWallet>Connect to Fund</ConnectWallet>
      </Wallet>
    );
  }

  return (
    <div className={twMerge("flex justify-center", className)}>
      <FundButton />
    </div>
  );
}