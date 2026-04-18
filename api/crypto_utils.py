import secrets
import hashlib

def generate_enterprise_key(prefix: str = "flux_agt_") -> tuple[str, str]:
    """
    Generates a cryptographically secure API key and its SHA-256 hash.
    Returns: (plain_text_key, hashed_key)
    """
    # 1. Generate 32 bytes of secure random data and convert to a hex string (64 characters)
    raw_secret = secrets.token_hex(32)
    
    # 2. Combine with the prefix
    plain_text_key = f"{prefix}{raw_secret}"
    
    # 3. Hash the key using SHA-256 for secure database storage
    # API keys have high entropy, so SHA-256 is perfectly safe and faster than bcrypt
    hashed_key = hashlib.sha256(plain_text_key.encode('utf-8')).hexdigest()
    
    return plain_text_key, hashed_key