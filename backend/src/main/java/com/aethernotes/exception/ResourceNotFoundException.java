package com.aethernotes.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }

    public static ResourceNotFoundException note(Object id) {
        return new ResourceNotFoundException("Note not found with id: " + id);
    }

    public static ResourceNotFoundException user(Object id) {
        return new ResourceNotFoundException("User not found with id: " + id);
    }
}
