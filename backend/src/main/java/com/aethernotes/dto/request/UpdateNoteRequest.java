package com.aethernotes.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class UpdateNoteRequest {

    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    private String content;

    private Set<String> tags;

    private Boolean favorite;
}
