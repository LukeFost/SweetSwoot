use candid::{CandidType, Decode, Deserialize, Encode};
use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;

const MAX_VALUE_SIZE: u32 = 500; // Should be sufficient for tip records

#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct TipRecord {
    pub from_addr: String,
    pub to_addr: String,
    pub video_id: String,
    pub amount: u64,
    pub tx_hash: String,
    pub timestamp: u64,
}

impl Storable for TipRecord {
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

// Wrapper struct for Vec<TipRecord>
#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct TipRecordList(pub Vec<TipRecord>);

impl Storable for TipRecordList {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(&self.0).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Self(Decode!(bytes.as_ref(), Vec<TipRecord>).unwrap())
    }

    // A higher bound since this is a vector
    const BOUND: Bound = Bound::Bounded {
        max_size: 10000,
        is_fixed_size: false,
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    #[test]
    fn test_tip_record_serialization() {
        // Create a test tip record
        let tip = TipRecord {
            from_addr: "0x123456789abcdef0123456789abcdef012345678".to_string(),
            to_addr: "0xabcdef0123456789abcdef0123456789abcdef01".to_string(),
            video_id: "video123".to_string(),
            amount: 1000000000000000000, // 1 ETH in wei
            tx_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string(),
            timestamp: 1234567890,
        };

        // Test to_bytes
        let bytes = tip.to_bytes();
        
        // Test from_bytes
        let deserialized_tip = TipRecord::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(tip, deserialized_tip);
        
        // Verify specific fields
        assert_eq!(tip.from_addr, deserialized_tip.from_addr);
        assert_eq!(tip.to_addr, deserialized_tip.to_addr);
        assert_eq!(tip.video_id, deserialized_tip.video_id);
        assert_eq!(tip.amount, deserialized_tip.amount);
        assert_eq!(tip.tx_hash, deserialized_tip.tx_hash);
        assert_eq!(tip.timestamp, deserialized_tip.timestamp);
    }

    #[test]
    fn test_vec_tip_records_serialization() {
        // Create a vector of test tip records
        let tips = vec![
            TipRecord {
                from_addr: "0x123456789abcdef0123456789abcdef012345678".to_string(),
                to_addr: "0xabcdef0123456789abcdef0123456789abcdef01".to_string(),
                video_id: "video123".to_string(),
                amount: 1000000000000000000, // 1 ETH in wei
                tx_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".to_string(),
                timestamp: 1234567890,
            },
            TipRecord {
                from_addr: "0x123456789abcdef0123456789abcdef012345678".to_string(),
                to_addr: "0xabcdef0123456789abcdef0123456789abcdef01".to_string(),
                video_id: "video123".to_string(),
                amount: 500000000000000000, // 0.5 ETH in wei
                tx_hash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba".to_string(),
                timestamp: 1234567891,
            },
        ];

        // Test to_bytes for vector
        let bytes = tips.to_bytes();
        
        // Test from_bytes for vector
        let deserialized_tips = Vec::<TipRecord>::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(tips, deserialized_tips);
        assert_eq!(tips.len(), deserialized_tips.len());
        
        // Test storing in a BTreeMap
        let mut map = BTreeMap::new();
        map.insert("video123".to_string(), tips);
        
        // Verify we can add multiple tips to the same key
        let mut tips_for_video = map.get("video123".to_string()).unwrap().clone();
        tips_for_video.push(TipRecord {
            from_addr: "0xfedcba9876543210fedcba9876543210fedcba98".to_string(),
            to_addr: "0xabcdef0123456789abcdef0123456789abcdef01".to_string(),
            video_id: "video123".to_string(),
            amount: 250000000000000000, // 0.25 ETH in wei
            tx_hash: "0x456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123".to_string(),
            timestamp: 1234567892,
        });
        
        map.insert("video123".to_string(), tips_for_video);
        
        // Verify we have 3 tips now
        assert_eq!(map.get("video123".to_string()).unwrap().len(), 3);
        
        // Verify the total amount tipped
        let total_amount: u64 = map
            .get("video123".to_string())
            .unwrap()
            .iter()
            .map(|tip| tip.amount)
            .sum();
        
        assert_eq!(total_amount, 1750000000000000000); // 1.75 ETH in wei
    }
}