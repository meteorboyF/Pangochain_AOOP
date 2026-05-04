package com.pangochain.backend.user;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User implements org.springframework.security.core.userdetails.UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String salt;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "firm_id")
    private Firm firm;

    @Column(name = "fabric_identity_id")
    private String fabricIdentityId;

    // ECIES P-256 public key in PEM format — sent from browser on registration
    @Column(name = "public_key_ecies", columnDefinition = "TEXT")
    private String publicKeyEcies;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    @Column(name = "mfa_enabled", nullable = false)
    @Builder.Default
    private boolean mfaEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AccountStatus status = AccountStatus.PENDING_APPROVAL;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
        if (status == null) status = AccountStatus.PENDING_APPROVAL;
    }

    public boolean isLegalProfessional() {
        return role != null && switch (role) {
            case CLIENT_PRIMARY, CLIENT_SECONDARY, CLIENT_CORP_ADMIN -> false;
            default -> true;
        };
    }

    public boolean isClient() {
        return !isLegalProfessional();
    }

    public boolean isPartnerOrAbove() {
        return role != null && switch (role) {
            case MANAGING_PARTNER, PARTNER_SENIOR, PARTNER_JUNIOR -> true;
            default -> false;
        };
    }

    public boolean requiresMfaEnrollment() {
        return isPartnerOrAbove() || role == UserRole.IT_ADMIN;
    }

    @Override
    public java.util.Collection<? extends org.springframework.security.core.GrantedAuthority> getAuthorities() {
        return java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != AccountStatus.SUSPENDED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == AccountStatus.ACTIVE;
    }
}
