package com.aethernotes.service;

import com.aethernotes.dto.response.TagResponse;
import com.aethernotes.mapper.TagMapper;
import com.aethernotes.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final TagMapper     tagMapper;

    /**
     * Returns all tags that are used in at least one of the user's notes.
     */
    @Transactional(readOnly = true)
    public List<TagResponse> getUserTags(UUID userId) {
        return tagMapper.toResponseList(tagRepository.findByUserId(userId));
    }
}
