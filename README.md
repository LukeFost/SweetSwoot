# ShawtyFormVideo

A short-form video platform built on the Internet Computer with Base chain tipping and onramp integration.

## Overview

ShawtyFormVideo is a modern video platform that allows users to:
1. Upload and watch short-form videos via LivePeer integration
2. Tip content creators with cryptocurrency on Base chain
3. Acquire cryptocurrency directly in-app via Coinbase Developer Platform onramp
4. Sign in with Ethereum (SIWE) for a seamless web3 experience
5. Follow creators, comment on videos, and build a social network

The platform is built using:
1. Rust for the backend canister on Internet Computer
2. React + Vite + TypeScript for the frontend
3. LivePeer for video storage and streaming
4. Coinbase Developer Platform for cryptocurrency onramp
5. Base chain for tipping transactions

1. Clone the Repository & Rename
	1.	Clone the code:

git clone https://github.com/kristoferlund/ic-siwe-react-demo-rust.git ShawtyFormVideo
cd ShawtyFormVideo


	2.	Optional: Rename references (folder names, package.json, dfx.json, etc.) if you want to use ShawtyFormVideo as the name. For example, in dfx.json, you might change:

// Original
"canisters": {
  "backend": { ... },
  "ic_siwe_provider": { ... },
  "frontend": { ... }
}

to

// If you want a different canister name
"canisters": {
  "shawty_form_video_backend": { ... },
  "ic_siwe_provider": { ... },
  "shawty_form_video_frontend": { ... }
}

In package.json, you could change:

{
  "name": "ic-siwe-react-demo-rust",
  // ...
}

to

{
  "name": "shawty-form-video",
  // ...
}

The code will still work with the original names, so renaming is optional.

2. Install Dependencies

This repository uses pnpm as its package manager (though yarn or npm could also be used if you prefer). Make sure you have pnpm installed:

npm install -g pnpm

From the project root, run:

pnpm install

This will install both frontend and general dev dependencies for the entire project.

3. Local Development
	1.	Start dfx (the Internet Computer local replica):

dfx start --clean --background


	2.	Deploy the canisters (both the backend and the ic_siwe_provider canister) to your local replica:

make deploy-all

	•	This runs dfx deploy ic_siwe_provider with a set of init arguments (domain, uri, salt, chain_id, etc.).
	•	Then it deploys your backend canister, hooking it up to the SIWE provider canister.
	•	Finally it deploys your React web assets as an “assets canister” (the frontend).

	3.	Run the frontend dev server:

make run-frontend

or equivalently

pnpm run dev

By default, this will start Vite on http://127.0.0.1:5173.
You can open your browser at http://127.0.0.1:5173 to see the application.

Project Layout Recap
	•	src/backend/
Rust code for the main canister (where you’ll write your domain logic).
	•	ic_siwe_provider/
Pre-built canister + declarations for Sign in with Ethereum.
You typically won’t need to modify the code inside ic_siwe_provider; it’s added as a dependency.
	•	src/frontend/
Your React + TypeScript frontend, using wagmi and viem for Ethereum integration and ic-use-siwe-identity for IC identity integration.
	•	dfx.json
IC configuration (which canisters exist, how to build them, etc.).
	•	Makefile
Helper tasks to create, deploy, upgrade canisters, and run the frontend.

4. How the SIWE Flow Works
	1.	The frontend requests a SIWE message from the ic_siwe_provider canister.
	2.	The user signs the message with their Ethereum wallet.
	3.	The frontend sends the signed message back to the ic_siwe_provider.
	4.	The ic_siwe_provider canister verifies the signature and generates a delegated IC identity for the user.
	5.	The frontend can now make authenticated calls to your backend canister, as the user’s principal is recognized.

Hooking into your own backend
	•	The main code for storing or retrieving data from your backend canister is in src/backend/.
	•	The boilerplate shows a simple user-profile system.
	•	Modify or extend the backend Rust code to add your own domain logic, endpoints, etc.

5. Extending the Backend Canister

Inside src/backend/src/service/, you have example modules:
	•	get_my_profile.rs
	•	list_profiles.rs
	•	save_my_profile.rs

These demonstrate how to:
	•	Query a profile (with #[query] functions)
	•	Update or save a profile (with #[update] functions)

Steps to add a new endpoint
	1.	Create a new file in src/backend/src/service/ with a function annotated as either #[query] or #[update].
	2.	Add it to mod.rs (so it’s included in the final build).
	3.	Update your DID file in src/backend/backend.did to define new methods or new data types.
	4.	Rebuild and redeploy:

make deploy-backend

or

dfx deploy backend



That’s it. On the frontend, you’d import the new method from the auto-generated actor in src/backend/declarations/ (or via ic-use-actor if you prefer).

6. Deploying to the ICP Mainnet

When you are ready to deploy to mainnet, you have a couple of steps:
	1.	Authenticate with your dfx identity (ensure it has sufficient cycles or an available wallet).
Typically:

dfx identity use <your_mainnet_identity_name>


	2.	Set your environment to the IC mainnet:

dfx network use ic


	3.	Configure dfx.json for mainnet (if you want custom settings, e.g., canister names, WASM compression, etc.).
	4.	Deploy:

dfx deploy --network ic ic_siwe_provider --argument '(record { ... })'
dfx deploy --network ic backend --argument '(principal "<ic_siwe_provider_canister_id>")'
dfx deploy --network ic frontend

Or you can run:

make deploy-all

with the environment set to ic. You may need to tweak the Makefile arguments for production (different domain, scheme = “https”, etc.).

	5.	Update your canister IDs in any environment variables or .env file if needed (Vite needs them for the React define block in vite.config.ts).

Important SIWE Settings for Production
	•	In the Makefile, the dfx deploy ic_siwe_provider --argument "(record { ... })" call includes domain, uri, etc.:

domain = "127.0.0.1";
uri = "http://127.0.0.1:5173";
scheme = opt "http";

For mainnet, you’ll want to set the domain to your actual domain (e.g., mydapp.com) and the scheme to "https", and so on:

domain = "mydapp.com";
uri = "https://mydapp.com";
scheme = opt "https";

This ensures SIWE messages reference your real domain and thus are recognized as valid by the user’s wallet.

7. Common Commands

A quick cheat sheet for the most common commands:
	•	dfx start --clean --background
Starts a fresh local replica in the background.
	•	make create-canisters
Creates the canisters in dfx.json.
	•	make deploy-provider
Deploys only the ic_siwe_provider.
	•	make deploy-backend
Deploys only the backend.
	•	make deploy-frontend
Deploys only the frontend assets canister.
	•	make deploy-all
Runs all of the above steps in one go.
	•	make run-frontend
Runs pnpm run dev to start the Vite dev server for local development.
	•	dfx canister call <canister-name> <method>
To call canister methods from the command line.

8. Customizing Your Project
	1.	Use your own UI – You can replace or remove the entire profile/ flow with your own forms, images, etc.
	2.	Use additional canisters – You can add more Rust canisters in dfx.json and set up cross-canister calls from your backend to the new canisters.
	3.	Change Ethereum chain – In the file src/frontend/src/wagmi/wagmi.config.ts, you can add or remove supported EVM chains. If you want multiple testnets or other mainnets, you can add them in chains array.

9. Summary
	•	Clone the repo into your new project folder.
	•	Install dependencies (pnpm install).
	•	Start local development with dfx start --clean --background and make deploy-all.
	•	Run the frontend with pnpm run dev.
	•	Modify the Rust canister code in src/backend/ for your business logic.
	•	Deploy to the ICP mainnet by switching your dfx network to ic and providing production arguments (domain, scheme, etc.) to the SIWE provider canister.

This boilerplate should give you a quick starting point to:
	•	Build cross-chain dapps bridging Ethereum wallets into the IC.
	•	Store, query, and manage user data on your own custom Rust canisters.
	•	Expand the SIWE flow with additional logic and user experiences.

If you have any trouble with the above steps or want to explore more about “Sign in with Ethereum” for the Internet Computer, check out:
	•	ic-siwe GitHub organization
	•	ic-siwe-provider docs
	•	ic-use-siwe-identity docs
