package com.pangochain.backend.config;

import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseMember;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.caseevent.CaseEvent;
import com.pangochain.backend.caseevent.CaseEventRepository;
import com.pangochain.backend.chat.ChatService;
import com.pangochain.backend.crypto.Pbkdf2Service;
import com.pangochain.backend.document.DocStatus;
import com.pangochain.backend.document.DocumentRepository;
import com.pangochain.backend.hearing.Hearing;
import com.pangochain.backend.hearing.HearingRepository;
import com.pangochain.backend.reminder.Reminder;
import com.pangochain.backend.reminder.ReminderRepository;
import com.pangochain.backend.user.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final FirmRepository firmRepository;
    private final CaseRepository caseRepository;
    private final HearingRepository hearingRepository;
    private final ReminderRepository reminderRepository;
    private final CaseEventRepository caseEventRepository;
    private final DocumentRepository documentRepository;
    private final Pbkdf2Service pbkdf2Service;
    private final ChatService chatService;

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedBaseData();
        // Idempotent: associates A–D, their case membership, and starter chat messages.
        seedTeamAndChat();
        // Idempotent: demo data for Sprint 1–3 features (settlement offers, billing, milestones,
        // deadlines, satisfaction feedback) on the Chen v. Meridian case so they're visible live.
        seedFeatureDemoData();
    }

    private void seedBaseData() {
        log.info("Seeding demo data…");

        Firm firmA = firmRepository.findAll().stream()
                .filter(f -> "FirmAMSP".equals(f.getMspId()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("FirmA not found — run migrations first"));

        // ── Users ──────────────────────────────────────────────────────────────
        User admin = createUser("admin@pangolawfirm.com", "Admin123!", "Alexandra Webb",
                UserRole.MANAGING_PARTNER, firmA, AccountStatus.ACTIVE);

        User lawyer = createUser("lawyer@pangolawfirm.com", "Lawyer123!", "James Harrington",
                UserRole.ASSOCIATE_SENIOR, firmA, AccountStatus.ACTIVE);

        User paralegal = createUser("paralegal@pangolawfirm.com", "Paralegal123!", "Priya Nair",
                UserRole.PARALEGAL, firmA, AccountStatus.ACTIVE);

        User client = createUser("client@demo.com", "Client123!", "Marcus Chen",
                UserRole.CLIENT_PRIMARY, null, AccountStatus.ACTIVE);

        User client2 = createUser("client2@demo.com", "Client123!", "Sofia Delgado",
                UserRole.CLIENT_SECONDARY, null, AccountStatus.ACTIVE);

        // ── Cases ──────────────────────────────────────────────────────────────
        Case case1 = ensureCase("Chen v. Meridian Holdings — Contract Dispute",
                "Client Marcus Chen disputes breach of commercial lease agreement by Meridian Holdings Ltd. Damages sought: $485,000.",
                "Commercial Litigation", firmA, lawyer);

        Case case2 = ensureCase("Delgado Estate — Probate Proceedings",
                "Probate and estate administration for the Delgado family following the passing of Roberto Delgado. Multiple assets under review.",
                "Probate & Estate", firmA, admin);

        Case case3 = ensureCase("In Re: Pinnacle Corp Data Breach",
                "Class action defence representing Pinnacle Corp against claims of negligent data handling affecting 12,000 customers.",
                "Data Privacy / Class Action", firmA, admin);

        // ── Case Members ───────────────────────────────────────────────────────
        saveMemberIfAbsent(case1.getId(), lawyer.getId(), "Lead Counsel", lawyer.getId());
        saveMemberIfAbsent(case1.getId(), paralegal.getId(), "Paralegal", lawyer.getId());
        saveMemberIfAbsent(case1.getId(), client.getId(), "Primary Client", lawyer.getId());

        saveMemberIfAbsent(case2.getId(), admin.getId(), "Lead Partner", admin.getId());
        saveMemberIfAbsent(case2.getId(), client2.getId(), "Primary Client", admin.getId());

        saveMemberIfAbsent(case3.getId(), admin.getId(), "Lead Partner", admin.getId());
        saveMemberIfAbsent(case3.getId(), lawyer.getId(), "Senior Associate", admin.getId());

        // ── Case Clients (client portal association) ───────────────────────────
        saveClientCase(case1.getId(), client.getId(), lawyer.getId());
        saveClientCase(case2.getId(), client2.getId(), admin.getId());

        // ── Hearings ───────────────────────────────────────────────────────────
        seedHearingsIfAbsent(case1, case2, case3, lawyer, admin);

        // ── Reminders from lawyer to client ────────────────────────────────────
        seedRemindersIfAbsent(case1, case2, lawyer, admin, client, client2);

        // ── Case Events (timeline) ─────────────────────────────────────────────
        seedCaseEventsIfAbsent(case1, case2, case3, lawyer, admin);
        seedDocumentsIfAbsent(case1, case2, case3, lawyer, admin, paralegal, client, client2);

        log.info("✅ Seed data complete — 4 users, 3 cases, 4+ hearings, 4 reminders, timeline events");
        log.info("──────────────────────────────────────────────────────────────────");
        log.info("  Managing Partner : admin@pangolawfirm.com  / Admin123!");
        log.info("  Senior Associate : lawyer@pangolawfirm.com / Lawyer123!");
        log.info("  Paralegal        : paralegal@pangolawfirm.com / Paralegal123!");
        log.info("  Client (primary) : client@demo.com         / Client123!");
        log.info("  Client 2         : client2@demo.com        / Client123!");
        log.info("──────────────────────────────────────────────────────────────────");
    }

    private User createUser(String email, String password, String fullName,
                            UserRole role, Firm firm, AccountStatus status) {
        // Check first — idempotent across restarts.
        User existing = findUserByEmailNative(email);
        if (existing != null) return existing;
        String salt = pbkdf2Service.generateSalt();
        String hash = pbkdf2Service.hash(password, salt);
        em.createNativeQuery("""
                INSERT INTO users (email, password_hash, salt, full_name, role, firm_id, status, mfa_enabled, created_at)
                VALUES (:email, :hash, :salt, :fullName, CAST(:role AS user_role), :firmId, CAST(:status AS account_status), false, now())
                ON CONFLICT (email) DO NOTHING
                """)
                .setParameter("email", email)
                .setParameter("hash", hash)
                .setParameter("salt", salt)
                .setParameter("fullName", fullName)
                .setParameter("role", role.name())
                .setParameter("firmId", firm != null ? firm.getId() : null)
                .setParameter("status", status.name())
                .executeUpdate();
        em.flush();
        return findUserByEmailNative(email);
    }

    /**
     * Additive seed (runs every startup, idempotent): four associates A–D under the senior
     * associate for the delegation story, added to the Chen v. Meridian case team, plus a
     * couple of starter chat messages so the case and firm channels aren't empty.
     */
    private void seedTeamAndChat() {
        Firm firmA = firmRepository.findAll().stream()
                .filter(f -> "FirmAMSP".equals(f.getMspId())).findFirst().orElse(null);
        if (firmA == null) return;
        User lawyer = findUserByEmailNative("lawyer@pangolawfirm.com");
        if (lawyer == null) return; // base seed not present yet

        User a = ensureUser("a@pangolawfirm.com", "Assoc123!", "Aaron Avers (Associate A)", UserRole.ASSOCIATE_JUNIOR, firmA);
        User b = ensureUser("b@pangolawfirm.com", "Assoc123!", "Bianca Bose (Associate B)", UserRole.ASSOCIATE_JUNIOR, firmA);
        User c = ensureUser("c@pangolawfirm.com", "Assoc123!", "Carlos Cruz (Associate C)", UserRole.ASSOCIATE_JUNIOR, firmA);
        User d = ensureUser("d@pangolawfirm.com", "Assoc123!", "Dana Diaz (Associate D)", UserRole.ASSOCIATE_JUNIOR, firmA);

        Case case1 = caseRepository.findAll().stream()
                .filter(x -> x.getTitle() != null && x.getTitle().startsWith("Chen v. Meridian"))
                .findFirst().orElse(null);
        if (case1 != null) {
            for (User u : java.util.stream.Stream.of(a, b, c, d)
                    .filter(java.util.Objects::nonNull).toList()) {
                saveMemberIfAbsent(case1.getId(), u.getId(), "Associate", lawyer.getId());
            }
            UUID conv = chatService.ensureCaseConversationId(case1);
            if (chatService.isEmpty(conv)) {
                chatService.post(conv, lawyer, "Team — kicking off Chen v. Meridian. I'll distribute the document set shortly.");
                chatService.post(conv, a, "On it. I'll take the lease exhibits.");
                chatService.post(conv, b, "I'll start the correspondence review.");
            }
        }
        UUID firmConv = chatService.ensureFirmConversationId(firmA.getId());
        if (chatService.isEmpty(firmConv)) {
            User admin = findUserByEmailNative("admin@pangolawfirm.com");
            if (admin == null) admin = lawyer;
            chatService.post(firmConv, admin, "Welcome to the firm channel — use this for firm-wide coordination.");
            chatService.post(firmConv, lawyer, "Thanks. Chen v. Meridian team is staffed and moving.");
        }
        log.info("✅ Team/chat seed complete — associates a–d@pangolawfirm.com / Assoc123!");
    }

    private User ensureUser(String email, String password, String fullName, UserRole role, Firm firm) {
        // Check first: if user already exists, return immediately without touching the DB.
        User existing = findUserByEmailNative(email);
        if (existing != null) return existing;
        // Not found — insert and return.
        String salt = pbkdf2Service.generateSalt();
        String hash = pbkdf2Service.hash(password, salt);
        em.createNativeQuery("""
                INSERT INTO users (email, password_hash, salt, full_name, role, firm_id, status, mfa_enabled, created_at)
                VALUES (:email, :hash, :salt, :fullName, CAST(:role AS user_role), :firmId, CAST('ACTIVE' AS account_status), false, now())
                ON CONFLICT (email) DO NOTHING
                """)
                .setParameter("email", email)
                .setParameter("hash", hash)
                .setParameter("salt", salt)
                .setParameter("fullName", fullName)
                .setParameter("role", role.name())
                .setParameter("firmId", firm != null ? firm.getId() : null)
                .executeUpdate();
        em.flush();
        return findUserByEmailNative(email);
    }

    /**
     * Read a user's UUID directly from PostgreSQL (bypasses the Hibernate session
     * cache so this works both before and after a native INSERT in the same session).
     * Returns null if not found.
     */
    private User findUserByEmailNative(String email) {
        java.util.List<?> ids = em.createNativeQuery("SELECT id FROM users WHERE lower(email) = lower(:email) ORDER BY created_at, id")
                .setParameter("email", email)
                .getResultList();
        if (ids.isEmpty()) return null;
        Object id = ids.get(0);
        UUID uuid = id instanceof UUID u ? u : UUID.fromString(id.toString());
        return userRepository.findById(uuid).orElse(null);
    }

    private Case ensureCase(String title, String description, String caseType, Firm firm, User createdBy) {
        Case existing = caseRepository.findAll().stream()
                .filter(x -> title.equals(x.getTitle()))
                .findFirst()
                .orElse(null);
        if (existing != null) return existing;

        Case legalCase = Case.builder()
                .title(title)
                .description(description)
                .caseType(caseType)
                .firm(firm)
                .createdBy(createdBy)
                .build();
        return caseRepository.save(legalCase);
    }

    private long countByCase(String table, UUID caseId) {
        return count(table, "case_id", caseId);
    }

    private void seedHearingsIfAbsent(Case case1, Case case2, Case case3, User lawyer, User admin) {
        if (countByCase("hearings", case1.getId()) == 0) {
            hearingRepository.save(Hearing.builder()
                    .legalCase(case1)
                    .title("Preliminary Injunction Hearing")
                    .hearingDate(Instant.now().plus(14, ChronoUnit.DAYS))
                    .location("Courtroom 4B, Superior Court")
                    .courtName("Los Angeles Superior Court")
                    .hearingType("INJUNCTION_HEARING")
                    .notes("Prepare lease termination exhibits. Opposing counsel may seek continuance.")
                    .createdBy(lawyer)
                    .build());
            hearingRepository.save(Hearing.builder()
                    .legalCase(case1)
                    .title("Discovery Conference")
                    .hearingDate(Instant.now().plus(7, ChronoUnit.DAYS))
                    .location("Zoom - Remote Hearing")
                    .courtName("Los Angeles Superior Court")
                    .hearingType("CONFERENCE")
                    .notes("Exchange of document lists. Ensure all Fabric-anchored docs are listed.")
                    .createdBy(lawyer)
                    .build());
            hearingRepository.save(Hearing.builder()
                    .legalCase(case1)
                    .title("Case Management Conference")
                    .hearingDate(Instant.now().minus(10, ChronoUnit.DAYS))
                    .location("Courtroom 4B, Superior Court")
                    .courtName("Los Angeles Superior Court")
                    .hearingType("CONFERENCE")
                    .notes("Initial scheduling order issued. Trial date set for Q3.")
                    .createdBy(lawyer)
                    .build());
        }

        if (countByCase("hearings", case2.getId()) == 0) {
            hearingRepository.save(Hearing.builder()
                    .legalCase(case2)
                    .title("Estate Valuation Hearing")
                    .hearingDate(Instant.now().plus(21, ChronoUnit.DAYS))
                    .location("Probate Court, Room 12")
                    .courtName("County Probate Court")
                    .hearingType("PROBATE_HEARING")
                    .notes("Expert valuator to present asset assessment report.")
                    .createdBy(admin)
                    .build());
        }

        if (countByCase("hearings", case3.getId()) == 0) {
            hearingRepository.save(Hearing.builder()
                    .legalCase(case3)
                    .title("Class Certification Hearing")
                    .hearingDate(Instant.now().plus(45, ChronoUnit.DAYS))
                    .location("Federal Court, Courtroom 22A")
                    .courtName("US District Court, Central District CA")
                    .hearingType("COURT_HEARING")
                    .notes("Opposition brief due 7 days prior. Technical expert on data security required.")
                    .createdBy(admin)
                    .build());
        }
    }

    private void seedRemindersIfAbsent(Case case1, Case case2, User lawyer, User admin, User client, User client2) {
        if (countByCase("reminders", case1.getId()) == 0) {
            reminderRepository.save(Reminder.builder()
                    .legalCase(case1)
                    .sender(lawyer)
                    .recipient(client)
                    .title("Upload signed retainer agreement")
                    .body("Please upload the signed retainer agreement to your Document Vault as soon as possible. We need it before the Discovery Conference next week. Use the CONFIDENTIAL flag when uploading.")
                    .dueAt(Instant.now().plus(5, ChronoUnit.DAYS))
                    .priority("HIGH")
                    .read(false)
                    .build());
            reminderRepository.save(Reminder.builder()
                    .legalCase(case1)
                    .sender(lawyer)
                    .recipient(client)
                    .title("Provide list of communications with Meridian Holdings")
                    .body("We need all emails, letters, or texts you exchanged with Meridian Holdings between Jan 2023 - Dec 2023. Please upload as separate documents, categorised as CORRESPONDENCE.")
                    .dueAt(Instant.now().plus(3, ChronoUnit.DAYS))
                    .priority("HIGH")
                    .read(false)
                    .build());
            reminderRepository.save(Reminder.builder()
                    .legalCase(case1)
                    .sender(lawyer)
                    .recipient(client)
                    .title("Hearing reminder - Discovery Conference in 7 days")
                    .body("Your presence is requested (optional) at the Discovery Conference on " +
                            Instant.now().plus(7, ChronoUnit.DAYS).toString().substring(0, 10) +
                            ". This will be conducted via Zoom. I will send the link 24 hours before.")
                    .dueAt(Instant.now().plus(7, ChronoUnit.DAYS))
                    .priority("NORMAL")
                    .read(false)
                    .build());
        }

        if (countByCase("reminders", case2.getId()) == 0) {
            reminderRepository.save(Reminder.builder()
                    .legalCase(case2)
                    .sender(admin)
                    .recipient(client2)
                    .title("Sign estate declaration form")
                    .body("The probate court requires a signed declaration from all beneficiaries. Please review and sign the form I have uploaded to your Document Vault, then re-upload the signed version.")
                    .dueAt(Instant.now().plus(10, ChronoUnit.DAYS))
                    .priority("HIGH")
                    .read(false)
                    .build());
        }
    }

    private void seedCaseEventsIfAbsent(Case case1, Case case2, Case case3, User lawyer, User admin) {
        if (countByCase("case_events", case1.getId()) == 0) {
            saveCaseEvent(case1, "CASE_OPENED", "Case Opened", "Commercial lease dispute registered in PangoChain ledger.", lawyer);
            saveCaseEvent(case1, "DOCUMENT_UPLOADED", "Lease Agreement Uploaded", "Original lease agreement (2021) encrypted and anchored to Fabric.", lawyer);
            saveCaseEvent(case1, "HEARING_SCHEDULED", "Discovery Conference Scheduled", "Remote conference scheduled via Superior Court e-filing system.", lawyer);
            saveCaseEvent(case1, "HEARING_SCHEDULED", "Preliminary Injunction Hearing Scheduled", "In-person injunction hearing before Hon. R. Martinez.", lawyer);
            saveCaseEvent(case1, "ACCESS_GRANTED", "Paralegal Priya Nair granted document access", "Read access granted to lease agreement for discovery preparation.", lawyer);
            saveCaseEvent(case1, "HEARING_COMPLETED", "Case Management Conference Completed", "Scheduling order issued. Trial date provisionally set for Q3 2026.", lawyer);
        }

        if (countByCase("case_events", case2.getId()) == 0) {
            saveCaseEvent(case2, "CASE_OPENED", "Probate Case Opened", "Estate administration proceedings initiated following death of Roberto Delgado.", admin);
            saveCaseEvent(case2, "DOCUMENT_UPLOADED", "Death Certificate Uploaded", "Certified copy of death certificate encrypted and registered on blockchain.", admin);
            saveCaseEvent(case2, "HEARING_SCHEDULED", "Estate Valuation Hearing Scheduled", "Expert valuator appointed by Probate Court.", admin);
        }

        if (countByCase("case_events", case3.getId()) == 0) {
            saveCaseEvent(case3, "CASE_OPENED", "Class Action Defence Opened", "Pinnacle Corp class action defence registered. Data breach incident: Oct 2024.", admin);
            saveCaseEvent(case3, "DOCUMENT_UPLOADED", "Incident Report Uploaded", "Internal security incident report (CONFIDENTIAL) anchored to Fabric ledger.", admin);
            saveCaseEvent(case3, "HEARING_SCHEDULED", "Class Certification Hearing Scheduled", "Federal court hearing date set. Technical expert retained.", lawyer);
        }
    }

    private void seedDocumentsIfAbsent(Case case1, Case case2, Case case3,
                                       User lawyer, User admin, User paralegal,
                                       User client, User client2) {
        UUID leasePdf = insertDemoDocument(case1, lawyer,
                "Chen-Meridian Master Lease Agreement 2021.pdf", "CONTRACT", true);
        UUID leaseTxt = insertDemoDocument(case1, lawyer,
                "Chen-Meridian Master Lease Agreement 2021.txt", "CONTRACT", true);
        UUID noticePdf = insertDemoDocument(case1, lawyer,
                "Meridian Notice of Default 2024-01-18.pdf", "NOTICE", true);
        UUID noticeTxt = insertDemoDocument(case1, lawyer,
                "Meridian Notice of Default 2024-01-18.txt", "NOTICE", true);
        UUID motionPdf = insertDemoDocument(case1, lawyer,
                "Draft Preliminary Injunction Motion.pdf", "PLEADING", true);
        UUID motionTxt = insertDemoDocument(case1, lawyer,
                "Draft Preliminary Injunction Motion.txt", "PLEADING", true);
        UUID ledger = insertDemoDocument(case1, client,
                "Chen Payment Ledger Jan-Dec 2023.xlsx", "FINANCIAL", true);
        UUID emails = insertDemoDocument(case1, paralegal,
                "Email Thread - Renewal and Repairs.pdf", "CORRESPONDENCE", false);

        for (UUID docId : java.util.List.of(leasePdf, leaseTxt, noticePdf, noticeTxt, motionPdf, motionTxt)) {
            grantDocumentAccess(docId, lawyer, "owner", lawyer);
            grantDocumentAccess(docId, paralegal, "read", lawyer);
            grantDocumentAccess(docId, client, "read", lawyer);
        }
        grantDocumentAccess(ledger, client, "owner", client);
        grantDocumentAccess(ledger, lawyer, "read", client);
        grantDocumentAccess(ledger, paralegal, "read", client);
        grantDocumentAccess(emails, paralegal, "owner", paralegal);
        grantDocumentAccess(emails, lawyer, "read", paralegal);
        grantDocumentAccess(emails, client, "read", paralegal);
        saveCaseEventIfAbsent(case1, "DOCUMENT_UPLOADED", "AI Test Document Set Added",
                "Lease, notice, ledger, correspondence, and injunction draft seeded for assistant testing.", lawyer);

        UUID willPdf = insertDemoDocument(case2, admin,
                "Roberto Delgado Last Will and Testament.pdf", "ESTATE", true);
        UUID willTxt = insertDemoDocument(case2, admin,
                "Roberto Delgado Last Will and Testament.txt", "ESTATE", true);
        UUID assetsPdf = insertDemoDocument(case2, admin,
                "Estate Asset Schedule Initial Inventory.pdf", "FINANCIAL", true);
        UUID assetsTxt = insertDemoDocument(case2, admin,
                "Estate Asset Schedule Initial Inventory.txt", "FINANCIAL", true);
        UUID letters = insertDemoDocument(case2, client2,
                "Beneficiary Correspondence Packet.pdf", "CORRESPONDENCE", false);

        for (UUID docId : java.util.List.of(willPdf, willTxt, assetsPdf, assetsTxt)) {
            grantDocumentAccess(docId, admin, "owner", admin);
            grantDocumentAccess(docId, client2, "read", admin);
        }
        grantDocumentAccess(letters, client2, "owner", client2);
        grantDocumentAccess(letters, admin, "read", client2);
        saveCaseEventIfAbsent(case2, "DOCUMENT_UPLOADED", "Probate Document Set Added",
                "Will, asset inventory, and beneficiary correspondence seeded for assistant testing.", admin);

        UUID reportPdf = insertDemoDocument(case3, admin,
                "Pinnacle Security Incident Report Oct 2024.pdf", "INCIDENT_REPORT", true);
        UUID reportTxt = insertDemoDocument(case3, admin,
                "Pinnacle Security Incident Report Oct 2024.txt", "INCIDENT_REPORT", true);
        UUID plan = insertDemoDocument(case3, lawyer,
                "Breach Notification Plan and Regulator Matrix.docx", "COMPLIANCE", true);
        UUID memo = insertDemoDocument(case3, admin,
                "Expert Memo - Data Retention and Encryption Controls.pdf", "EXPERT", true);

        for (UUID docId : java.util.List.of(reportPdf, reportTxt, memo)) {
            grantDocumentAccess(docId, admin, "owner", admin);
            grantDocumentAccess(docId, lawyer, "read", admin);
        }
        grantDocumentAccess(plan, lawyer, "owner", lawyer);
        grantDocumentAccess(plan, admin, "read", lawyer);
        saveCaseEventIfAbsent(case3, "DOCUMENT_UPLOADED", "Data Breach Document Set Added",
                "Incident report, notification plan, and expert memo seeded for assistant testing.", admin);
    }

    private UUID insertDemoDocument(Case legalCase, User owner, String fileName,
                                    String category, boolean confidential) {
        java.util.List<?> existing = em.createNativeQuery("""
                SELECT id FROM documents
                WHERE case_id = :caseId AND file_name = :fileName AND status = CAST('ACTIVE' AS doc_status)
                ORDER BY created_at, id
                """)
                .setParameter("caseId", legalCase.getId())
                .setParameter("fileName", fileName)
                .getResultList();
        if (!existing.isEmpty()) {
            Object id = existing.get(0);
            return id instanceof UUID u ? u : UUID.fromString(id.toString());
        }

        String hash = sha256Hex(fileName + "|" + legalCase.getId() + "|" + category);
        Object id = em.createNativeQuery("""
                INSERT INTO documents
                    (case_id, file_name, ipfs_cid, document_hash_sha256, fabric_tx_id,
                     owner_id, version, status, category, confidential, created_at)
                VALUES
                    (:caseId, :fileName, :cid, :hash, :txId,
                     :ownerId, 1, CAST('ACTIVE' AS doc_status), :category, :confidential, now())
                RETURNING id
                """)
                .setParameter("caseId", legalCase.getId())
                .setParameter("fileName", fileName)
                .setParameter("cid", "bafy-demo-" + hash.substring(0, 44))
                .setParameter("hash", hash)
                .setParameter("txId", "seed-tx-" + hash.substring(0, 24))
                .setParameter("ownerId", owner.getId())
                .setParameter("category", category)
                .setParameter("confidential", confidential)
                .getSingleResult();
        return id instanceof UUID u ? u : UUID.fromString(id.toString());
    }

    private void grantDocumentAccess(UUID docId, User user, String capability, User grantedBy) {
        em.createNativeQuery("""
                INSERT INTO document_access (doc_id, user_id, capability, granted_by, wrapped_key_token)
                VALUES (:docId, :userId, CAST(:capability AS capability), :grantedBy, :token)
                ON CONFLICT DO NOTHING
                """)
                .setParameter("docId", docId)
                .setParameter("userId", user.getId())
                .setParameter("capability", capability)
                .setParameter("grantedBy", grantedBy.getId())
                .setParameter("token", "seed-wrapped-key-" + docId + "-" + user.getId())
                .executeUpdate();
    }

    private String sha256Hex(String text) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not hash seed document metadata", ex);
        }
    }

    private void saveMemberIfAbsent(java.util.UUID caseId, java.util.UUID userId, String roleInCase, java.util.UUID addedBy) {
        em.createNativeQuery(
                "INSERT INTO case_members (case_id, user_id, role_in_case, added_by, added_at) " +
                "VALUES (:c, :u, :r, :a, now()) ON CONFLICT DO NOTHING")
                .setParameter("c", caseId).setParameter("u", userId)
                .setParameter("r", roleInCase).setParameter("a", addedBy)
                .executeUpdate();
    }

    private void saveMember(java.util.UUID caseId, java.util.UUID userId, String roleInCase, java.util.UUID addedBy) {
        CaseMember cm = CaseMember.builder()
                .caseId(caseId)
                .userId(userId)
                .roleInCase(roleInCase)
                .addedBy(addedBy)
                .build();
        em.persist(cm);
    }

    private void saveClientCase(java.util.UUID caseId, java.util.UUID clientId, java.util.UUID addedBy) {
        em.createNativeQuery(
                "INSERT INTO case_clients (case_id, client_id, added_by) VALUES (:c, :u, :a) ON CONFLICT DO NOTHING"
        ).setParameter("c", caseId).setParameter("u", clientId).setParameter("a", addedBy).executeUpdate();
    }

    private void saveCaseEvent(Case legalCase, String eventType, String title, String description, User actor) {
        CaseEvent ev = CaseEvent.builder()
                .legalCase(legalCase)
                .eventType(eventType)
                .title(title)
                .description(description)
                .actor(actor)
                .build();
        caseEventRepository.save(ev);
    }

    // ── Sprint 1–3 feature demo data (idempotent) ────────────────────────────────
    private void saveCaseEventIfAbsent(Case legalCase, String eventType, String title, String description, User actor) {
        Object n = em.createNativeQuery("SELECT count(*) FROM case_events WHERE case_id = :caseId AND title = :title")
                .setParameter("caseId", legalCase.getId())
                .setParameter("title", title)
                .getSingleResult();
        if (((Number) n).longValue() == 0) {
            saveCaseEvent(legalCase, eventType, title, description, actor);
        }
    }

    private void seedFeatureDemoData() {
        User lawyer = findUserByEmailNative("lawyer@pangolawfirm.com");
        User client = findUserByEmailNative("client@demo.com");
        if (lawyer == null || client == null) return;
        Case case1 = caseRepository.findAll().stream()
                .filter(x -> x.getTitle() != null && x.getTitle().startsWith("Chen v. Meridian"))
                .findFirst().orElse(null);
        if (case1 == null) return;
        UUID caseId = case1.getId();
        UUID lawyerId = lawyer.getId();
        UUID clientId = client.getId();

        // Settlement offers — client can compare and accept/reject these live.
        if (count("settlement_offers", "case_id", caseId) == 0) {
            insertSettlement(caseId, lawyerId, "Opening offer — lump sum", 18_000_000L,
                    "Confidentiality; no admission of liability.",
                    "Low relative to the $485k claim. Recommend rejecting as an anchor.");
            insertSettlement(caseId, lawyerId, "Revised offer — structured", 32_000_000L,
                    "Payment over 12 months; mutual NDA; neutral reference.",
                    "Closer to fair value. Worth a counter around $400k.");
            insertSettlement(caseId, lawyerId, "Best-and-final", 41_000_000L,
                    "Single payment within 30 days; full mutual release.",
                    "Strong given litigation risk and cost. Recommend accepting.");
        }

        // Billing — time entries + one issued invoice (lawyer billing + client expense portal).
        if (count("time_entries", "case_id", caseId) == 0) {
            insertTimeEntry(caseId, lawyerId, "Drafted preliminary injunction motion", 180, 45_000, true, 3);
            insertTimeEntry(caseId, lawyerId, "Reviewed lease agreement and exhibits", 120, 45_000, true, 2);
            insertTimeEntry(caseId, lawyerId, "Client conference — settlement strategy", 60, 45_000, false, 1);
            insertTimeEntry(caseId, lawyerId, "Prepared discovery document list", 90, 35_000, false, 0);
            em.createNativeQuery("INSERT INTO invoices (case_id, invoice_number, status, amount_cents, minutes_total, created_by, issued_at) " +
                    "VALUES (:c, 'INV-CHEN-001', 'SENT', 225000, 300, :by, now() - interval '1 day')")
                    .setParameter("c", caseId).setParameter("by", lawyerId).executeUpdate();
        }

        // Case progress milestones (client-visible timeline).
        if (count("case_milestones", "case_id", caseId) == 0) {
            insertMilestone(caseId, lawyerId, "Intake & Engagement", "Retainer signed; conflict check cleared.", "COMPLETED", 0, "now() - interval '60 days'", "now() - interval '58 days'");
            insertMilestone(caseId, lawyerId, "Investigation & Evidence", "Lease, correspondence and exhibits collected and anchored.", "COMPLETED", 1, "now() - interval '30 days'", "now() - interval '28 days'");
            insertMilestone(caseId, lawyerId, "Discovery", "Document exchange with opposing counsel in progress.", "IN_PROGRESS", 2, "now() + interval '20 days'", null);
            insertMilestone(caseId, lawyerId, "Pre-Trial Motions", "Injunction and summary-judgment motions.", "PENDING", 3, "now() + interval '40 days'", null);
            insertMilestone(caseId, lawyerId, "Hearing / Trial", "Preliminary injunction hearing then trial.", "PENDING", 4, "now() + interval '60 days'", null);
            insertMilestone(caseId, lawyerId, "Resolution", "Settlement or judgment and case closure.", "PENDING", 5, "now() + interval '90 days'", null);
        }

        // Deadlines & statute-of-limitations tracker (colour-coded urgency).
        if (count("case_deadlines", "case_id", caseId) == 0) {
            insertDeadline(caseId, lawyerId, "Statute of Limitations — Breach of Contract", "4-year SoL from date of breach.", "STATUTE", "now() + interval '400 days'");
            insertDeadline(caseId, lawyerId, "Discovery cutoff", "All written discovery to be completed.", "DISCOVERY", "now() + interval '25 days'");
            insertDeadline(caseId, lawyerId, "Expert witness disclosure", "Disclose data-security expert and report.", "FILING", "now() + interval '5 days'");
        }

        // Client satisfaction feedback (Managing Partner sees aggregates).
        if (count("feedback_responses", "case_id", caseId) == 0) {
            insertFeedback(clientId, caseId, 5, "James kept me informed throughout — excellent communication.", "HEARING");
            insertFeedback(clientId, caseId, 4, "Smooth process. Would have liked slightly faster document turnaround.", "GENERAL");
        }

        log.info("✅ Feature demo data seeded on Chen v. Meridian (settlement, billing, milestones, deadlines, feedback).");
    }

    private long count(String table, String column, UUID value) {
        Object n = em.createNativeQuery("SELECT count(*) FROM " + table + " WHERE " + column + " = :v")
                .setParameter("v", value).getSingleResult();
        return ((Number) n).longValue();
    }

    private void insertSettlement(UUID caseId, UUID by, String title, long valueCents, String terms, String analysis) {
        em.createNativeQuery("INSERT INTO settlement_offers (case_id, title, monetary_value_cents, currency, non_monetary_terms, analysis, status, created_by, created_at) " +
                "VALUES (:c, :t, :v, 'USD', :terms, :a, 'PROPOSED', :by, now())")
                .setParameter("c", caseId).setParameter("t", title).setParameter("v", valueCents)
                .setParameter("terms", terms).setParameter("a", analysis).setParameter("by", by)
                .executeUpdate();
    }

    private void insertTimeEntry(UUID caseId, UUID userId, String desc, int minutes, int rateCents, boolean invoiced, int daysAgo) {
        em.createNativeQuery("INSERT INTO time_entries (case_id, user_id, description, minutes, rate_cents, entry_date, invoiced, created_at) " +
                "VALUES (:c, :u, :d, :m, :r, now() - make_interval(days => :days), :inv, now())")
                .setParameter("c", caseId).setParameter("u", userId).setParameter("d", desc)
                .setParameter("m", minutes).setParameter("r", rateCents).setParameter("days", daysAgo)
                .setParameter("inv", invoiced).executeUpdate();
    }

    private void insertMilestone(UUID caseId, UUID by, String title, String desc, String status, int sort, String targetExpr, String completedExpr) {
        em.createNativeQuery("INSERT INTO case_milestones (case_id, title, description, status, target_date, completed_at, sort_order, created_by, created_at) " +
                "VALUES (:c, :t, :d, :s, " + targetExpr + ", " + (completedExpr != null ? completedExpr : "NULL") + ", :sort, :by, now())")
                .setParameter("c", caseId).setParameter("t", title).setParameter("d", desc)
                .setParameter("s", status).setParameter("sort", sort).setParameter("by", by)
                .executeUpdate();
    }

    private void insertDeadline(UUID caseId, UUID by, String title, String desc, String type, String dateExpr) {
        em.createNativeQuery("INSERT INTO case_deadlines (case_id, title, description, deadline_type, deadline_date, completed, created_by, created_at) " +
                "VALUES (:c, :t, :d, :type, " + dateExpr + ", false, :by, now())")
                .setParameter("c", caseId).setParameter("t", title).setParameter("d", desc)
                .setParameter("type", type).setParameter("by", by).executeUpdate();
    }

    private void insertFeedback(UUID clientId, UUID caseId, int rating, String comment, String context) {
        em.createNativeQuery("INSERT INTO feedback_responses (client_id, case_id, rating, comment, context, created_at) " +
                "VALUES (:cl, :c, :r, :cm, :ctx, now())")
                .setParameter("cl", clientId).setParameter("c", caseId).setParameter("r", rating)
                .setParameter("cm", comment).setParameter("ctx", context).executeUpdate();
    }
}
