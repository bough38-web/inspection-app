import crypto from 'crypto';

// Use a consistent key derived from the Service Role Key (Zero-Config)
// SHA-256 hash of the service key ensures we get exactly 32 bytes suitable for AES-256
const getEncryptionKey = () => {
    const secret = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'default-fallback-secret-key-change-me';
    return crypto.createHash('sha256').update(secret).digest();
};

const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
    if (!text) return text;

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = getEncryptionKey();
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // Return format: IV:ENCRYPTED_DATA (Hex encoded)
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        console.error('Encryption failed:', e);
        return text; // Fail safe strategies: return original or throw
    }
}

export function decrypt(text: string): string {
    if (!text) return text;

    try {
        // Check format IV:DATA. If not matching, assume it's legacy plain text
        const parts = text.split(':');
        if (parts.length !== 2) return text; // Backward compatibility

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');

        if (iv.length !== IV_LENGTH) return text; // Invalid IV

        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (e) {
        // If decryption fails (e.g. key changed, wrong format), return original
        // console.warn('Decryption failed, returning original:', e);
        return text;
    }
}
