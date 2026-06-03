package com.pangochain.backend.config;

import com.pangochain.backend.cases.Case;
import com.pangochain.backend.cases.CaseMember;
import com.pangochain.backend.cases.CaseRepository;
import com.pangochain.backend.caseevent.CaseEvent;
import com.pangochain.backend.caseevent.CaseEventRepository;
import com.pangochain.backend.chat.ChatService;
import com.pangochain.backend.crypto.Pbkdf2Service;
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
    private final Pbkdf2Service pbkdf2Service;
    private final ChatService chatService;

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        boolean baseAlreadySeeded = userRepository.existsByEmail("admin@pangolawfirm.com");
        if (!baseAlreadySeeded) {
            seedBaseData();
        } else {
            log.info("Base seed already present — running additive team/chat seed only");
        }
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
        Case case1 = Case.builder()
                .title("Chen v. Meridian Holdings — Contract Dispute")
                .description("Client Marcus Chen disputes breach of commercial lease agreement by Meridian Holdings Ltd. Damages sought: $485,000.")
                .caseType("Commercial Litigation")
                .firm(firmA)
                .createdBy(lawyer)
                .build();
        caseRepository.save(case1);

        Case case2 = Case.builder()
                .title("Delgado Estate — Probate Proceedings")
                .description("Probate and estate administration for the Delgado family following the passing of Roberto Delgado. Multiple assets under review.")
                .caseType("Probate & Estate")
                .firm(firmA)
                .createdBy(admin)
                .build();
        caseRepository.save(case2);

        Case case3 = Case.builder()
                .title("In Re: Pinnacle Corp Data Breach")
                .description("Class action defence representing Pinnacle Corp against claims of negligent data handling affecting 12,000 customers.")
                .caseType("Data Privacy / Class Action")
                .firm(firmA)
                .createdBy(admin)
                .build();
        caseRepository.save(case3);

        // ── Case Members ───────────────────────────────────────────────────────
        saveMember(case1.getId(), lawyer.getId(), "Lead Counsel", lawyer.getId());
        saveMember(case1.getId(), paralegal.getId(), "Paralegal", lawyer.getId());
        saveMember(case1.getId(), client.getId(), "Primary Client", lawyer.getId());

        saveMember(case2.getId(), admin.getId(), "Lead Partner", admin.getId());
        saveMember(case2.getId(), client2.getId(), "Primary Client", admin.getId());

        saveMember(case3.getId(), admin.getId(), "Lead Partner", admin.getId());
        saveMember(case3.getId(), lawyer.getId(), "Senior Associate", admin.getId());

        // ── Case Clients (client portal association) ───────────────────────────
        saveClientCase(case1.getId(), client.getId(), lawyer.getId());
        saveClientCase(case2.getId(), client2.getId(), admin.getId());

        // ── Hearings ───────────────────────────────────────────────────────────
        Hearing h1 = Hearing.builder()
                .legalCase(case1)
                .title("Preliminary Injunction Hearing")
                .hearingDate(Instant.now().plus(14, ChronoUnit.DAYS))
                .location("Courtroom 4B, Superior Court")
                .courtName("Los Angeles Superior Court")
                .hearingType("INJUNCTION_HEARING")
                .notes("Prepare lease termination exhibits. Opposing counsel may seek continuance.")
                .createdBy(lawyer)
                .build();
        hearingRepository.save(h1);

        Hearing h2 = Hearing.builder()
                .legalCase(case1)
                .title("Discovery Conference")
                .hearingDate(Instant.now().plus(7, ChronoUnit.DAYS))
                .location("Zoom — Remote Hearing")
                .courtName("Los Angeles Superior Court")
                .hearingType("CONFERENCE")
                .notes("Exchange of document lists. Ensure all Fabric-anchored docs are listed.")
                .createdBy(lawyer)
                .build();
        hearingRepository.save(h2);

        Hearing h3 = Hearing.builder()
                .legalCase(case2)
                .title("Estate Valuation Hearing")
                .hearingDate(Instant.now().plus(21, ChronoUnit.DAYS))
                .location("Probate Court, Room 12")
                .courtName("County Probate Court")
                .hearingType("PROBATE_HEARING")
                .notes("Expert valuator to present asset assessment report.")
                .createdBy(admin)
                .build();
        hearingRepository.save(h3);

        Hearing h4 = Hearing.builder()
                .legalCase(case3)
                .title("Class Certification Hearing")
                .hearingDate(Instant.now().plus(45, ChronoUnit.DAYS))
                .location("Federal Court, Courtroom 22A")
                .courtName("US District Court, Central District CA")
                .hearingType("COURT_HEARING")
                .notes("Opposition brief due 7 days prior. Technical expert on data security required.")
                .createdBy(admin)
                .build();
        hearingRepository.save(h4);

        // Past hearing for realism
        Hearing h5 = Hearing.builder()
                .legalCase(case1)
                .title("Case Management Conference")
                .hearingDate(Instant.now().minus(10, ChronoUnit.DAYS))
                .location("Courtroom 4B, Superior Court")
                .courtName("Los Angeles Superior Court")
                .hearingType("CONFERENCE")
                .notes("Initial scheduling order issued. Trial date set for Q3.")
                .createdBy(lawyer)
                .build();
        hearingRepository.save(h5);

        // ── Reminders from lawyer to client ────────────────────────────────────
        Reminder r1 = Reminder.builder()
                .legalCase(case1)
                .sender(lawyer)
                .recipient(client)
                .title("Upload signed retainer agreement")
                .body("Please upload the signed retainer agreement to your Document Vault as soon as possible. We need it before the Discovery Conference next week. Use the CONFIDENTIAL flag when uploading.")
                .dueAt(Instant.now().plus(5, ChronoUnit.DAYS))
                .priority("HIGH")
                .read(false)
                .build();
        reminderRepository.save(r1);

        Reminder r2 = Reminder.builder()
                .legalCase(case1)
                .sender(lawyer)
                .recipient(client)
                .title("Provide list of communications with Meridian Holdings")
                .body("We need all emails, letters, or texts you exchanged with Meridian Holdings between Jan 2023 – Dec 2023. Please upload as separate documents, categorised as CORRESPONDENCE.")
                .dueAt(Instant.now().plus(3, ChronoUnit.DAYS))
                .priority("HIGH")
                .read(false)
                .build();
        reminderRepository.save(r2);

        Reminder r3 = Reminder.builder()
                .legalCase(case1)
                .sender(lawyer)
                .recipient(client)
                .title("Hearing reminder — Discovery Conference in 7 days")
                .body("Your presence is requested (optional) at the Discovery Conference on " +
                        Instant.now().plus(7, ChronoUnit.DAYS).toString().substring(0, 10) +
                        ". This will be conducted via Zoom. I will send the link 24 hours before.")
                .dueAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .priority("NORMAL")
                .read(false)
                .build();
        reminderRepository.save(r3);

        Reminder r4 = Reminder.builder()
                .legalCase(case2)
                .sender(admin)
                .recipient(client2)
                .title("Sign estate declaration form")
                .body("The probate court requires a signed declaration from all beneficiaries. Please review and sign the form I have uploaded to your Document Vault, then re-upload the signed version.")
                .dueAt(Instant.now().plus(10, ChronoUnit.DAYS))
                .priority("HIGH")
                .read(false)
                .build();
        reminderRepository.save(r4);

        // ── Case Events (timeline) ─────────────────────────────────────────────
        saveCaseEvent(case1, "CASE_OPENED", "Case Opened", "Commercial lease dispute registered in PangoChain ledger.", lawyer);
        saveCaseEvent(case1, "DOCUMENT_UPLOADED", "Lease Agreement Uploaded", "Original lease agreement (2021) encrypted and anchored to Fabric.", lawyer);
        saveCaseEvent(case1, "HEARING_SCHEDULED", "Discovery Conference Scheduled", "Remote conference scheduled via Superior Court e-filing system.", lawyer);
        saveCaseEvent(case1, "HEARING_SCHEDULED", "Preliminary Injunction Hearing Scheduled", "In-person injunction hearing before Hon. R. Martinez.", lawyer);
        saveCaseEvent(case1, "ACCESS_GRANTED", "Paralegal Priya Nair granted document access", "Read access granted to lease agreement for discovery preparation.", lawyer);
        saveCaseEvent(case1, "HEARING_COMPLETED", "Case Management Conference Completed", "Scheduling order issued. Trial date provisionally set for Q3 2026.", lawyer);

        saveCaseEvent(case2, "CASE_OPENED", "Probate Case Opened", "Estate administration proceedings initiated following death of Roberto Delgado.", admin);
        saveCaseEvent(case2, "DOCUMENT_UPLOADED", "Death Certificate Uploaded", "Certified copy of death certificate encrypted and registered on blockchain.", admin);
        saveCaseEvent(case2, "HEARING_SCHEDULED", "Estate Valuation Hearing Scheduled", "Expert valuator appointed by Probate Court.", admin);

        saveCaseEvent(case3, "CASE_OPENED", "Class Action Defence Opened", "Pinnacle Corp class action defence registered. Data breach incident: Oct 2024.", admin);
        saveCaseEvent(case3, "DOCUMENT_UPLOADED", "Incident Report Uploaded", "Internal security incident report (CONFIDENTIAL) anchored to Fabric ledger.", admin);
        saveCaseEvent(case3, "HEARING_SCHEDULED", "Class Certification Hearing Scheduled", "Federal court hearing date set. Technical expert retained.", lawyer);

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
        String salt = pbkdf2Service.generateSalt();
        String hash = pbkdf2Service.hash(password, salt);
        User u = User.builder()
                .email(email)
                .passwordHash(hash)
                .salt(salt)
                .fullName(fullName)
                .role(role)
                .firm(firm)
                .status(status)
                .build();
        return userRepository.save(u);
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
        User lawyer = userRepository.findByEmail("lawyer@pangolawfirm.com").orElse(null);
        if (lawyer == null) return; // base seed not present yet

        User a = ensureUser("a@pangolawfirm.com", "Assoc123!", "Aaron Avers (Associate A)", UserRole.ASSOCIATE_JUNIOR, firmA);
        User b = ensureUser("b@pangolawfirm.com", "Assoc123!", "Bianca Bose (Associate B)", UserRole.ASSOCIATE_JUNIOR, firmA);
        User c = ensureUser("c@pangolawfirm.com", "Assoc123!", "Carlos Cruz (Associate C)", UserRole.ASSOCIATE_JUNIOR, firmA);
        User d = ensureUser("d@pangolawfirm.com", "Assoc123!", "Dana Diaz (Associate D)", UserRole.ASSOCIATE_JUNIOR, firmA);

        Case case1 = caseRepository.findAll().stream()
                .filter(x -> x.getTitle() != null && x.getTitle().startsWith("Chen v. Meridian"))
                .findFirst().orElse(null);
        if (case1 != null) {
            for (User u : java.util.List.of(a, b, c, d)) {
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
            User admin = userRepository.findByEmail("admin@pangolawfirm.com").orElse(lawyer);
            chatService.post(firmConv, admin, "Welcome to the firm channel — use this for firm-wide coordination.");
            chatService.post(firmConv, lawyer, "Thanks. Chen v. Meridian team is staffed and moving.");
        }
        log.info("✅ Team/chat seed complete — associates a–d@pangolawfirm.com / Assoc123!");
    }

    private User ensureUser(String email, String password, String fullName, UserRole role, Firm firm) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> createUser(email, password, fullName, role, firm, AccountStatus.ACTIVE));
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
    private void seedFeatureDemoData() {
        User lawyer = userRepository.findByEmail("lawyer@pangolawfirm.com").orElse(null);
        User client = userRepository.findByEmail("client@demo.com").orElse(null);
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
