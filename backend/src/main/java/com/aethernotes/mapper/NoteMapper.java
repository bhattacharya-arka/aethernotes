package com.aethernotes.mapper;

import com.aethernotes.dto.response.NoteResponse;
import com.aethernotes.entity.Note;
import com.aethernotes.entity.Tag;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface NoteMapper {

    @Mapping(target = "userId",  source = "user.id")
    @Mapping(target = "content", ignore = true)   // populated by service after decryption
    @Mapping(target = "tags",    source = "tags")
    NoteResponse toResponse(Note note);

    default Set<String> mapTags(Set<Tag> tags) {
        if (tags == null) return Set.of();
        return tags.stream().map(Tag::getName).collect(Collectors.toSet());
    }
}
