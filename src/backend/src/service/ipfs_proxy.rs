use candid::{CandidType, Deserialize};
use ic_cdk::{api::{self, management_canister::http_request::{
    HttpResponse, TransformArgs, TransformContext, HttpHeader, HttpMethod, CanisterHttpRequestArgument,
}}, export::Principal};
use ic_cdk_macros::{update, query};
use serde_bytes::ByteBuf;
use std::collections::HashMap;

// Register our exports with the IC
use ic_cdk::export::candid;

#[derive(CandidType, Deserialize, Debug)]
pub struct IPFSProxyResult {
    content: ByteBuf,
    content_type: String,
    status_code: u16,
}

#[derive(CandidType, Deserialize, Debug)]
pub struct IPFSProxyError {
    message: String,
    status_code: u16,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum IPFSProxyResponse {
    Ok(IPFSProxyResult),
    Err(IPFSProxyError),
}

/// Proxy a request to IPFS (Pinata) with authentication to bypass CORS
#[update]
pub async fn proxy_ipfs_content(cid: String) -> IPFSProxyResponse {
    // Build the URL for the Pinata gateway
    let gateway_domain = "salmon-worthy-hawk-798.mypinata.cloud";
    let url = format!("https://{}/ipfs/{}", gateway_domain, cid);
    
    // Get Pinata JWT from environment variable (would need to be set in the canister)
    let pinata_jwt = match api::trap::global_get("PINATA_JWT") {
        Some(jwt) => jwt,
        None => {
            return IPFSProxyResponse::Err(IPFSProxyError {
                message: "Pinata JWT not configured".to_string(),
                status_code: 500,
            })
        }
    };
    
    // Add authentication headers
    let request_headers = vec![
        HttpHeader {
            name: "Authorization".to_string(),
            value: format!("Bearer {}", pinata_jwt),
        },
        HttpHeader {
            name: "Accept".to_string(),
            value: "*/*".to_string(),
        },
    ];
    
    // Create HTTP request
    let request = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(10 * 1024 * 1024), // 10MB limit
        transform: Some(TransformContext::new(
            transform_ipfs_response, vec![], true
        )),
        headers: request_headers,
    };
    
    // Make HTTP request to Pinata
    match api::management_canister::http_request::http_request(request).await {
        Ok((response,)) => {
            if response.status >= 200 && response.status < 300 {
                // Determine content type from response headers or default to binary
                let content_type = response.headers.iter()
                    .find(|h| h.name.to_lowercase() == "content-type")
                    .map(|h| h.value.clone())
                    .unwrap_or_else(|| "application/octet-stream".to_string());
                
                IPFSProxyResponse::Ok(IPFSProxyResult {
                    content: ByteBuf::from(response.body),
                    content_type,
                    status_code: response.status,
                })
            } else {
                // Handle error status codes
                IPFSProxyResponse::Err(IPFSProxyError {
                    message: format!("IPFS request failed with status: {}", response.status),
                    status_code: response.status,
                })
            }
        },
        Err((code, msg)) => {
            IPFSProxyResponse::Err(IPFSProxyError {
                message: format!("HTTP request error: {} - {}", code, msg),
                status_code: 500,
            })
        }
    }
}

/// Function to transform the IPFS response
fn transform_ipfs_response(args: TransformArgs) -> HttpResponse {
    // Pass through the response
    args.response
}

/// Get the Pinata JWT environment variable
#[query]
pub fn has_pinata_jwt_configured() -> bool {
    api::trap::global_get::<String>("PINATA_JWT").is_some()
}

/// Set the Pinata JWT environment variable (admin only)
#[update]
pub fn set_pinata_jwt(jwt: String, caller: Principal) -> Result<(), String> {
    // In a real implementation, you'd check if caller is an admin
    // This is a simplified example
    let is_admin = true; // Replace with actual admin check
    
    if !is_admin {
        return Err("Only admins can set the Pinata JWT".to_string());
    }
    
    api::trap::global_put("PINATA_JWT", jwt);
    Ok(())
}
