use candid::{CandidType, Decode, Deserialize, Encode, Principal};
use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;

const MAX_VALUE_SIZE: u32 = 2000; // Comments might be longer

#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct Comment {
    pub commenter_principal: Principal,
    pub video_id: String,
    pub text: String,
    pub timestamp: u64,
}

impl Storable for Comment {
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

// Wrapper struct for Vec<Comment>
#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct CommentList(pub Vec<Comment>);

impl Storable for CommentList {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(&self.0).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Self(Decode!(bytes.as_ref(), Vec<Comment>).unwrap())
    }

    // A higher bound since this is a vector of comments
    const BOUND: Bound = Bound::Bounded {
        max_size: 20000,
        is_fixed_size: false,
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    #[test]
    fn test_comment_serialization() {
        // Create a test principal
        let principal_bytes = [
            10, 116, 101, 115, 116, 45, 112, 114, 105, 110, 99, 105, 112, 97, 108,
        ];
        let principal = Principal::from_slice(&principal_bytes);

        // Create a test comment
        let comment = Comment {
            commenter_principal: principal,
            video_id: "video123".to_string(),
            text: "This is a great video! I really enjoyed it and learned a lot.".to_string(),
            timestamp: 1234567890,
        };

        // Test to_bytes
        let bytes = comment.to_bytes();
        
        // Test from_bytes
        let deserialized_comment = Comment::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(comment, deserialized_comment);
        
        // Verify specific fields
        assert_eq!(comment.commenter_principal, deserialized_comment.commenter_principal);
        assert_eq!(comment.video_id, deserialized_comment.video_id);
        assert_eq!(comment.text, deserialized_comment.text);
        assert_eq!(comment.timestamp, deserialized_comment.timestamp);
    }

    #[test]
    fn test_vec_comments_serialization() {
        // Create a test principal
        let principal_bytes = [
            10, 116, 101, 115, 116, 45, 112, 114, 105, 110, 99, 105, 112, 97, 108,
        ];
        let principal = Principal::from_slice(&principal_bytes);

        // Create a vector of test comments
        let comments = vec![
            Comment {
                commenter_principal: principal,
                video_id: "video123".to_string(),
                text: "This is a great video! I really enjoyed it and learned a lot.".to_string(),
                timestamp: 1234567890,
            },
            Comment {
                commenter_principal: principal,
                video_id: "video123".to_string(),
                text: "I have a question: how did you achieve that effect at 2:30?".to_string(),
                timestamp: 1234567891,
            },
        ];

        // Test to_bytes for vector
        let bytes = comments.to_bytes();
        
        // Test from_bytes for vector
        let deserialized_comments = Vec::<Comment>::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(comments, deserialized_comments);
        assert_eq!(comments.len(), deserialized_comments.len());
        
        // Test storing in a BTreeMap
        let mut map = BTreeMap::new();
        map.insert("video123".to_string(), comments);
        
        // Verify we can add multiple comments to the same key
        let mut comments_for_video = map.get("video123".to_string()).unwrap().clone();
        comments_for_video.push(Comment {
            commenter_principal: principal,
            video_id: "video123".to_string(),
            text: "Thanks for the reply! That clarifies things.".to_string(),
            timestamp: 1234567892,
        });
        
        map.insert("video123".to_string(), comments_for_video);
        
        // Verify we have 3 comments now
        assert_eq!(map.get("video123".to_string()).unwrap().len(), 3);
        
        // Verify the chronological ordering
        let video_comments = map.get("video123".to_string()).unwrap();
        for i in 1..video_comments.len() {
            assert!(video_comments[i].timestamp > video_comments[i-1].timestamp);
        }
    }
}