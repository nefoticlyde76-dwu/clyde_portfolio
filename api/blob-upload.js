const { handleUpload } = require('@vercel/blob/client');

const MIME_TYPES = {
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
    gif: ['image/gif'],
    webp: ['image/webp'],
    pdf: ['application/pdf'],
};

const FOLDER_EXTENSIONS = {
    projects: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    certificates: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
    designs: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    profile: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    resume: ['pdf'],
};

function decodeBase64Url(value) {
    return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function verifyClientPayload(value) {
    const secret = process.env.BLOB_UPLOAD_SECRET || '';
    if (!secret || typeof value !== 'string') {
        return null;
    }

    const [encodedPayload, encodedSignature, ...extra] = value.split('.');
    if (!encodedPayload || !encodedSignature || extra.length > 0) {
        return null;
    }

    const expected = require('crypto')
        .createHmac('sha256', secret)
        .update(encodedPayload)
        .digest();
    const received = decodeBase64Url(encodedSignature);
    if (received.length !== expected.length || !require('crypto').timingSafeEqual(received, expected)) {
        return null;
    }

    try {
        const claims = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'));
        if (
            !claims
            || typeof claims !== 'object'
            || !Number.isSafeInteger(claims.expires)
            || claims.expires < Math.floor(Date.now() / 1000)
        ) {
            return null;
        }
        return claims;
    } catch {
        return null;
    }
}

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        response.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    try {
        const result = await handleUpload({
            body: request.body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                const claims = verifyClientPayload(clientPayload);
                const match = /^uploads\/(projects|certificates|designs|profile|resume)\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.exec(pathname);
                if (!claims || !match || pathname.includes('..') || claims.folder !== match[1]) {
                    throw new Error('Upload authorization is invalid or expired.');
                }

                const extension = pathname.split('.').pop().toLowerCase();
                if (!FOLDER_EXTENSIONS[match[1]].includes(extension)) {
                    throw new Error('That file type is not allowed.');
                }

                const allowedContentTypes = MIME_TYPES[extension];
                const maximumSizeInBytes = extension === 'pdf' ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
                return { allowedContentTypes, maximumSizeInBytes, addRandomSuffix: true };
            },
        });

        response.status(200).json(result);
    } catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : 'Upload could not be authorized.' });
    }
};
