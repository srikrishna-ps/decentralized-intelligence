// const ipfsService = require('../services/ipfsService');

exports.getFile = async (req, res) => {
    try {
        const { ipfsHash } = req.params;

        if (!ipfsHash) {
            return res.status(400).json({ success: false, error: 'IPFS hash is required' });
        }

        // MOCK MODE HANDLING:
        // If the hash is one of our known dummy hashes, redirect to a working IPFS file (e.g., IPFS Whitepaper)
        // This ensures the demo "Download" button always works, even with fake data.
        const DUMMY_HASHES = ['Qm34yfg3mpg5c', 'QmTest123', 'test-hash-123'];
        const FALLBACK_IPFS_URL = 'https://dweb.link/ipfs/QmS4ustL54uo8FzRRYy4c58XD2sD2zFjmoVacu8j99Xpy7'; // IPFS Whitepaper

        if (DUMMY_HASHES.includes(ipfsHash) || ipfsHash.startsWith('QmTest')) {
            console.log(`[IPFS] Intercepting dummy hash ${ipfsHash}, redirecting to fallback.`);
            return res.redirect(FALLBACK_IPFS_URL);
        }

        // Real IPFS Gateway
        const publicGatewayUrl = `https://dweb.link/ipfs/${ipfsHash}`;

        // PROXY MODE:
        // Fetch from gateway and pipe to client to avoid CORS/Gateway issues
        const response = await fetch(publicGatewayUrl);

        if (!response.ok) {
            throw new Error(`Gateway responded with ${response.status}`);
        }

        // Set headers
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${ipfsHash}"`);

        // Pipe the stream
        const { pipeline } = require('stream');
        const { promisify } = require('util');
        const streamPipeline = promisify(pipeline);

        await streamPipeline(response.body, res);

    } catch (error) {
        console.error('IPFS Get File Error:', error);
        res.status(500).json({ success: false, error: 'Failed to retrieve file from IPFS' });
    }
};
