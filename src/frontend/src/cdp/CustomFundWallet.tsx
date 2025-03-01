import { FundButton, getOnrampBuyUrl } from '@coinbase/onchainkit/fund';
import { useAccount } from 'wagmi';
import { twMerge } from 'tailwind-merge';

interface CustomFundWalletProps {
  className?: string;
  presetAmount?: number;
}

export function CustomFundWallet({ 
  className = '', 
  presetAmount = 50
}: CustomFundWalletProps) {
  const { address } = useAccount();
  
  if (!address) {
    return <div className={twMerge("text-white", className)}>Please connect wallet first.</div>;
  }

  // Create a custom onramp URL to buy USDC on Base
  const onrampBuyUrl = getOnrampBuyUrl({
    projectId: import.meta.env.VITE_PUBLIC_CDP_PROJECT_ID!,
    addresses: { [address]: ['base'] },
    assets: ['USDC'],
    presetFiatAmount: presetAmount,
    fiatCurrency: 'USD',
  });

  return (
    <div className={twMerge("flex justify-center", className)}>
      <FundButton 
        fundingUrl={onrampBuyUrl} 
        openIn="popup"
      />
    </div>
  );
}