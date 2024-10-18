// app.js

// Global Variables
let web3;
let userAddress = null;
let userBalance = 0;
let serviceRequests = [];
let selectedMediaFiles = [];

// Function to detect the environment
function getEnvironment() {
    if (typeof window.ethereum !== 'undefined') {
        return 'metamask-extension';
    } else if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return 'mobile';
    }
    return 'desktop';
}

// Connect Wallet
async function connectWallet() {
    console.log("Attempting to connect wallet...");
    const env = getEnvironment();
    console.log(`Detected environment: ${env}`);

    if (env === 'mobile') {
        connectMobileWallet();
    } else {
        await connectDesktopWallet();
    }
}

function connectMobileWallet() {
    const dappUrl = 'yourusername.github.io/EQIV'; // Replace with your GitHub Pages URL without 'https://'
    const metamaskAppDeepLink = `https://metamask.app.link/dapp/${dappUrl}`;
    window.location.href = metamaskAppDeepLink;
}

async function connectDesktopWallet() {
    try {
        if (typeof window.ethereum !== 'undefined') {
            web3 = new Web3(window.ethereum);
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            await handleSuccessfulConnection(accounts[0]);
        } else {
            throw new Error('MetaMask is not installed');
        }
    } catch (error) {
        console.error(`Error connecting to MetaMask: ${error.message}`);
        alert('MetaMask is required to use this application.');
    }
}

async function handleSuccessfulConnection(address) {
    userAddress = address;
    console.log(`Connected successfully. Address: ${userAddress}`);

    // Check if we're on the correct chain (e.g., Ethereum Mainnet)
    const chainId = await web3.eth.getChainId();
    console.log(`Current chain ID: ${chainId}`);
    if (chainId !== 1) {
        console.log("Not on Ethereum Mainnet, attempting to switch...");
        await switchToEthereumMainnet();
    }

    // Simulate USDC balance check (replace with actual balance check in a real dApp)
    userBalance = 100; // Simulated 100 USDC balance

    document.getElementById('walletInfo').innerHTML = `
        Connected: ${truncateAddress(userAddress)} | USDC Balance: ${userBalance}
    `;

    // Enable buttons after successful connection
    document.getElementById('createRequestBtn').disabled = false;
    document.getElementById('viewRequestsBtn').disabled = false;
}

// Switch to Ethereum Mainnet
async function switchToEthereumMainnet() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }], // Ethereum Mainnet chain ID
        });
        console.log("Successfully switched to Ethereum Mainnet");
    } catch (switchError) {
        console.error(`Error switching chain: ${switchError.message}`);
        alert('Please switch to Ethereum Mainnet in your wallet.');
    }
}

// Utility Function to Truncate Address
function truncateAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// Event Listeners for Navigation Buttons
document.getElementById('connectWallet').addEventListener('click', connectWallet);
document.getElementById('createRequestBtn').addEventListener('click', () => {
    if (!userAddress) {
        alert('Please connect your wallet first.');
        return;
    }
    showPage('createRequestPage');
});
document.getElementById('viewRequestsBtn').addEventListener('click', () => {
    if (!userAddress) {
        alert('Please connect your wallet first.');
        return;
    }
    showPage('viewRequestsPage');
    renderServiceRequests();
});
document.querySelectorAll('.backBtn').forEach(btn => {
    btn.addEventListener('click', () => showPage('homePage'));
});

// Handle Service Media Uploads
function handleServiceMediaUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        selectedMediaFiles = [];
        for (let i = 0; i < files.length; i++) {
            selectedMediaFiles.push(files[i]);
        }
        updateMediaPreview();
    }
    event.target.value = ''; // Reset the input value
}

// Update Media Preview
function updateMediaPreview() {
    const mediaPreview = document.getElementById('mediaPreview');
    mediaPreview.innerHTML = '';
    if (selectedMediaFiles.length > 0) {
        selectedMediaFiles.forEach(file => {
            const mediaElement = document.createElement(file.type.startsWith('image/') ? 'img' : 'video');
            mediaElement.src = URL.createObjectURL(file);
            if (file.type.startsWith('video/')) {
                mediaElement.controls = true;
            }
            mediaElement.onclick = () => expandMedia(mediaElement.src, file.type);
            mediaPreview.appendChild(mediaElement);
        });
    } else {
        mediaPreview.innerHTML = 'No media selected';
    }
}

// Expand Media
function expandMedia(src, type) {
    const expandedView = document.createElement('div');
    expandedView.className = 'expanded-view';
    expandedView.onclick = () => document.body.removeChild(expandedView);

    const mediaElement = document.createElement(type.startsWith('image/') ? 'img' : 'video');
    mediaElement.src = src;
    if (type.startsWith('video/')) {
        mediaElement.controls = true;
    }
    expandedView.appendChild(mediaElement);

    document.body.appendChild(expandedView);
}

// Event Listener for Media Upload
document.getElementById('serviceMedia').addEventListener('change', handleServiceMediaUpload);

// Submit Service Request
document.getElementById('requestForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const category = document.getElementById('serviceCategory').value;
    const title = document.getElementById('serviceTitle').value.trim();
    const description = document.getElementById('serviceDescription').value.trim();
    const budget = parseFloat(document.getElementById('serviceBudget').value);
    const location = document.getElementById('serviceLocation').value.trim();

    if (!category || !title || !description || isNaN(budget) || !location) {
        alert('Please fill in all required fields.');
        return;
    }

    const mediaFiles = selectedMediaFiles.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'video',
        url: URL.createObjectURL(file)
    }));

    const serviceRequest = {
        id: Date.now(),
        requester: userAddress,
        category,
        title,
        description,
        budget,
        location,
        media: mediaFiles,
        bids: []
    };

    serviceRequests.push(serviceRequest);
    console.log(`New service request created: ${serviceRequest.id}`);

    // Reset Form
    event.target.reset();
    selectedMediaFiles = [];
    updateMediaPreview();

    alert('Service request submitted successfully!');
    showPage('homePage');
});

// Render Service Requests
function renderServiceRequests() {
    const container = document.getElementById('requestContainer');
    container.innerHTML = '';

    const filterCategory = document.getElementById('filterCategory').value;

    const filteredRequests = serviceRequests.filter(request => {
        return filterCategory === 'all' || request.category === filterCategory;
    });

    if (filteredRequests.length === 0) {
        container.innerHTML = '<p>No service requests available.</p>';
        return;
    }

    filteredRequests.forEach(request => {
        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.innerHTML = `
            <h3>${request.title}</h3>
            <p><strong>Category:</strong> ${formatCategory(request.category)}</p>
            <p><strong>Budget:</strong> ${request.budget} USDC</p>
            <p><strong>Location:</strong> ${request.location}</p>
            <button onclick="viewRequestDetails(${request.id})">View Details</button>
        `;
        container.appendChild(requestElement);
    });
}

// Format Category
function formatCategory(category) {
    return category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// View Request Details
function viewRequestDetails(requestId) {
    const request = serviceRequests.find(req => req.id === requestId);
    if (request) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <h2>${request.title}</h2>
            <p><strong>Requested by:</strong> ${truncateAddress(request.requester)}</p>
            <p><strong>Category:</strong> ${formatCategory(request.category)}</p>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Budget:</strong> ${request.budget} USDC</p>
            <p><strong>Location:</strong> ${request.location}</p>
            <div class="media-container"></div>
            <h3>Place Your Bid</h3>
            <input type="number" id="bidAmount" placeholder="Bid Amount (USDC)" required>
            <textarea id="bidMessage" rows="3" placeholder="Message to the requester (optional)"></textarea>
            <button onclick="placeBid(${request.id})">Submit Bid</button>
        `;

        const mediaContainer = modalBody.querySelector('.media-container');
        if (request.media.length > 0) {
            request.media.forEach(media => {
                const mediaElement = document.createElement(media.type === 'image' ? 'img' : 'video');
                mediaElement.src = media.url;
                if (media.type === 'video') {
                    mediaElement.controls = true;
                }
                mediaElement.onclick = () => expandMedia(media.url, media.type);
                mediaContainer.appendChild(mediaElement);
            });
        } else {
            mediaContainer.innerHTML = '<p>No media attached.</p>';
        }

        showModal();
    }
}

// Place Bid
function placeBid(requestId) {
    const bidAmount = parseFloat(document.getElementById('bidAmount').value);
    const bidMessage = document.getElementById('bidMessage').value.trim();

    if (isNaN(bidAmount) || bidAmount <= 0) {
        alert('Please enter a valid bid amount.');
        return;
    }

    const request = serviceRequests.find(req => req.id === requestId);
    if (request) {
        request.bids.push({
            bidder: userAddress,
            amount: bidAmount,
            message: bidMessage,
            timestamp: new Date()
        });
        alert('Bid submitted successfully!');
        closeModal();
        renderServiceRequests();
    }
}

// Show Modal
function showModal() {
    const modal = document.getElementById('requestModal');
    modal.style.display = 'block';
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('requestModal');
    modal.style.display = 'none';
}

// Event Listener for Close Button in Modal
document.querySelector('.closeBtn').addEventListener('click', closeModal);

// Event Listener for Outside Click to Close Modal
window.addEventListener('click', (event) => {
    const modal = document.getElementById('requestModal');
    if (event.target === modal) {
        closeModal();
    }
});

// Event Listener for Filter Change
document.getElementById('filterCategory').addEventListener('change', renderServiceRequests);

// Initial Setup
showPage('homePage');
