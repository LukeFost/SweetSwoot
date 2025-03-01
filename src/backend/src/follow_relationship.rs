// Follow relationship module for ShawtyFormVideo
// Defines data structures for tracking user follows

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::Storable;
use ic_stable_structures::storable::Bound;
use std::borrow::Cow;
use serde::Serialize;

/// Represents a follow relationship between two users
#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct FollowRelationship {
    pub follower_principal: Principal, // The user who is following
    pub followed_principal: Principal, // The user being followed
    pub timestamp: u64,                // When the follow action occurred
}

/// Collection wrapper to handle the Rust orphan rule
/// This allows implementing foreign traits (Storable) for a collection type
#[derive(CandidType, Deserialize, Debug, Clone, PartialEq)]
pub struct FollowRelationshipList(pub Vec<FollowRelationship>);

impl Storable for FollowRelationshipList {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        candid::decode_one(bytes.as_ref()).unwrap()
    }

    // Set the size bound for storage optimization
    const BOUND: Bound = Bound::Bounded {
        max_size: 10_000,
        is_fixed_size: false,
    };
}