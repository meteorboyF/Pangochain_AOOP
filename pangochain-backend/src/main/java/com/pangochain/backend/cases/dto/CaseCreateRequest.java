package com.pangochain.backend.cases.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CaseCreateRequest {
    @NotBlank
    private String title;
    private String description;
    private String caseType;
}
