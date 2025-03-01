use candid::{CandidType, Decode, Deserialize, Encode, Principal};
use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;

const MAX_VALUE_SIZE: u32 = 1000; // Increased for video metadata

#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct VideoMetadata {
    pub video_id: String,
    pub uploader_principal: Principal,
    pub tags: Vec<String>,
    pub title: String,
    pub storage_ref: Option<String>, // Reference to chunk storage or IPFS
    pub timestamp: u64,
}

impl Storable for VideoMetadata {
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
        // Create a test principal
        let principal_bytes = [
            10, 116, 101, 115, 116, 45, 112, 114, 105, 110, 99, 105, 112, 97, 108,
        ];
        let principal = Principal::from_slice(&principal_bytes);

        // Create test video metadata
        let metadata = VideoMetadata {
            video_id: "video123".to_string(),
            uploader_principal: principal,
            tags: vec!["funny".to_string(), "short".to_string()],
            title: "Test Video".to_string(),
            storage_ref: Some("ipfs://QmTest123".to_string()),
            timestamp: 1234567890,
        };

        // Test to_bytes
        let bytes = metadata.to_bytes();
        
        // Test from_bytes
        let deserialized_metadata = VideoMetadata::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(metadata, deserialized_metadata);
        
        // Verify specific fields
        assert_eq!(metadata.video_id, deserialized_metadata.video_id);
        assert_eq!(metadata.uploader_principal, deserialized_metadata.uploader_principal);
        assert_eq!(metadata.tags, deserialized_metadata.tags);
        assert_eq!(metadata.title, deserialized_metadata.title);
        assert_eq!(metadata.storage_ref, deserialized_metadata.storage_ref);
        assert_eq!(metadata.timestamp, deserialized_metadata.timestamp);
    }

    #[test]
    fn test_tags() {
        // Create a test principal
        let principal_bytes = [
            10, 116, 101, 115, 116, 45, 112, 114, 105, 110, 99, 105, 112, 97, 108,
        ];
        let principal = Principal::from_slice(&principal_bytes);

        // Create test video metadata with multiple tags
        let metadata = VideoMetadata {
            video_id: "video123".to_string(),
            uploader_principal: principal,
            tags: vec!["funny".to_string(), "short".to_string(), "trending".to_string()],
            title: "Test Video".to_string(),
            storage_ref: None,
            timestamp: 1234567890,
        };

        // Test to_bytes
        let bytes = metadata.to_bytes();
        
        // Test from_bytes
        let deserialized_metadata = VideoMetadata::from_bytes(bytes);
        
        // Verify tags specifically
        assert_eq!(metadata.tags, deserialized_metadata.tags);
        assert_eq!(metadata.tags.len(), 3);
        assert!(metadata.tags.contains(&"funny".to_string()));
        assert!(metadata.tags.contains(&"short".to_string()));
        assert!(metadata.tags.contains(&"trending".to_string()));
    }
}