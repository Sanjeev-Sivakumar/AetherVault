import os
import hashlib
import json
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# AES-256 key (32 bytes)
_AES_KEY = os.getenv("AES_STORAGE_KEY", "0123456789abcdef0123456789abcdef").encode("utf-8")[:32]
if len(_AES_KEY) < 32:
    _AES_KEY = _AES_KEY.ljust(32, b'0')

def encrypt_bytes(data: bytes) -> bytes:
    """
    Encrypt data using AES-256-GCM.
    Prepends a 12-byte random nonce to the ciphertext.
    """
    aesgcm = AESGCM(_AES_KEY)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data, None)
    return nonce + ciphertext

def decrypt_bytes(encrypted_data: bytes) -> bytes:
    """
    Decrypt data encrypted by AES-256-GCM.
    Extracts the 12-byte nonce from the beginning.
    """
    if len(encrypted_data) < 28:
        raise ValueError("Encrypted data is too short to be valid AES-GCM ciphertext")
    nonce = encrypted_data[:12]
    ciphertext = encrypted_data[12:]
    aesgcm = AESGCM(_AES_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None)

def compute_audit_hash(prev_hash: str, action: str, user_name: str, entity_type: str, entity_id: str, payload_str: str) -> str:
    """
    Compute tamper-evident SHA-256 hash for sequential blockchain-style audit chaining.
    """
    raw = f"{prev_hash}|{action}|{user_name}|{entity_type}|{entity_id}|{payload_str}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def calculate_file_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
