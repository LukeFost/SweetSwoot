use candid::{CandidType, Decode, Deserialize, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;

const MAX_VALUE_SIZE: u32 = 500;

#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct UserProfile {
    pub evm_address: String,    // 0x..., from SIWE
    pub name: String,
    pub avatar_url: String,
}

impl Storable for UserProfile {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_VALUE_SIZE,
        is_fixed_size: false,
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialization() {
        let profile = UserProfile {
            evm_address: "0x123456789abcdef0123456789abcdef012345678".to_string(),
            name: "Test User".to_string(),
            avatar_url: "https://example.com/avatar.png".to_string(),
        };

        // Test to_bytes
        let bytes = profile.to_bytes();
        
        // Test from_bytes
        let deserialized_profile = UserProfile::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(profile, deserialized_profile);
        
        // Specifically verify the EVM address was preserved correctly
        assert_eq!(profile.evm_address, deserialized_profile.evm_address);
    }
}
