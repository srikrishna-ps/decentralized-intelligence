require('dotenv').config();

const ipfsUrl = process.env.IPFS_URL || 'http://localhost:5001';

let client;

async function getClient() {
    if (client) return client;

    try {
        // Dynamic import for ESM module
        const { create } = await import('ipfs-http-client');
        client = create({ url: ipfsUrl });
        return client;
    } catch (error) {
        console.error('Failed to create IPFS client:', error);
        throw error;
    }
}

async function uploadFile(buffer) {
    const ipfs = await getClient();
    try {
        const result = await ipfs.add(buffer);
        return result.path; // Returns the CID
    } catch (error) {
        console.error('IPFS upload failed:', error);
        throw error;
    }
}

async function getFile(cid) {
    const ipfs = await getClient();
    try {
        const chunks = [];
        for await (const chunk of ipfs.cat(cid)) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('IPFS download failed:', error);
        throw error;
    }
}

module.exports = {
    getClient,
    uploadFile,
    getFile
};
