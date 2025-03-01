use candid::{CandidType, Decode, Deserialize, Encode, Principal};
use ic_stable_structures::{storable::Bound, Storable};
use std::borrow::Cow;

const MAX_VALUE_SIZE: u32 = 100; // Should be sufficient for watch events

#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct WatchEvent {
    pub user_principal: Principal,
    pub video_id: String,
    pub watch_duration_sec: u32,
    pub liked: bool,
    pub completed: bool, 
    pub timestamp: u64,
}

impl Storable for WatchEvent {
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

// Wrapper struct for Vec<WatchEvent>
#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct WatchEventList(pub Vec<WatchEvent>);

impl Storable for WatchEventList {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(Encode!(&self.0).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        Self(Decode!(bytes.as_ref(), Vec<WatchEvent>).unwrap())
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
    fn test_watch_event_serialization() {
        // Create a test principal
        let principal_bytes = [
            10, 116, 101, 115, 116, 45, 112, 114, 105, 110, 99, 105, 112, 97, 108,
        ];
        let principal = Principal::from_slice(&principal_bytes);

        // Create a test watch event
        let event = WatchEvent {
            user_principal: principal,
            video_id: "video123".to_string(),
            watch_duration_sec: 42,
            liked: true,
            completed: false,
            timestamp: 1234567890,
        };

        // Test to_bytes
        let bytes = event.to_bytes();
        
        // Test from_bytes
        let deserialized_event = WatchEvent::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(event, deserialized_event);
        
        // Verify specific fields
        assert_eq!(event.user_principal, deserialized_event.user_principal);
        assert_eq!(event.video_id, deserialized_event.video_id);
        assert_eq!(event.watch_duration_sec, deserialized_event.watch_duration_sec);
        assert_eq!(event.liked, deserialized_event.liked);
        assert_eq!(event.completed, deserialized_event.completed);
        assert_eq!(event.timestamp, deserialized_event.timestamp);
    }

    #[test]
    fn test_vec_watch_events_serialization() {
        // Create a test principal
        let principal_bytes = [
            10, 116, 101, 115, 116, 45, 112, 114, 105, 110, 99, 105, 112, 97, 108,
        ];
        let principal = Principal::from_slice(&principal_bytes);

        // Create a vector of test watch events
        let events = vec![
            WatchEvent {
                user_principal: principal,
                video_id: "video123".to_string(),
                watch_duration_sec: 42,
                liked: true,
                completed: false,
                timestamp: 1234567890,
            },
            WatchEvent {
                user_principal: principal,
                video_id: "video456".to_string(),
                watch_duration_sec: 30,
                liked: false,
                completed: true,
                timestamp: 1234567891,
            },
        ];

        // Test to_bytes for vector
        let bytes = events.to_bytes();
        
        // Test from_bytes for vector
        let deserialized_events = Vec::<WatchEvent>::from_bytes(bytes);
        
        // Verify they match
        assert_eq!(events, deserialized_events);
        assert_eq!(events.len(), deserialized_events.len());
        
        // Test storing in a BTreeMap
        let mut map = BTreeMap::new();
        map.insert("video123".to_string(), events);
        
        // Verify we can add multiple events to the same key
        let mut events_for_video = map.get("video123".to_string()).unwrap().clone();
        events_for_video.push(WatchEvent {
            user_principal: principal,
            video_id: "video123".to_string(),
            watch_duration_sec: 15,
            liked: true,
            completed: true,
            timestamp: 1234567892,
        });
        
        map.insert("video123".to_string(), events_for_video);
        
        // Verify we have 3 events now
        assert_eq!(map.get("video123".to_string()).unwrap().len(), 3);
    }
}