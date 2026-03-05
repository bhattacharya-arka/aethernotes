package com.aethernotes.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AuthResponse {

    private String accessToken;
    private String tokenType;
    private UUID userId;
    private String username;
    private String email;
    private long expiresIn;

    public static AuthResponse of(String token, UUID userId, String username, String email, long expiresIn) {
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(userId)
                .username(username)
                .email(email)
                .expiresIn(expiresIn)
                .build();
    }
}
