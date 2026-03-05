package com.aethernotes.mapper;

import com.aethernotes.dto.response.TagResponse;
import com.aethernotes.entity.Tag;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TagMapper {

    TagResponse toResponse(Tag tag);

    List<TagResponse> toResponseList(List<Tag> tags);
}
