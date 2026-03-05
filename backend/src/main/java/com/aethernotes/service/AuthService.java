package com.aethernotes.service;

import com.aethernotes.cache.CacheService;
import com.aethernotes.dto.request.LoginRequest;
import com.aethernotes.dto.request.RegisterRequest;
import com.aethernotes.dto.response.AuthResponse;
import com.aethernotes.encryption.EncryptionService;
import com.aethernotes.entity.User;
import com.aethernotes.exception.ApiException;
import com.aethernotes.repository.UserRepository;
import com.aethernotes.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final JwtTokenProvider      jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final EncryptionService     encryptionService;
    private final CacheService          cacheService;

    // ──────────────────────────────────────────────────────────────────────────
    //  Register
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email address is already registered");
        }
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new ApiException(HttpStatus.CONFLICT, "Username is already taken");
        }

        // Generate per-user salt for PBKDF2 key derivation
        byte[] salt = encryptionService.generateSalt();

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .encryptionSalt(Base64.getEncoder().encodeToString(salt))
                .build();

        User saved = userRepository.save(user);
        log.info("Registered new user: {} ({})", saved.getUsername(), saved.getId());

        // Derive key and cache it immediately so the new user can create notes
        byte[] encKey = encryptionService.deriveKey(req.getPassword(), salt);
        cacheService.storeEncryptionKey(saved.getId(), encKey);

        String token = generateToken(saved);
        return AuthResponse.of(token, saved.getId(), saved.getUsername(),
                saved.getEmail(), jwtTokenProvider.getExpiration());
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Login
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        // Authenticate – throws BadCredentialsException on failure
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );

        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        // Re-derive encryption key from plaintext password (never stored)
        byte[] salt   = Base64.getDecoder().decode(user.getEncryptionSalt());
        byte[] encKey = encryptionService.deriveKey(req.getPassword(), salt);
        cacheService.storeEncryptionKey(user.getId(), encKey);

        log.info("User {} logged in", user.getEmail());

        String token = generateToken(user);
        return AuthResponse.of(token, user.getId(), user.getUsername(),
                user.getEmail(), jwtTokenProvider.getExpiration());
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Logout
    // ──────────────────────────────────────────────────────────────────────────

    public void logout(String token, String userId) {
        // Blacklist the JWT so it cannot be reused
        cacheService.blacklistToken(token, Duration.ofMillis(jwtTokenProvider.getExpiration()));
        // Remove the encryption key from Redis
        try {
            cacheService.deleteEncryptionKey(java.util.UUID.fromString(userId));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid userId on logout: {}", userId);
        }
        log.info("User {} logged out", userId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private String generateToken(User user) {
        org.springframework.security.core.userdetails.User principal =
                new org.springframework.security.core.userdetails.User(
                        user.getEmail(), user.getPasswordHash(),
                        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"))
                );
        return jwtTokenProvider.generateToken(principal, user.getId());
    }
}
