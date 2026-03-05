package com.aethernotes.controller;

import com.aethernotes.dto.response.TagResponse;
import com.aethernotes.repository.UserRepository;
import com.aethernotes.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService     tagService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<TagResponse>> getUserTags(
            @AuthenticationPrincipal UserDetails principal
    ) {
        UUID userId = userRepository.findByEmail(principal.getUsername())
                .map(u -> u.getId())
                .orElseThrow(() -> new com.aethernotes.exception.ResourceNotFoundException(
                        "User not found: " + principal.getUsername()));
        return ResponseEntity.ok(tagService.getUserTags(userId));
    }
}
