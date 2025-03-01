// Follow system service for ShawtyFormVideo
// Provides API methods for handling user follow relationships

use crate::{FollowRelationship, FollowRelationshipList, FOLLOW_RELATIONSHIPS};
use candid::Principal;
use ic_cdk::caller;
use std::time::{SystemTime, UNIX_EPOCH};

/// Enables a user to follow another user
/// 
/// # Arguments
/// 
/// * `principal_to_follow` - The principal ID of the user to follow
/// 
/// # Returns
/// 
/// * `Result<(), String>` - Ok(()) on success, Err with message on failure
#[ic_cdk::update]
pub fn follow_user(principal_to_follow: Principal) -> Result<(), String> {
    // Get the caller's principal
    let caller_principal = caller();
    
    // Prevent self-following
    if caller_principal == principal_to_follow {
        return Err("You cannot follow yourself".to_string());
    }
    
    // Create a composite key for storage
    let relationship_key = format!("{}:{}", 
        caller_principal.to_string(), 
        principal_to_follow.to_string()
    );
    
    // Check if already following
    if FOLLOW_RELATIONSHIPS.with(|relationships| {
        relationships.borrow().contains_key(&relationship_key)
    }) {
        return Err("You are already following this user".to_string());
    }

    // Create the follow relationship object
    let follow_relationship = FollowRelationship {
        follower_principal: caller_principal,
        followed_principal: principal_to_follow,
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    
    // Store the relationship in stable storage
    FOLLOW_RELATIONSHIPS.with(|relationships| {
        let mut relationships_map = relationships.borrow_mut();
        relationships_map.insert(
            relationship_key,
            FollowRelationshipList(vec![follow_relationship]),
        );
    });
    
    Ok(())
}

/// Enables a user to unfollow another user
/// 
/// # Arguments
/// 
/// * `principal_to_unfollow` - The principal ID of the user to unfollow
/// 
/// # Returns
/// 
/// * `Result<(), String>` - Ok(()) on success, Err with message on failure
#[ic_cdk::update]
pub fn unfollow_user(principal_to_unfollow: Principal) -> Result<(), String> {
    // Get the caller's principal
    let caller_principal = caller();
    
    // Create the composite key for lookup
    let relationship_key = format!("{}:{}", 
        caller_principal.to_string(), 
        principal_to_unfollow.to_string()
    );
    
    // Remove the relationship from stable storage
    FOLLOW_RELATIONSHIPS.with(|relationships| {
        let mut relationships_map = relationships.borrow_mut();
        if relationships_map.contains_key(&relationship_key) {
            relationships_map.remove(&relationship_key);
            Ok(())
        } else {
            Err("You are not following this user".to_string())
        }
    })
}

/// Retrieves all followers of a specified user
/// 
/// # Arguments
/// 
/// * `user_principal` - The principal ID of the user
/// 
/// # Returns
/// 
/// * `Vec<Principal>` - List of principal IDs that follow the user
#[ic_cdk::query]
pub fn get_followers(user_principal: Principal) -> Vec<Principal> {
    // Query storage for all relationships where followed_principal matches the given user
    // We use the key pattern to efficiently find relationships
    let user_str = user_principal.to_string();
    
    FOLLOW_RELATIONSHIPS.with(|relationships| {
        relationships
            .borrow()
            .iter()
            .filter(|(key, _)| {
                let parts: Vec<&str> = key.split(':').collect();
                parts.len() == 2 && parts[1] == user_str
            })
            .map(|(key, _)| {
                let parts: Vec<&str> = key.split(':').collect();
                // Safe to unwrap as we checked the key format in filter
                Principal::from_text(parts[0]).unwrap_or_else(|_| Principal::anonymous())
            })
            .collect()
    })
}

/// Retrieves all users that a specified user is following
/// 
/// # Arguments
/// 
/// * `user_principal` - The principal ID of the user
/// 
/// # Returns
/// 
/// * `Vec<Principal>` - List of principal IDs that the user follows
#[ic_cdk::query]
pub fn get_following(user_principal: Principal) -> Vec<Principal> {
    // Query storage for all relationships where follower_principal matches the given user
    // We use the key pattern to efficiently find relationships
    let user_str = user_principal.to_string();
    
    FOLLOW_RELATIONSHIPS.with(|relationships| {
        relationships
            .borrow()
            .iter()
            .filter(|(key, _)| {
                let parts: Vec<&str> = key.split(':').collect();
                parts.len() == 2 && parts[0] == user_str
            })
            .map(|(key, _)| {
                let parts: Vec<&str> = key.split(':').collect();
                // Safe to unwrap as we checked the key format in filter
                Principal::from_text(parts[1]).unwrap_or_else(|_| Principal::anonymous())
            })
            .collect()
    })
}

/// Checks if one user is following another
/// 
/// # Arguments
/// 
/// * `follower` - Principal ID of the potential follower
/// * `followed` - Principal ID of the potentially followed user
/// 
/// # Returns
/// 
/// * `bool` - True if follower is following followed, false otherwise
#[ic_cdk::query]
pub fn is_following(follower: Principal, followed: Principal) -> bool {
    // Create the composite key and check if it exists in storage
    let relationship_key = format!("{}:{}", follower.to_string(), followed.to_string());
    
    FOLLOW_RELATIONSHIPS.with(|relationships| {
        relationships.borrow().contains_key(&relationship_key)
    })
}