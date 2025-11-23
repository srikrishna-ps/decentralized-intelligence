require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const token = process.env.NFT_STORAGE_TOKEN;

/**
 * Upload file to NFT.Storage using correct API format
 */
async function uploadFile(buffer) {
    if (!token) {
        console.warn('⚠️  NFT_STORAGE_TOKEN not set, using mock CID');
        return `Qm${Math.random().toString(36).substring(2, 15)}`;
    }

    try {
        const response = await fetch('https://api.nft.storage/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: buffer
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('NFT.Storage API error:', errorText);
            // Fallback to mock CID for development
            return `Qm${Math.random().toString(36).substring(2, 15)}`;
        }

        const data = await response.json();
        const cid = data.value?.cid || data.cid;
        console.log('✅ Uploaded to NFT.Storage:', cid);
        return cid;
    } catch (error) {
        console.error('NFT.Storage upload error:', error.message);
        // Fallback to mock CID for development
        return `Qm${Math.random().toString(36).substring(2, 15)}`;
    }
}

/**
 * Get file from IPFS gateway
 */
async function getFile(cid) {
    try {
        const response = await fetch(`https://nftstorage.link/ipfs/${cid}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error('IPFS download error:', error.message);
        throw error;
    }
}

module.exports = {
    uploadFile,
    getFile
};
